const PatientLedger = {
  name: 'PatientLedger',
  collection: 'patient_ledgers',
  idPrefix: 'LED',
  columns: [
    'id',
    'tenantId',
    'patientId',
    'uhid',
    'transactionType', // 'BILL', 'PAYMENT', 'DEPOSIT', 'REFUND'
    'description',
    'debit', // Billed amount
    'credit', // Paid / Deposit amount
    'runningBalance',
    'referenceInvoice',
    'createdAt',
    'updatedAt'
  ]
};

module.exports = PatientLedger;
