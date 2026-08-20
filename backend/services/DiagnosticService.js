const {
  patientRepository,
  diagnosticTestRepository,
  diagnosticOrderRepository,
  diagnosticResultRepository
} = require('../repositories');
const { generateInvoiceBarcode, generateSpecimenBarcode, generateUHID } = require('../utils/barcodeGenerator');
const { getCurrentTenantId } = require('../context/tenantContext');
const logger = require('../utils/logger');

class DiagnosticService {
  /**
   * Diagnostic Test Master Catalog CRUD
   */
  async listTests(filter = {}) {
    return diagnosticTestRepository.findAll(filter);
  }

  async createTest(data) {
    const tenantId = getCurrentTenantId();
    return diagnosticTestRepository.create({
      tenantId,
      code: data.code,
      name: data.name,
      department: data.department || 'Pathology',
      category: data.category || 'General',
      price: Number(data.price) || 0,
      sampleType: data.sampleType || 'N/A',
      specimenContainer: data.specimenContainer || 'N/A',
      parameters: data.parameters || [],
      radiologyDetails: data.radiologyDetails || {},
      status: 'Active'
    });
  }

  async updateTest(id, data) {
    return diagnosticTestRepository.update(id, data);
  }

  async getShiftSummary({ date } = {}) {
    const targetDate = date ? new Date(date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
    const orders = await diagnosticOrderRepository.findAll({});

    let totalInvoices = 0;
    let totalGrossRevenue = 0;
    let totalDiscount = 0;
    let netCollection = 0;
    let paidAmount = 0;
    let dueAmount = 0;

    orders.forEach((ord) => {
      const ordDate = (ord.createdAt || '').slice(0, 10);
      if (ordDate === targetDate) {
        totalInvoices++;
        totalGrossRevenue += ord.financials?.totalAmount || 0;
        totalDiscount += ord.financials?.discountAmount || 0;
        netCollection += ord.financials?.netAmount || 0;
        paidAmount += ord.financials?.paidAmount || 0;
        dueAmount += ord.financials?.dueAmount || 0;
      }
    });

    return {
      date: targetDate,
      totalInvoices,
      totalGrossRevenue,
      totalDiscount,
      netCollection,
      paidAmount,
      dueAmount,
      cashCollection: paidAmount,
      digitalPayCollection: 0
    };
  }

  /**
   * Create or update a Patient record, ensuring UHID assignment.
   */
  async registerPatient(patientData) {
    const tenantId = getCurrentTenantId();
    let patient = null;

    if (patientData.uhid) {
      patient = await patientRepository.findOne({ uhid: patientData.uhid });
    }

    if (!patient && patientData.phone) {
      patient = await patientRepository.findOne({ phone: patientData.phone });
    }

    if (patient) {
      const updated = await patientRepository.update(patient.id, {
        fullName: patientData.fullName || patient.fullName,
        gender: patientData.gender || patient.gender,
        age: patientData.age || patient.age,
        bloodGroup: patientData.bloodGroup || patient.bloodGroup,
        email: patientData.email || patient.email,
        address: patientData.address || patient.address,
        emergencyContact: patientData.emergencyContact || patient.emergencyContact,
        referredDoctor: patientData.referredDoctor || patient.referredDoctor,
        status: 'Active'
      });
      return updated;
    }

    // Generate new UHID if not provided
    const count = await patientRepository.count({});
    const uhid = patientData.uhid || generateUHID(tenantId, count);

    const newPatient = await patientRepository.create({
      tenantId,
      uhid,
      fullName: patientData.fullName,
      gender: patientData.gender,
      age: typeof patientData.age === 'object' ? patientData.age : { value: Number(patientData.age) || 0, unit: 'Years' },
      dob: patientData.dob || null,
      bloodGroup: patientData.bloodGroup || 'Unknown',
      phone: patientData.phone,
      email: patientData.email || '',
      address: patientData.address || {},
      emergencyContact: patientData.emergencyContact || {},
      referredDoctor: patientData.referredDoctor || {},
      status: 'Active'
    });

    return newPatient;
  }

  /**
   * POST /api/diagnostics/orders
   * Creates patient billing record, generates test orders, invoice barcode, and per-test specimen barcodes.
   */
  async createOrder(input, { createdBy = 'system' } = {}) {
    const tenantId = getCurrentTenantId();

    if (!input.patient && !input.patientData) {
      const err = new Error('Patient ID or patientData is required to create a diagnostic order.');
      err.status = 400;
      throw err;
    }

    let patientRecord = null;
    if (input.patientId || input.patient) {
      const pid = input.patientId || input.patient;
      patientRecord = await patientRepository.findById(pid);
      if (!patientRecord) {
        patientRecord = await patientRepository.findOne({ uhid: pid });
      }
    }

    if (!patientRecord && input.patientData) {
      patientRecord = await this.registerPatient(input.patientData);
    }

    if (!patientRecord) {
      const err = new Error('Patient record not found or could not be registered.');
      err.status = 404;
      throw err;
    }

    if (!input.tests || !Array.isArray(input.tests) || input.tests.length === 0) {
      const err = new Error('At least one diagnostic test must be ordered.');
      err.status = 400;
      throw err;
    }

    // Generate Invoice Number and Invoice Barcode
    const orderCount = await diagnosticOrderRepository.count({});
    const dateTag = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const invoiceNumber = input.invoiceNumber || `INV-${dateTag}-${String(orderCount + 1).padStart(4, '0')}`;
    const orderBarcode = generateInvoiceBarcode(tenantId);

    let totalAmount = 0;
    const processedTests = [];
    const resultPlaceholders = [];

    for (let i = 0; i < input.tests.length; i++) {
      const item = input.tests[i];
      const testId = item.testId || item.test;
      let testRecord = null;

      if (testId) {
        testRecord = await diagnosticTestRepository.findById(testId);
        if (!testRecord) {
          testRecord = await diagnosticTestRepository.findOne({ code: testId });
        }
      }

      const testCode = testRecord ? testRecord.code : item.testCode || `TEST-${i + 1}`;
      const testName = testRecord ? testRecord.name : item.testName || `Test ${i + 1}`;
      const department = testRecord ? testRecord.department : item.department || 'Pathology';
      const price = testRecord ? testRecord.price : Number(item.price) || 0;
      const specimenBarcode = generateSpecimenBarcode(testRecord ? testRecord.id : testCode, i + 1);

      totalAmount += price;

      const orderItem = {
        test: testRecord ? testRecord.id : testId,
        testCode,
        testName,
        department,
        price,
        specimenBarcode,
        sampleStatus: 'pending',
        sampleCollectedAt: null,
        sampleCollectedBy: ''
      };

      processedTests.push(orderItem);

      resultPlaceholders.push({
        testId: testRecord ? testRecord.id : testId,
        specimenBarcode,
        department,
        testCode,
        testName
      });
    }

    const discountAmount = Number(input.discountAmount) || 0;
    const taxAmount = Number(input.taxAmount) || 0;
    const netAmount = Math.max(0, totalAmount - discountAmount + taxAmount);
    const paidAmount = Number(input.paidAmount) || 0;
    const dueAmount = Math.max(0, netAmount - paidAmount);
    let paymentStatus = 'Unpaid';
    if (paidAmount >= netAmount && netAmount > 0) paymentStatus = 'Paid';
    else if (paidAmount > 0) paymentStatus = 'Partial';

    const isEmergency = Boolean(input.isEmergency);
    if (isEmergency) {
      const AuditService = require('./AuditService');
      AuditService.logAction({
        userId: createdBy,
        userRole: 'Emergency_Physician',
        action: 'BREAK_GLASS',
        entity: 'DiagnosticOrder',
        entityId: invoiceNumber,
        details: `Trauma Break-Glass emergency override order created for patient ${patientRecord.uhid}`
      });
    }

    const orderData = {
      tenantId,
      invoiceNumber,
      patient: patientRecord.id,
      uhid: patientRecord.uhid,
      patientSnapshot: {
        fullName: patientRecord.fullName,
        age: typeof patientRecord.age === 'object' ? `${patientRecord.age.value} ${patientRecord.age.unit}` : String(patientRecord.age),
        gender: patientRecord.gender,
        phone: patientRecord.phone
      },
      orderBarcode,
      tests: processedTests,
      financials: {
        totalAmount,
        discountAmount,
        taxAmount,
        netAmount,
        paidAmount,
        dueAmount,
        paymentStatus
      },
      isEmergency,
      referredDoctor: input.referredDoctor || patientRecord.referredDoctor || {},
      status: isEmergency ? 'in_progress' : 'pending',
      createdBy
    };

    const createdOrder = await diagnosticOrderRepository.create(orderData);

    // Initialize Result documents for Pathology & Radiology queues
    for (const resItem of resultPlaceholders) {
      await diagnosticResultRepository.create({
        tenantId,
        order: createdOrder.id,
        orderId: createdOrder.id,
        invoiceNumber,
        patient: patientRecord.id,
        uhid: patientRecord.uhid,
        test: resItem.testId,
        testId: resItem.testId,
        specimenBarcode: resItem.specimenBarcode,
        department: resItem.department,
        status: 'pending',
        pathologyResults: [],
        radiologyReport: {},
        enteredBy: '',
        authorizedBy: ''
      });
    }

    logger.info(`Diagnostic Order created: ${createdOrder.invoiceNumber} with barcode ${orderBarcode}`);
    return {
      order: createdOrder,
      patient: patientRecord
    };
  }

  /**
   * GET /api/diagnostics/scan/:barcode
   */
  async scanBarcode(barcode) {
    if (!barcode) {
      const err = new Error('Barcode string parameter is required.');
      err.status = 400;
      throw err;
    }

    const code = barcode.trim();

    let order = await diagnosticOrderRepository.findOne({ orderBarcode: code });
    if (!order) {
      order = await diagnosticOrderRepository.findOne({ invoiceNumber: code });
    }

    let targetSpecimenBarcode = null;
    if (!order) {
      const allOrders = await diagnosticOrderRepository.findAll({});
      for (const ord of allOrders) {
        if (ord.tests && Array.isArray(ord.tests)) {
          const match = ord.tests.find((t) => t.specimenBarcode === code);
          if (match) {
            order = ord;
            targetSpecimenBarcode = code;
            break;
          }
        }
      }
    } else {
      targetSpecimenBarcode = code;
    }

    if (!order) {
      const err = new Error(`No diagnostic order or specimen found matching barcode: ${code}`);
      err.status = 404;
      throw err;
    }

    const patient = await patientRepository.findOne({ uhid: order.uhid }) || await patientRepository.findById(order.patient);
    const results = await diagnosticResultRepository.findAll({ orderId: order.id });

    return {
      scannedBarcode: code,
      matchType: targetSpecimenBarcode && targetSpecimenBarcode.startsWith('SPEC-') ? 'SpecimenBarcode' : 'OrderBarcode',
      patient: patient || order.patientSnapshot,
      order: {
        id: order.id,
        invoiceNumber: order.invoiceNumber,
        uhid: order.uhid,
        orderBarcode: order.orderBarcode,
        status: order.status,
        financials: order.financials,
        referredDoctor: order.referredDoctor,
        createdAt: order.createdAt
      },
      orderedTests: order.tests.map((t) => ({
        testId: t.test,
        testCode: t.testCode,
        testName: t.testName,
        department: t.department,
        price: t.price,
        specimenBarcode: t.specimenBarcode,
        sampleStatus: t.sampleStatus,
        sampleCollectedAt: t.sampleCollectedAt,
        sampleCollectedBy: t.sampleCollectedBy
      })),
      results: results.map((r) => ({
        id: r.id,
        testId: r.test || r.testId,
        specimenBarcode: r.specimenBarcode,
        department: r.department,
        status: r.status,
        pathologyResults: r.pathologyResults || [],
        radiologyReport: r.radiologyReport || {},
        enteredBy: r.enteredBy,
        enteredAt: r.enteredAt,
        authorizedBy: r.authorizedBy,
        authorizedAt: r.authorizedAt
      }))
    };
  }

  /**
   * PATCH /api/diagnostics/sample-collect
   * Update specimen tube item status to `sample_collected` and assign phlebotomist ID.
   */
  async collectSample({ orderId, specimenBarcode, phlebotomistId }) {
    if (!specimenBarcode) {
      const err = new Error('specimenBarcode is required for sample collection.');
      err.status = 400;
      throw err;
    }

    let order = null;
    if (orderId) {
      order = await diagnosticOrderRepository.findById(orderId);
    }

    if (!order) {
      const allOrders = await diagnosticOrderRepository.findAll({});
      for (const ord of allOrders) {
        if (ord.tests && ord.tests.some((t) => t.specimenBarcode === specimenBarcode)) {
          order = ord;
          break;
        }
      }
    }

    if (!order) {
      const err = new Error(`Order not found for specimen barcode: ${specimenBarcode}`);
      err.status = 404;
      throw err;
    }

    const now = new Date().toISOString();
    let updated = false;

    const updatedTests = order.tests.map((testItem) => {
      if (testItem.specimenBarcode === specimenBarcode) {
        updated = true;
        return {
          ...testItem,
          sampleStatus: 'sample_collected',
          sampleCollectedAt: now,
          sampleCollectedBy: phlebotomistId || 'Phlebotomist'
        };
      }
      return testItem;
    });

    if (!updated) {
      const err = new Error(`Specimen barcode ${specimenBarcode} does not match any item in order ${order.invoiceNumber}`);
      err.status = 404;
      throw err;
    }

    await diagnosticOrderRepository.update(order.id, {
      tests: updatedTests,
      status: 'in_progress'
    });

    // Update corresponding result document
    const resultDoc = await diagnosticResultRepository.findOne({ specimenBarcode });
    if (resultDoc) {
      await diagnosticResultRepository.update(resultDoc.id, {
        status: 'sample_collected'
      });
    }

    logger.info(`Sample collected for barcode ${specimenBarcode} by ${phlebotomistId}`);

    return {
      message: 'Sample status updated to sample_collected successfully.',
      invoiceNumber: order.invoiceNumber,
      specimenBarcode,
      sampleStatus: 'sample_collected',
      sampleCollectedAt: now,
      sampleCollectedBy: phlebotomistId || 'Phlebotomist'
    };
  }

  /**
   * POST /api/diagnostics/results/save
   * Saves Pathology tabular parameter results with abnormal/critical flag evaluation,
   * or saves Radiology narrative report (clinicalHistory, technique, findings, impression).
   */
  async saveResults({ resultId, orderId, specimenBarcode, department, pathologyResults, radiologyReport, enteredBy }) {
    let resultDoc = null;
    if (resultId) {
      resultDoc = await diagnosticResultRepository.findById(resultId);
    }

    if (!resultDoc && specimenBarcode) {
      resultDoc = await diagnosticResultRepository.findOne({ specimenBarcode });
    }

    if (!resultDoc && orderId) {
      resultDoc = await diagnosticResultRepository.findOne({ orderId });
    }

    if (!resultDoc) {
      const err = new Error('Diagnostic result record not found to save results.');
      err.status = 404;
      throw err;
    }

    const dept = (department || resultDoc.department || '').toLowerCase();
    const updatePayload = {
      enteredBy: enteredBy || 'Lab_Technician',
      enteredAt: new Date().toISOString(),
      status: 'result_ready'
    };

    if (dept.includes('pathology')) {
      if (!Array.isArray(pathologyResults)) {
        const err = new Error('pathologyResults must be an array of parameter objects.');
        err.status = 400;
        throw err;
      }

      // Automated Abnormal / Critical Flag Evaluation
      const evaluatedParameters = pathologyResults.map((param) => {
        let isCritical = Boolean(param.isCritical);
        const val = parseFloat(param.resultValue);

        if (!isNaN(val) && param.referenceRange) {
          const match = param.referenceRange.match(/([\d.]+)\s*-\s*([\d.]+)/);
          if (match) {
            const low = parseFloat(match[1]);
            const high = parseFloat(match[2]);
            if (val < low || val > high) {
              isCritical = true;
            }
          }
        }

        return {
          parameterName: param.parameterName,
          resultValue: String(param.resultValue),
          unit: param.unit || '',
          referenceRange: param.referenceRange || '',
          isCritical,
          remarks: param.remarks || (isCritical ? 'Abnormal Value' : 'Normal')
        };
      });

      updatePayload.pathologyResults = evaluatedParameters;
    } else if (dept.includes('radiology') || dept.includes('mri') || dept.includes('ct') || dept.includes('x-ray') || dept.includes('usg')) {
      if (!radiologyReport || typeof radiologyReport !== 'object') {
        const err = new Error('radiologyReport object is required for Radiology results.');
        err.status = 400;
        throw err;
      }

      updatePayload.radiologyReport = {
        clinicalHistory: radiologyReport.clinicalHistory || '',
        technique: radiologyReport.technique || '',
        findings: radiologyReport.findings || '',
        impression: radiologyReport.impression || '',
        dcmStudyInstanceUID: radiologyReport.dcmStudyInstanceUID || '',
        attachmentUrls: Array.isArray(radiologyReport.attachmentUrls) ? radiologyReport.attachmentUrls : []
      };
    } else {
      updatePayload.pathologyResults = pathologyResults || [];
      if (radiologyReport) updatePayload.radiologyReport = radiologyReport;
    }

    const updatedResult = await diagnosticResultRepository.update(resultDoc.id, updatePayload);
    logger.info(`Diagnostic result saved for ID ${resultDoc.id} in department ${dept}`);
    return updatedResult;
  }

  /**
   * PATCH /api/diagnostics/results/authorize
   * Digital verification, signature attachment, and status flip to `authorized`.
   */
  async authorizeResult({ resultId, authorizedBy, digitalSignature }) {
    if (!resultId) {
      const err = new Error('resultId is required for result authorization.');
      err.status = 400;
      throw err;
    }

    const resultDoc = await diagnosticResultRepository.findById(resultId);
    if (!resultDoc) {
      const err = new Error(`Diagnostic result record not found: ${resultId}`);
      err.status = 404;
      throw err;
    }

    const now = new Date().toISOString();
    const verifier = authorizedBy || 'Pathologist/Radiologist';

    const signatureData = {
      signatureHash: digitalSignature?.hash || `SIG-${resultDoc.id}-${Date.now()}`,
      signatureUrl: digitalSignature?.url || '',
      signedBy: verifier
    };

    const updatedResult = await diagnosticResultRepository.update(resultId, {
      status: 'authorized',
      authorizedBy: verifier,
      authorizedAt: now,
      digitalSignature: signatureData
    });

    // Check if all results for the order are authorized; if so, complete the order
    const orderResults = await diagnosticResultRepository.findAll({ orderId: resultDoc.order || resultDoc.orderId });
    const allApproved = orderResults.every((r) => r.status === 'authorized' || r.status === 'approved');

    if (allApproved && (resultDoc.order || resultDoc.orderId)) {
      await diagnosticOrderRepository.update(resultDoc.order || resultDoc.orderId, {
        status: 'completed'
      });
      logger.info(`Diagnostic Order ${resultDoc.order || resultDoc.orderId} marked as completed after full authorization.`);
    }

    return updatedResult;
  }

  /**
   * GET /api/diagnostics/reports/:orderId/print
   * PDF report print data generation containing patient metadata, test results, and digital signatures.
   */
  async getReportPrintData(orderId) {
    let order = await diagnosticOrderRepository.findById(orderId);
    if (!order) {
      order = await diagnosticOrderRepository.findOne({ invoiceNumber: orderId });
    }

    if (!order) {
      const err = new Error(`Diagnostic Order not found: ${orderId}`);
      err.status = 404;
      throw err;
    }

    const patient = await patientRepository.findOne({ uhid: order.uhid }) || await patientRepository.findById(order.patient);
    const results = await diagnosticResultRepository.findAll({ orderId: order.id });

    return {
      reportHeader: {
        title: 'HOSPITAL DIAGNOSTIC INFORMATION SYSTEM',
        invoiceNumber: order.invoiceNumber,
        orderBarcode: order.orderBarcode,
        uhid: order.uhid,
        orderDate: order.createdAt,
        printDate: new Date().toISOString()
      },
      patientInfo: {
        uhid: order.uhid,
        fullName: patient ? patient.fullName : order.patientSnapshot.fullName,
        age: patient ? (typeof patient.age === 'object' ? `${patient.age.value} ${patient.age.unit}` : patient.age) : order.patientSnapshot.age,
        gender: patient ? patient.gender : order.patientSnapshot.gender,
        phone: patient ? patient.phone : order.patientSnapshot.phone,
        bloodGroup: patient ? patient.bloodGroup : 'Unknown',
        referredDoctor: order.referredDoctor || {}
      },
      tests: order.tests.map((t) => {
        const resultDoc = results.find((r) => r.testId === t.test || r.test === t.test || r.specimenBarcode === t.specimenBarcode);
        return {
          testCode: t.testCode,
          testName: t.testName,
          department: t.department,
          specimenBarcode: t.specimenBarcode,
          sampleStatus: t.sampleStatus,
          resultStatus: resultDoc ? resultDoc.status : 'pending',
          pathologyResults: resultDoc ? resultDoc.pathologyResults || [] : [],
          radiologyReport: resultDoc ? resultDoc.radiologyReport || {} : {},
          authorizedBy: resultDoc ? resultDoc.authorizedBy : '',
          authorizedAt: resultDoc ? resultDoc.authorizedAt : '',
          digitalSignature: resultDoc ? resultDoc.digitalSignature : null
        };
      }),
      financialSummary: order.financials,
      isFullyAuthorized: results.length > 0 && results.every((r) => r.status === 'authorized' || r.status === 'approved')
    };
  }
}

module.exports = new DiagnosticService();
