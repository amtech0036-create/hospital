# Phase 14: Full HIS, OPD/IPD, EMR & Pharmacy Workflow Extension

## Execution Directives
- Output only targeted production code for the requested sub-phase.
- DO NOT output conversational text, explanations, or tutorials.
- Reuse existing Multi-Tenant isolation (`tenantId`), Accounts, and Product Inventory engines without duplication.
- Enforce strict negative constraints: Execute only ONE sub-phase per prompt and stop.

---

## 1. Deprecations & Cleanups
- **Retail Deprecations:**
  - Replace standalone retail "Customer" logic with unified `Patient` records across all hospital billing.
  - Route all product and consumable stock through Departmental Stores rather than generic single-location retail inventory.

---

## 2. Sub-Phase 14.1: OPD, Doctor Scheduling & Token Queue
- **Models & Schemas:**
  - `DoctorSchedule`: `tenantId`, `doctorId`, `dayOfWeek`, `startTime`, `endTime`, `slotDuration`, `maxTokens`, `consultationFee`.
  - `Appointment`: `tenantId`, `appointmentNumber`, `patientId`, `uhid`, `doctorId`, `date`, `tokenNumber`, `status` (`scheduled`, `in_queue`, `in_consultation`, `completed`, `cancelled`), `vitals` (`bp`, `pulse`, `temperature`, `weight`, `spo2`).
- **APIs:**
  - `POST /api/opd/appointments`: Book appointment and generate daily sequential token number.
  - `GET /api/opd/queue/:doctorId`: Live doctor waiting queue endpoint.
  - `PATCH /api/opd/appointments/:id/vitals`: Nurse triage vitals capture.

---

## 3. Sub-Phase 14.2: Electronic Prescription & EMR Timeline
- **Models & Schemas:**
  - `Prescription`: `tenantId`, `prescriptionNumber`, `patientId`, `uhid`, `doctorId`, `appointmentId`, `diagnosis`, `symptoms`, `medicines` (`genericName`, `brandName`, `dosage`, `frequency`, `duration`, `instructions`), `testsRecommended` (array of test codes), `clinicalNotes`, `nextFollowUpDate`.
  - `MedicalRecord`: Unified timeline indexing `patientId`, `uhid`, `recordType` (`OPD`, `IPD`, `PRESCRIPTION`, `LIS_REPORT`, `RIS_REPORT`, `DOCUMENT`), `referenceId`, `recordedAt`.
- **APIs:**
  - `POST /api/prescriptions`: Doctor consultation completion and direct prescription generation.
  - `GET /api/patients/:uhid/emr-timeline`: Centralized historical clinical summary.

---

## 4. Sub-Phase 14.3: Hospital Pharmacy (Batch & Expiry Extension)
- **Inventory Model Extension:**
  - Extend existing `Product` schema with: `isMedicine`, `genericName`, `manufacturer`, `dosageForm`, `strength`, `prescriptionRequired`, `batches` (`batchNumber`, `expiryDate`, `costPrice`, `sellingPrice`, `currentStock`).
- **Pharmacy Workflow APIs:**
  - `GET /api/pharmacy/prescriptions/:prescriptionNumber`: Auto-load doctor-prescribed medicines directly into pharmacy billing cart.
  - `POST /api/pharmacy/sales`: Deduct items based on FEFO (First-Expired, First-Out) batch logic and register revenue in Accounts.

---

## 5. Sub-Phase 14.4: Bed, Ward & IPD Admission Management
- **Models & Schemas:**
  - `BedMaster`: `tenantId`, `bedNumber`, `wardType` (`general`, `cabin`, `icu`, `emergency`), `floor`, `dailyCharge`, `status` (`available`, `occupied`, `reserved`, `maintenance`).
  - `Admission`: `tenantId`, `admissionNumber`, `patientId`, `uhid`, `attendingDoctorId`, `bedId`, `admissionDate`, `dischargeDate`, `admissionDeposit`, `dailyCareNotes`, `status` (`admitted`, `transferred`, `discharged`), `dischargeSummary`.
- **APIs:**
  - `GET /api/ipd/beds/matrix`: Visual real-time ward/bed availability dashboard.
  - `POST /api/ipd/admissions`: Admit patient, lock bed state to `occupied`, and collect initial advance deposit.
  - `POST /api/ipd/admissions/:id/discharge`: Release bed state to `cleaning` and trigger final unified invoice.

---

## 6. Sub-Phase 14.5: Unified Hospital Billing & Patient Ledger
- **Consolidated Billing Engine:**
  - Route: `/api/billing/final-invoice`
  - Merge: Bed Charges + Nursing Fees + Diagnostic Tests + Pharmacy Items + Doctor Consultation Fees - Deposits/Advances.
- **Patient Ledger:**
  - Schema: `PatientLedger` (`patientId`, `uhid`, `transactionType` [`BILL`, `PAYMENT`, `DEPOSIT`, `REFUND`], `debit`, `credit`, `runningBalance`, `referenceInvoice`).

---

## 7. Sub-Phase 14.6: Hospital Store Inventory & Blood Bank
- **Departmental Stock:**
  - Stores: `Central`, `Pharmacy`, `Lab`, `OT`, `Ward`, `Emergency`.
  - APIs for internal stock requisitions, approvals, and departmental consumption tracking.
- **Blood Bank Master:**
  - `BloodUnit`: `tenantId`, `bloodGroup`, `donorId`, `collectionDate`, `expiryDate`, `status` (`available`, `reserved`, `transfused`, `discarded`).
