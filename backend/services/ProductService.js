const { productRepository, productPriceHistoryRepository, stockTransactionRepository, categoryRepository } = require('../repositories');
const { calculateSellingPrice, validatePricingInput, PRICING_METHODS } = require('./pricingEngine');

const DEFAULT_MARKUP_PERCENTAGE = 20; // TODO: move to Settings sheet in a later phase.

/**
 * Builds a 3-letter prefix from a category name, e.g. "Electronics" -> "ELE".
 * Falls back to "GEN" if the name has no usable letters.
 */
function skuPrefixFromCategoryName(categoryName) {
  const letters = (categoryName || '').replace(/[^a-zA-Z]/g, '').toUpperCase();
  return letters.slice(0, 3) || 'GEN';
}

class ProductService {
  async list({ status, categoryId, brandId, search } = {}) {
    let products = await productRepository.findAll(
      status ? { status } : {}
    );

    if (categoryId) products = products.filter((p) => p.categoryId === categoryId);
    if (brandId) products = products.filter((p) => p.brandId === brandId);
    if (search) {
      const q = search.toLowerCase();
      products = products.filter(
        (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
      );
    }

    const stockByProduct = await stockTransactionRepository.computeCurrentStockForAll();

    return products.map((p) => this._withComputedStock(p, stockByProduct[p.id] || 0));
  }

  async getById(id) {
    const product = await productRepository.findById(id);
    if (!product) {
      const err = new Error('Product not found.');
      err.status = 404;
      throw err;
    }
    const currentStock = await stockTransactionRepository.computeCurrentStock(id);
    return this._withComputedStock(product, currentStock);
  }

  _withComputedStock(product, currentStock) {
    const minimumStock = parseFloat(product.minimumStock) || 0;
    return {
      ...product,
      currentStock,
      lowStock: currentStock <= minimumStock
    };
  }

  /**
   * Generates the next SKU for a category, e.g. "ELE-0001", "ELE-0002".
   * Sequence is per-category, based on how many products already carry
   * that category's prefix (not a global counter).
   */
  async _generateSkuForCategory(categoryId) {
    const category = categoryId ? await categoryRepository.findById(categoryId) : null;
    const prefix = skuPrefixFromCategoryName(category ? category.name : '');

    const allProducts = await productRepository.findAll();
    const existingCount = allProducts.filter((p) => (p.sku || '').startsWith(`${prefix}-`)).length;

    let sequence = existingCount + 1;
    let candidate = `${prefix}-${String(sequence).padStart(4, '0')}`;

    // Guard against a gap-filled duplicate (e.g. a product was deleted/renamed).
    while (allProducts.some((p) => p.sku === candidate)) {
      sequence += 1;
      candidate = `${prefix}-${String(sequence).padStart(4, '0')}`;
    }

    return candidate;
  }

  async create(input) {
    const {
      sku,
      name,
      categoryId,
      brandId,
      unitId,
      description,
      purchasePrice,
      pricingMethod,
      markupPercentage,
      sellingPrice: manualSellingPrice,
      minimumStock,
      openingStock,
      batchNumber,
      expiryDate
    } = input;

    const effectiveSku = sku && sku.trim() ? sku.trim() : await this._generateSkuForCategory(categoryId);

    const existing = await productRepository.findBySku(effectiveSku);
    if (existing) {
      const err = new Error(`A product with SKU "${effectiveSku}" already exists.`);
      err.status = 409;
      throw err;
    }

    const effectiveMethod = pricingMethod || PRICING_METHODS.PERCENTAGE_MARKUP;
    const effectiveMarkup =
      effectiveMethod === PRICING_METHODS.PERCENTAGE_MARKUP
        ? markupPercentage ?? DEFAULT_MARKUP_PERCENTAGE
        : markupPercentage;

    const validationError = validatePricingInput({
      pricingMethod: effectiveMethod,
      markupPercentage: effectiveMarkup,
      manualSellingPrice
    });
    if (validationError) {
      const err = new Error(validationError);
      err.status = 422;
      throw err;
    }

    const sellingPrice = calculateSellingPrice({
      purchasePrice,
      pricingMethod: effectiveMethod,
      markupPercentage: effectiveMarkup,
      manualSellingPrice
    });

    const now = new Date().toISOString();

    const product = await productRepository.create({
      sku: effectiveSku,
      name,
      categoryId,
      brandId,
      unitId,
      description,
      purchasePrice,
      pricingMethod: effectiveMethod,
      markupPercentage: effectiveMethod === PRICING_METHODS.PERCENTAGE_MARKUP ? effectiveMarkup : '',
      sellingPrice,
      minimumStock: minimumStock || 0,
      openingStock: openingStock || 0,
      batchNumber: batchNumber || '',
      expiryDate: expiryDate || '',
      status: 'Active',
      priceEffectiveDate: now
    });

    // Opening stock must go through the transaction ledger, never a raw field write.
    if (parseFloat(openingStock) > 0) {
      await stockTransactionRepository.create({
        productId: product.id,
        type: 'Opening Stock',
        quantity: openingStock,
        referenceType: 'Product Creation',
        referenceId: product.id,
        note: 'Opening stock recorded at product creation',
        transactionDate: now
      });
    }

    return this.getById(product.id);
  }

  async update(id, input, { changedBy, reason } = {}) {
    const existing = await productRepository.findById(id);
    if (!existing) {
      const err = new Error('Product not found.');
      err.status = 404;
      throw err;
    }

    const merged = { ...existing, ...input };

    const pricingMethod = merged.pricingMethod || PRICING_METHODS.PERCENTAGE_MARKUP;
    const markupPercentage = merged.markupPercentage;
    const manualSellingPrice = input.sellingPrice !== undefined ? input.sellingPrice : merged.sellingPrice;

    const validationError = validatePricingInput({
      pricingMethod,
      markupPercentage,
      manualSellingPrice
    });
    if (validationError) {
      const err = new Error(validationError);
      err.status = 422;
      throw err;
    }

    const newSellingPrice = calculateSellingPrice({
      purchasePrice: merged.purchasePrice,
      pricingMethod,
      markupPercentage,
      manualSellingPrice
    });

    const priceChanged =
      String(existing.purchasePrice) !== String(merged.purchasePrice) ||
      String(existing.markupPercentage) !== String(markupPercentage) ||
      String(existing.sellingPrice) !== String(newSellingPrice) ||
      existing.pricingMethod !== pricingMethod;

    const now = new Date().toISOString();

    if (priceChanged) {
      // Audit trail — required by spec section 47. Past invoices are
      // untouched; they already stored their own price snapshot at sale time.
      await productPriceHistoryRepository.create({
        productId: id,
        previousPurchasePrice: existing.purchasePrice,
        newPurchasePrice: merged.purchasePrice,
        previousMarkup: existing.markupPercentage,
        newMarkup: markupPercentage,
        previousSellingPrice: existing.sellingPrice,
        newSellingPrice,
        effectiveDate: now,
        changedBy: changedBy || 'unknown',
        reason: reason || ''
      });
    }

    const updated = await productRepository.update(id, {
      ...input,
      sellingPrice: newSellingPrice,
      priceEffectiveDate: priceChanged ? now : existing.priceEffectiveDate
    });

    return this.getById(updated.id);
  }

  async remove(id, { hard = false } = {}) {
    await this.getById(id); // throws 404 if missing

    if (hard) {
      const history = await stockTransactionRepository.findByProduct(id);
      if (history.length > 0) {
        const err = new Error(
          'This product has stock transaction history and cannot be permanently deleted. Deactivate it instead to keep records intact.'
        );
        err.status = 409;
        throw err;
      }
      return productRepository.delete(id, { hard: true });
    }

    return productRepository.delete(id); // soft delete -> status = Inactive
  }

  async priceHistory(productId) {
    return productPriceHistoryRepository.findByProduct(productId);
  }

  /**
   * Preview a bulk markup change without saving — spec section 47 requires
   * showing "current -> new" before the user confirms.
   */
  async previewBulkMarkup({ categoryId, brandId, productIds, newMarkupPercentage }) {
    let products = await productRepository.findAll({ status: 'Active' });
    if (categoryId) products = products.filter((p) => p.categoryId === categoryId);
    if (brandId) products = products.filter((p) => p.brandId === brandId);
    if (productIds && productIds.length) products = products.filter((p) => productIds.includes(p.id));

    return products.map((p) => ({
      id: p.id,
      name: p.name,
      currentSellingPrice: p.sellingPrice,
      newSellingPrice: calculateSellingPrice({
        purchasePrice: p.purchasePrice,
        pricingMethod: PRICING_METHODS.PERCENTAGE_MARKUP,
        markupPercentage: newMarkupPercentage
      })
    }));
  }

  async applyBulkMarkup({ categoryId, brandId, productIds, newMarkupPercentage, changedBy, reason }) {
    const preview = await this.previewBulkMarkup({ categoryId, brandId, productIds, newMarkupPercentage });
    const results = [];
    for (const item of preview) {
      const updated = await this.update(
        item.id,
        { pricingMethod: PRICING_METHODS.PERCENTAGE_MARKUP, markupPercentage: newMarkupPercentage },
        { changedBy, reason: reason || 'Bulk markup update' }
      );
      results.push(updated);
    }
    return results;
  }

  async bulkImport(items = []) {
    if (!Array.isArray(items) || items.length === 0) {
      const err = new Error('No items provided for bulk import.');
      err.status = 400;
      throw err;
    }

    const { brandRepository, unitRepository } = require('../repositories');
    const categories = await categoryRepository.findAll();
    const brands = await brandRepository.findAll();
    const units = await unitRepository.findAll();

    const categoryMap = new Map();
    categories.forEach((c) => {
      if (c.name) categoryMap.set(c.name.trim().toLowerCase(), c.id);
      if (c.id) categoryMap.set(c.id.trim().toLowerCase(), c.id);
    });

    const brandMap = new Map();
    brands.forEach((b) => {
      if (b.name) brandMap.set(b.name.trim().toLowerCase(), b.id);
      if (b.id) brandMap.set(b.id.trim().toLowerCase(), b.id);
    });

    const unitMap = new Map();
    units.forEach((u) => {
      if (u.name) unitMap.set(u.name.trim().toLowerCase(), u.id);
      if (u.id) unitMap.set(u.id.trim().toLowerCase(), u.id);
    });

    const results = {
      insertedCount: 0,
      skippedCount: 0,
      errors: []
    };

    for (let i = 0; i < items.length; i++) {
      const row = items[i];
      const name = (row.name || row.Name || '').trim();
      if (!name) {
        results.skippedCount++;
        results.errors.push({ row: i + 1, error: 'Product name is required.' });
        continue;
      }

      const purchasePrice = parseFloat(row.purchasePrice ?? row['Purchase Price']);
      if (isNaN(purchasePrice) || purchasePrice < 0) {
        results.skippedCount++;
        results.errors.push({ row: i + 1, product: name, error: 'Valid purchase price is required.' });
        continue;
      }

      const rawCategory = row.category || row.Category || '';
      let categoryId = '';
      if (rawCategory) {
        const catKey = String(rawCategory).trim().toLowerCase();
        if (categoryMap.has(catKey)) {
          categoryId = categoryMap.get(catKey);
        } else {
          try {
            const newCat = await categoryRepository.create({ name: String(rawCategory).trim() });
            categoryId = newCat.id;
            categoryMap.set(catKey, categoryId);
          } catch (e) {
            categoryId = '';
          }
        }
      }

      const rawBrand = row.brand || row.Brand || '';
      let brandId = '';
      if (rawBrand) {
        const brandKey = String(rawBrand).trim().toLowerCase();
        if (brandMap.has(brandKey)) {
          brandId = brandMap.get(brandKey);
        } else {
          try {
            const newBrand = await brandRepository.create({ name: String(rawBrand).trim() });
            brandId = newBrand.id;
            brandMap.set(brandKey, brandId);
          } catch (e) {
            brandId = '';
          }
        }
      }

      const rawUnit = row.unit || row.Unit || '';
      let unitId = '';
      if (rawUnit) {
        const unitKey = String(rawUnit).trim().toLowerCase();
        if (unitMap.has(unitKey)) {
          unitId = unitMap.get(unitKey);
        } else {
          try {
            const newUnit = await unitRepository.create({ name: String(rawUnit).trim(), code: String(rawUnit).trim().toUpperCase() });
            unitId = newUnit.id;
            unitMap.set(unitKey, unitId);
          } catch (e) {
            unitId = '';
          }
        }
      }

      const sellingPriceVal = parseFloat(row.sellingPrice ?? row['Selling Price']);
      let pricingMethod = PRICING_METHODS.PERCENTAGE_MARKUP;
      let markupPercentage = parseFloat(row.markupPercentage ?? row['Markup %']) || DEFAULT_MARKUP_PERCENTAGE;

      if (!isNaN(sellingPriceVal) && sellingPriceVal >= purchasePrice) {
        pricingMethod = PRICING_METHODS.FIXED_SELLING_PRICE;
      }

      const rawSku = row.sku || row.SKU || '';
      const rawDesc = row.description || row.Description || '';
      const rawMinStock = row.minimumStock ?? row['Minimum Stock'];
      const rawOpStock = row.openingStock ?? row['Opening Stock'];
      const rawBatch = row.batchNumber || row['Batch Number'] || '';
      const rawExpiry = row.expiryDate || row['Expiry Date'] || '';

      try {
        await this.create({
          sku: rawSku ? String(rawSku).trim() : '',
          name,
          categoryId,
          brandId,
          unitId,
          description: rawDesc,
          purchasePrice,
          pricingMethod,
          markupPercentage,
          sellingPrice: !isNaN(sellingPriceVal) ? sellingPriceVal : undefined,
          minimumStock: parseFloat(rawMinStock) || 0,
          openingStock: parseFloat(rawOpStock) || 0,
          batchNumber: rawBatch ? String(rawBatch).trim() : '',
          expiryDate: rawExpiry ? String(rawExpiry).trim() : ''
        });
        results.insertedCount++;
      } catch (err) {
        results.skippedCount++;
        results.errors.push({ row: i + 1, product: name, error: err.message });
      }
    }

    return results;
  }
}

module.exports = new ProductService();
