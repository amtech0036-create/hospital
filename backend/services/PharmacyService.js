const {
  productRepository,
  prescriptionRepository,
  patientRepository,
  saleRepository,
  paymentRepository
} = require('../repositories');
const logger = require('../utils/logger');

class PharmacyService {
  /**
   * GET /api/pharmacy/prescriptions/:prescriptionNumber
   * Auto-load doctor-prescribed medicines directly into pharmacy billing cart.
   */
  async getPrescriptionCart(prescriptionNumber) {
    const rx = await prescriptionRepository.findOne({ prescriptionNumber }) || await prescriptionRepository.findById(prescriptionNumber);
    if (!rx) {
      const err = new Error(`Prescription not found with identifier: ${prescriptionNumber}`);
      err.status = 404;
      throw err;
    }

    const allProducts = await productRepository.findAll({ status: 'Active' });

    const cartItems = rx.medicines.map((med) => {
      // Match by genericName or brandName
      const match = allProducts.find((p) =>
        (p.genericName && p.genericName.toLowerCase() === (med.genericName || '').toLowerCase()) ||
        (p.name && p.name.toLowerCase().includes((med.brandName || med.genericName || '').toLowerCase()))
      );

      return {
        prescribedMedicine: med,
        matchedProductId: match ? match.id : null,
        productName: match ? match.name : med.brandName || med.genericName,
        genericName: med.genericName,
        dosage: med.dosage,
        frequency: med.frequency,
        duration: med.duration,
        unitPrice: match ? (match.sellingPrice || 10) : 10,
        availableStock: match ? (match.openingStock || 0) : 0,
        batches: match && Array.isArray(match.batches) ? match.batches : []
      };
    });

    return {
      prescriptionNumber: rx.prescriptionNumber,
      patientId: rx.patientId,
      uhid: rx.uhid,
      patientName: rx.patientName,
      doctorId: rx.doctorId,
      doctorName: rx.doctorName,
      diagnosis: rx.diagnosis,
      cartItems
    };
  }

  /**
   * POST /api/pharmacy/sales
   * Deduct items based on FEFO (First-Expired, First-Out) batch logic and register revenue in Accounts.
   */
  async processPharmacySale({ patientId, prescriptionId, items = [], paymentMethod = 'Cash', discountAmount = 0, paidAmount = 0 }) {
    if (!items || items.length === 0) {
      const err = new Error('Pharmacy sale cart must contain at least one item.');
      err.status = 400;
      throw err;
    }

    let subTotal = 0;
    const fulfilledItems = [];

    for (const item of items) {
      const product = await productRepository.findById(item.productId);
      if (!product) {
        const err = new Error(`Product not found with ID ${item.productId}`);
        err.status = 404;
        throw err;
      }

      let reqQty = Number(item.quantity) || 1;
      const unitPrice = Number(item.unitPrice || product.sellingPrice || 0);
      const itemSubtotal = reqQty * unitPrice;
      subTotal += itemSubtotal;

      // FEFO (First-Expired, First-Out) Batch Allocation
      let batches = Array.isArray(product.batches) ? [...product.batches] : [];
      if (batches.length === 0 && product.batchNumber) {
        batches = [{
          batchNumber: product.batchNumber,
          expiryDate: product.expiryDate || '2028-12-31',
          currentStock: product.openingStock || 100,
          sellingPrice: product.sellingPrice || unitPrice
        }];
      }

      // Sort FEFO: earliest expiry first
      batches.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

      let allocatedQty = 0;
      const batchDeductions = [];

      for (const batch of batches) {
        if (reqQty <= 0) break;
        const availableInBatch = Number(batch.currentStock) || 0;
        if (availableInBatch <= 0) continue;

        const deduct = Math.min(reqQty, availableInBatch);
        batch.currentStock = availableInBatch - deduct;
        reqQty -= deduct;
        allocatedQty += deduct;

        batchDeductions.push({
          batchNumber: batch.batchNumber,
          expiryDate: batch.expiryDate,
          quantityDeducted: deduct
        });
      }

      // Update total product stock
      const updatedTotalStock = Math.max(0, (product.openingStock || 0) - allocatedQty);
      await productRepository.update(product.id, {
        openingStock: updatedTotalStock,
        batches
      });

      fulfilledItems.push({
        productId: product.id,
        productName: product.name,
        genericName: product.genericName || '',
        quantity: allocatedQty,
        unitPrice,
        totalPrice: allocatedQty * unitPrice,
        batchAllocations: batchDeductions
      });
    }

    const netAmount = Math.max(0, subTotal - Number(discountAmount));
    const paid = Number(paidAmount) || netAmount;
    const due = Math.max(0, netAmount - paid);

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const saleCount = await saleRepository.count({});
    const invoiceNumber = `RXSALE-${todayStr}-${String(saleCount + 1).padStart(4, '0')}`;

    // Register Sale Record
    const saleRecord = await saleRepository.create({
      invoiceNumber,
      patientId: patientId || 'WALK-IN',
      prescriptionId: prescriptionId || null,
      subTotal,
      discountAmount,
      netAmount,
      paidAmount: paid,
      dueAmount: due,
      paymentMethod,
      items: fulfilledItems,
      type: 'PHARMACY_SALE'
    });

    const actualInvoice = saleRecord.invoiceNumber || invoiceNumber;

    // Register Revenue Payment in Accounts module
    if (paid > 0) {
      await paymentRepository.create({
        partyType: 'CUSTOMER',
        partyId: patientId || 'WALK-IN',
        direction: 'INBOUND',
        amount: paid,
        paymentMethod,
        referenceType: 'PHARMACY_SALE',
        referenceId: saleRecord.id,
        note: `Pharmacy Sale Invoice #${actualInvoice}`
      });
    }

    logger.info(`Pharmacy FEFO Sale completed: Invoice #${actualInvoice} for Net ${netAmount} BDT`);

    return {
      id: saleRecord.id,
      invoiceNumber: actualInvoice,
      subTotal,
      discountAmount,
      netAmount,
      paidAmount: paid,
      dueAmount: due,
      paymentMethod,
      items: fulfilledItems
    };
  }
}

module.exports = new PharmacyService();
