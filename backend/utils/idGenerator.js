/**
 * Generates stable, human-readable IDs such as PROD-000001, CUS-000001.
 *
 * These IDs are stored as a column in the database and must NEVER be
 * derived from row position or array indices. The repository layer is
 * responsible for finding the current max sequence number for a given prefix before calling this.
 */
function generateId(prefix, currentMaxSequence) {
  const next = (currentMaxSequence || 0) + 1;
  const padded = String(next).padStart(6, '0');
  return `${prefix}-${padded}`;
}

/** Formats a date as dd-mm-yy for date-based IDs (e.g. 13-08-26). */
function formatDateForId(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}-${mm}-${yy}`;
}

/** Generates date-based IDs such as INV-13-08-26-001. */
function generateDateBasedId(prefix, date, currentMaxSequence) {
  const next = (currentMaxSequence || 0) + 1;
  const padded = String(next).padStart(3, '0');
  return `${prefix}-${formatDateForId(date)}-${padded}`;
}

function extractSequence(id) {
  if (!id) return 0;
  const parts = id.split('-');
  const num = parseInt(parts[parts.length - 1], 10);
  return Number.isNaN(num) ? 0 : num;
}

const ID_PREFIXES = {
  USER: 'USR',
  PRODUCT: 'PROD',
  CATEGORY: 'CAT',
  BRAND: 'BRD',
  UNIT: 'UNT',
  CUSTOMER: 'CUS',
  SUPPLIER: 'SUP',
  INVOICE: 'INV',
  PURCHASE: 'PUR',
  CHALLAN: 'CHL',
  PAYMENT: 'PAY',
  EMPLOYEE: 'EMP',
  EXPENSE: 'EXP',
  STOCK_TXN: 'STK',
  SALARY: 'SAL',
  PRICE_HISTORY: 'PPH',
  CUSTOMER_TXN: 'CTX',
  SUPPLIER_TXN: 'STX',
  SALE_ITEM: 'SIT',
  PURCHASE_ITEM: 'PIT',
  CHALLAN_ITEM: 'CIT',
  SALE_RETURN: 'SRN',
  SALE_RETURN_ITEM: 'SRI',
  PURCHASE_RETURN: 'PRN',
  PURCHASE_RETURN_ITEM: 'PRI',
  RECEIPT: 'RP',
  DEPARTMENT: 'DEP',
  ATTENDANCE: 'ATT',
  LEAVE: 'LEV',
  ADVANCE: 'ADV',
  DEVICE: 'DEV',
  SHIFT: 'SHF',
  BIOMETRIC: 'BIO'
};

module.exports = { generateId, generateDateBasedId, formatDateForId, extractSequence, ID_PREFIXES };
