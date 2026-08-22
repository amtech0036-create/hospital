# Hospital ERP — Dummy Test Data & Bug Testing

## Purpose

Use this fictional dataset to test the Hospital ERP under PM2 and identify backend, frontend, database, search, integration, billing, and workflow bugs.

## 1. Test Patients

| UHID | Name | Gender | Age | Phone | Blood Group |
|---|---|---|---:|---|---|
| AMGH-000001 | Rahim Ahmed | Male | 45 | 01710000001 | B+ |
| AMGH-000002 | Karim Hasan | Male | 32 | 01710000002 | O+ |
| AMGH-000003 | Nusrat Jahan | Female | 28 | 01710000003 | A+ |
| AMGH-000004 | Fatema Akter | Female | 62 | 01710000004 | B+ |
| AMGH-000005 | Arif Hossain | Male | 19 | 01710000005 | O- |
| AMGH-000006 | Sumaiya Rahman | Female | 35 | 01710000006 | AB+ |
| AMGH-000007 | Sakib Khan | Male | 8 | 01710000007 | A+ |
| AMGH-000008 | Rina Begum | Female | 54 | 01710000008 | O+ |
| AMGH-000009 | Tanvir Islam | Male | 67 | 01710000009 | B- |
| AMGH-000010 | Jannatul Ferdous | Female | 24 | 01710000010 | AB+ |

## 2. Test Doctors

| Doctor | Department | Specialty |
|---|---|---|
| Dr. Hasan Mahmud | Emergency | Emergency Medicine |
| Dr. Farzana Ahmed | OPD | Internal Medicine |
| Dr. Saiful Islam | Cardiology | Cardiology |
| Dr. Nusrat Karim | Obs/Gynae | Gynecology |
| Dr. Rakib Hasan | Pediatrics | Pediatrics |
| Dr. Imran Chowdhury | Radiology | Radiologist |
| Dr. Tareq Rahman | Surgery | General Surgery |

## 3. Test Nurses

| Nurse | Department | Employee ID |
|---|---|---|
| Maria Akter | Emergency | NUR-001 |
| Shila Rahman | IPD | NUR-002 |
| Jannat Ara | ICU | NUR-003 |

---

# 4. Emergency Test

**Patient:** AMGH-000001 — Rahim Ahmed

- Complaint: Severe chest pain
- BP: 160/100
- Pulse: 112
- Temperature: 98.6 F
- SpO2: 91%
- Respiration: 24
- Triage: Level 1 / Resuscitation

Test:

`Registration → Triage → Vitals → Doctor → Emergency Notes → Orders → Bed → Billing → Transfer`

Negative tests:

- Duplicate registration
- Empty UHID
- Invalid patient/doctor
- Negative vitals
- SpO2 above 100
- Empty triage
- Occupied/nonexistent bed

---

# 5. Nursing / MAR Test

**Patient:** AMGH-000001

- Medicine: Paracetamol 500mg
- Dose: 1 tablet
- Route: Oral
- Frequency: Every 6 hours

Test MAR states:

- Scheduled
- Administered
- Missed
- Refused

Verify that each event appears correctly in the EMR.

---

# 6. Pathology Test

Tests:

- CBC
- Blood Sugar
- HbA1c
- Lipid Profile
- LFT
- KFT
- Urine R/E

**Patient:** AMGH-000001

Order:

- CBC
- Blood Sugar
- LFT

Expected barcode:

`LAB-000001`

Workflow:

`Ordered → Sample Collected → Processing → Result → Verified → Report`

Negative tests:

- Duplicate barcode
- Empty result
- Invalid numeric result
- Negative blood sugar
- Missing patient/test
- Verify without result

---

# 7. Radiology Test

Orders:

1. AMGH-000001 — X-Ray Chest
2. AMGH-000003 — Ultrasound Abdomen
3. AMGH-000009 — CT Brain

Workflow:

`Order → Worklist → Radiologist → Findings → Report → Finalize`

Try finalizing without findings. The API should return a controlled validation error.

---

# 8. Pharmacy Test Data

| Medicine | Batch | Stock | Expiry |
|---|---|---:|---|
| Paracetamol 500mg | PCM001 | 500 | 2027-12-31 |
| Amoxicillin 500mg | AMX001 | 200 | 2027-06-30 |
| Omeprazole 20mg | OMP001 | 300 | 2028-01-31 |
| Salbutamol | SAL001 | 100 | 2027-09-30 |
| Ceftriaxone 1g | CEF001 | 50 | 2027-03-31 |

Test:

`Search → Barcode → Prescription → Dispense → Stock Reduction → Return → Adjustment → Alerts`

---

# 9. ICU Test

**Patient:** AMGH-000009 — Tanvir Islam

- Bed: ICU-01
- Ventilator: Invasive
- SpO2: 88%
- BP: 90/60
- Pulse: 120

Intake: `2500 ml`

Output: `1800 ml`

Expected balance: `+700 ml`

Workflow:

`Admission → Bed → Ventilator → Vitals → Intake/Output → Progress → Transfer → Discharge`

---

# 10. OT Test

**Patient:** AMGH-000004 — Fatema Akter

- Procedure: Appendectomy
- Surgeon: Dr. Tareq Rahman
- Anesthetist: Test Anesthetist
- OT Room: OT-01

Workflow:

`Schedule → Pre-op → WHO Checklist → Surgery → Post-op → Recovery → Billing`

Try starting surgery before completing the safety checklist.

---

# 11. Blood Bank Test

### Blood Bag 1

- ID: BB-BAG-00001
- Group: B+
- Component: PRBC
- Status: Available

### Blood Bag 2

- ID: BB-BAG-00002
- Group: O+
- Component: FFP
- Status: Available

Test:

`Request → Blood Group → Cross-match → Reserve → Issue → Transfusion`

Negative test:

`B+ patient + A+ blood`

Expected: reject incompatible blood.

---

# 12. Central Billing Test

**Patient:** AMGH-000001

| Service | Amount (BDT) |
|---|---:|
| OPD | 500 |
| CBC | 300 |
| LFT | 600 |
| X-Ray | 800 |
| Medicine | 1,200 |
| Emergency | 1,000 |
| **Gross Total** | **4,400** |
| Discount | **400** |
| **Net Total** | **4,000** |
| Paid | **2,500** |
| **Due** | **1,500** |

Test:

- Partial payment
- Full payment
- Overpayment
- Refund
- Discount
- Invoice reprint
- Due search

---

# 13. 360° EMR Integration Test

Use **AMGH-000001 — Rahim Ahmed** as the Golden Test Patient.

Create:

`Registration → OPD → Prescription → Emergency → Nursing → Pathology → Radiology → Pharmacy → IPD → ICU → OT if required → Blood Bank if required → Billing → Discharge`

Then search:

`AMGH-000001`

Verify:

- Correct UHID
- Correct patient
- Correct timestamps
- Correct doctors/departments
- Correct prescription
- Correct lab/radiology records
- Correct nursing records
- Correct pharmacy transaction
- Correct billing
- No duplicate events
- No unrelated records

---

# 14. Search-First Stress Test

Every dynamic record lookup must use a **search box**, not a traditional dropdown.

Test:

- `A`
- `Ra`
- `Rah`
- `Rahim`
- `AMGH`
- `AMGH-000001`
- `01710000001`

Also test:

- No result
- Multiple results
- Long search
- Special characters
- Spaces
- Upper/lowercase
- Rapid typing
- Clear button
- Up/Down
- Enter
- Escape

Expected:

`Typing → Server Search → Predictive Results → Select`

---

# 15. PM2 Stability Test

Commands:

```bash
pm2 status
pm2 logs
pm2 logs --lines 200
pm2 monit
pm2 restart all
pm2 save
```

After restart verify:

- MongoDB reconnects
- APIs work
- No duplicate initialization
- No stopped process
- No unhandled promise rejection
- No startup errors
- Existing data remains available

---

# 16. API Negative Testing

Test important APIs with:

- Missing required fields
- Invalid ObjectId
- Invalid UHID
- Nonexistent patient
- Nonexistent doctor
- Duplicate record
- Unauthorized request
- Invalid/expired token
- Invalid date
- Negative amount
- Negative quantity
- Empty request body

Expected:

- Proper HTTP error
- Clear error message
- No server crash
- No corrupt database record

---

# 17. Database Integrity Tests

Verify:

- UHID uniqueness
- Invoice number uniqueness
- Lab barcode uniqueness
- Blood bag ID uniqueness
- Accurate bed occupancy
- No incorrect negative stock
- Correct payment totals
- Correct UHID references
- Correct EMR references
- Safe handling of deleted/invalid references

---

# 18. Final Golden Workflow

Use `AMGH-000001` and run:

`Registration → OPD → Prescription → Emergency → Nursing → Pathology → Radiology → Pharmacy → IPD → ICU → OT → Blood Bank → Billing → Discharge → 360° EMR`

A successful test should produce no:

- Server crash
- Wrong patient data
- Broken references
- Duplicate records
- Incorrect billing
- Missing EMR events

---

# 19. Bug Report Format

```text
Bug ID:
Module:
Page:
API:
User:
UHID:
Steps to Reproduce:
Expected Result:
Actual Result:
Browser Console Error:
Backend/PM2 Error:
Severity:
Screenshot:
Status:
```

Severity:

- **Critical** — data loss, security issue, wrong patient data, server crash
- **High** — major workflow cannot continue
- **Medium** — feature works incorrectly but workaround exists
- **Low** — minor UI or cosmetic issue
