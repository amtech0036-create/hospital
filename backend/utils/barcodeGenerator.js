const { getCurrentTenantId } = require('../context/tenantContext');

/**
 * Utility functions for generating Code128 & QR compatible barcode strings
 * for diagnostic invoices, specimen tubes, and patient UHIDs.
 */

function generateInvoiceBarcode(tenantId) {
  const tid = tenantId || getCurrentTenantId() || 'DEFAULT';
  const timestamp = Date.now();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `INV-${tid.toUpperCase()}-${timestamp}-${randomSuffix}`;
}

function generateSpecimenBarcode(testId, index = 1) {
  const cleanTestId = (testId || 'TEST').replace(/[^a-zA-Z0-9]/g, '');
  const timestamp = Date.now().toString().slice(-6);
  const idxPadded = String(index).padStart(2, '0');
  return `SPEC-${cleanTestId}-${timestamp}-${idxPadded}`;
}

function generateUHID(tenantId, maxSequence = 0) {
  const tid = tenantId || getCurrentTenantId() || 'GEN';
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const paddedSeq = String(maxSequence + 1).padStart(4, '0');
  return `UHID-${tid.toUpperCase()}-${dateStr}-${paddedSeq}`;
}

module.exports = {
  generateInvoiceBarcode,
  generateSpecimenBarcode,
  generateUHID
};
