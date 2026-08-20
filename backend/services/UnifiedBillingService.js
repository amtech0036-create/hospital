const {
  patientRepository,
  admissionRepository,
  bedMasterRepository,
  patientLedgerRepository,
  paymentRepository,
  saleRepository
} = require('../repositories');
const logger = require('../utils/logger');

class UnifiedBillingService {
  /**
   * POST /api/billing/final-invoice
   * Merge: Bed Charges + Nursing Fees + Diagnostic Tests + Pharmacy Items + Consultation Fees - Advances.
   */
  async generateFinalInvoice({
    patientId,
    admissionId,
    consultationFees = 0,
    diagnosticCharges = 0,
    pharmacyCharges = 0,
    nursingFees = 0,
    additionalCharges = [],
    discountAmount = 0,
    paidAmount = 0,
    paymentMethod = 'Cash'
  }) {
    // 1. Resolve Patient
    const patient = await patientRepository.findById(patientId) || await patientRepository.findOne({ uhid: patientId });
    if (!patient) {
      const err = new Error(`Patient not found with ID/UHID: ${patientId}`);
      err.status = 404;
      throw err;
    }

    const patientUhid = patient.uhid || patient.id;

    // 2. Resolve IPD Admission Bed Stay & Advance Deposit if applicable
    let bedChargeAmount = 0;
    let advanceDepositAmount = 0;
    let bedDetails = null;

    if (admissionId) {
      const admission = await admissionRepository.findById(admissionId);
      if (admission) {
        advanceDepositAmount = Number(admission.admissionDeposit || 0);

        const startMs = new Date(admission.admissionDate).getTime();
        const endMs = admission.dischargeDate ? new Date(admission.dischargeDate).getTime() : Date.now();
        const diffHours = Math.max(1, (endMs - startMs) / (1000 * 60 * 60));
        const stayDays = Math.max(1, Math.ceil(diffHours / 24));

        const bed = await bedMasterRepository.findById(admission.bedId);
        const dailyCharge = bed ? Number(bed.dailyCharge || 0) : 1000;
        bedChargeAmount = stayDays * dailyCharge;

        bedDetails = {
          admissionNumber: admission.admissionNumber,
          bedNumber: admission.bedNumber,
          wardType: admission.wardType,
          stayDays,
          dailyCharge,
          bedChargeAmount
        };
      }
    }

    // 3. Consolidate Breakdown
    let totalGross = Number(consultationFees) + Number(diagnosticCharges) + Number(pharmacyCharges) + Number(nursingFees) + bedChargeAmount;

    (additionalCharges || []).forEach((c) => {
      totalGross += Number(c.amount || 0);
    });

    const netAmount = Math.max(0, totalGross - Number(discountAmount) - advanceDepositAmount);
    const paid = Number(paidAmount) || netAmount;
    const due = Math.max(0, netAmount - paid);

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await patientLedgerRepository.count({});
    const invoiceNumber = `FINAL-${todayStr}-${String(count + 1).padStart(4, '0')}`;

    // 4. Record Invoice in Sales Repository
    const saleRecord = await saleRepository.create({
      invoiceNumber,
      patientId: patient.id,
      uhid: patientUhid,
      subTotal: totalGross,
      discountAmount: Number(discountAmount),
      advanceDepositOffset: advanceDepositAmount,
      netAmount,
      paidAmount: paid,
      dueAmount: due,
      paymentMethod,
      type: 'UNIFIED_HOSPITAL_BILL',
      breakdown: {
        consultationFees: Number(consultationFees),
        diagnosticCharges: Number(diagnosticCharges),
        pharmacyCharges: Number(pharmacyCharges),
        nursingFees: Number(nursingFees),
        bedDetails,
        additionalCharges
      }
    });

    const actualInvoice = saleRecord.invoiceNumber || invoiceNumber;

    // 5. Update Patient Running Ledger
    const existingLedgers = await patientLedgerRepository.findAll({ uhid: patientUhid });
    let runningBalance = existingLedgers.reduce((acc, l) => acc + Number(l.debit || 0) - Number(l.credit || 0), 0);

    // Ledger Entry 1: Billed Debit
    runningBalance += netAmount;
    await patientLedgerRepository.create({
      patientId: patient.id,
      uhid: patientUhid,
      transactionType: 'BILL',
      description: `Unified Final Hospital Bill #${actualInvoice}`,
      debit: netAmount,
      credit: 0,
      runningBalance,
      referenceInvoice: actualInvoice
    });

    // Ledger Entry 2: Payment Credit if paid
    if (paid > 0) {
      runningBalance -= paid;
      await patientLedgerRepository.create({
        patientId: patient.id,
        uhid: patientUhid,
        transactionType: 'PAYMENT',
        description: `Payment for Final Bill #${actualInvoice}`,
        debit: 0,
        credit: paid,
        runningBalance,
        referenceInvoice: actualInvoice
      });

      // Register Revenue in Accounts module
      await paymentRepository.create({
        partyType: 'CUSTOMER',
        partyId: patient.id,
        direction: 'INBOUND',
        amount: paid,
        paymentMethod,
        referenceType: 'FINAL_HOSPITAL_BILL',
        referenceId: saleRecord.id,
        note: `Unified Final Bill Settlement #${actualInvoice}`
      });
    }

    logger.info(`Unified Final Hospital Invoice generated: ${actualInvoice} for UHID ${patientUhid}. Net: ${netAmount} BDT, Paid: ${paid} BDT, Due: ${due} BDT.`);

    return {
      invoiceNumber: actualInvoice,
      patient: {
        id: patient.id,
        uhid: patientUhid,
        fullName: patient.fullName || patient.name,
        phone: patient.phone
      },
      breakdown: {
        consultationFees: Number(consultationFees),
        diagnosticCharges: Number(diagnosticCharges),
        pharmacyCharges: Number(pharmacyCharges),
        nursingFees: Number(nursingFees),
        bedDetails,
        additionalCharges,
        totalGross
      },
      financials: {
        discountAmount: Number(discountAmount),
        advanceDepositOffset: advanceDepositAmount,
        netAmount,
        paidAmount: paid,
        dueAmount: due,
        runningBalance
      }
    };
  }

  /**
   * GET /api/billing/ledger/:uhid
   * Centralized financial ledger running balance history for patient.
   */
  async getPatientLedger(patientIdOrUhid) {
    const patient = await patientRepository.findOne({ uhid: patientIdOrUhid }) || await patientRepository.findById(patientIdOrUhid);
    if (!patient) {
      const err = new Error(`Patient not found with ID/UHID: ${patientIdOrUhid}`);
      err.status = 404;
      throw err;
    }

    const patientUhid = patient.uhid || patient.id;
    const ledgerEntries = await patientLedgerRepository.findAll({ uhid: patientUhid });

    ledgerEntries.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const totalBilled = ledgerEntries.reduce((acc, l) => acc + Number(l.debit || 0), 0);
    const totalPaid = ledgerEntries.reduce((acc, l) => acc + Number(l.credit || 0), 0);
    const currentBalance = totalBilled - totalPaid;

    return {
      patient: {
        id: patient.id,
        uhid: patientUhid,
        fullName: patient.fullName || patient.name,
        phone: patient.phone
      },
      summary: {
        totalBilled,
        totalPaid,
        currentBalance
      },
      ledger: ledgerEntries
    };
  }
}

module.exports = new UnifiedBillingService();
