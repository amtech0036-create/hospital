const PRICING_METHODS = {
  PERCENTAGE_MARKUP: 'Percentage Markup',
  FIXED_SELLING_PRICE: 'Fixed Selling Price'
};

/**
 * Selling Price = Purchase Price + (Purchase Price × Markup% / 100)
 * Matches the master spec's example exactly:
 *   Purchase = 1000, Markup = 20% -> Selling = 1200
 */
function calculateSellingPrice({ purchasePrice, pricingMethod, markupPercentage, manualSellingPrice }) {
  const cost = parseFloat(purchasePrice) || 0;

  if (pricingMethod === PRICING_METHODS.FIXED_SELLING_PRICE) {
    // Never auto-overwrite a manually entered fixed price.
    return parseFloat(manualSellingPrice) || 0;
  }

  const markup = parseFloat(markupPercentage) || 0;
  const selling = cost + (cost * markup) / 100;
  return Math.round(selling * 100) / 100;
}

function validatePricingInput({ pricingMethod, markupPercentage, manualSellingPrice }) {
  if (!Object.values(PRICING_METHODS).includes(pricingMethod)) {
    return `pricingMethod must be one of: ${Object.values(PRICING_METHODS).join(', ')}`;
  }
  if (pricingMethod === PRICING_METHODS.PERCENTAGE_MARKUP) {
    if (markupPercentage === undefined || markupPercentage === null || isNaN(parseFloat(markupPercentage))) {
      return 'markupPercentage is required for Percentage Markup pricing.';
    }
  }
  if (pricingMethod === PRICING_METHODS.FIXED_SELLING_PRICE) {
    if (manualSellingPrice === undefined || manualSellingPrice === null || isNaN(parseFloat(manualSellingPrice))) {
      return 'sellingPrice is required for Fixed Selling Price pricing.';
    }
  }
  return null;
}

module.exports = { PRICING_METHODS, calculateSellingPrice, validatePricingInput };
