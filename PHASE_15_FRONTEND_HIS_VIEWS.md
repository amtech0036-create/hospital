# Phase 15: Frontend HIS Views & Navigation Linking

## Execution Directives
- Output only lightweight HTML/JS/Bootstrap templates and API connection hooks.
- DO NOT output conversational text, explanations, or tutorials.
- Maintain existing UI styling conventions, navbar patterns, and tenant scoping.

---

## 1. OPD & Token Queue Dashboard (`opd.html`)
- Doctor selection dropdown with schedule display.
- Token generation modal (auto-fills UHID, patient name, and doctor fee).
- Real-time waiting queue table with token status toggle (`in_queue` -> `in_consultation` -> `completed`) and nurse vitals capture modal.

---

## 2. Doctor Prescription & EMR Timeline View (`prescription.html` & `emr.html`)
- **Prescription Pad:** Patient quick-lookup, diagnosis input, dynamic multi-item medicine table (Generic, Brand, Dosage, Frequency, Duration), and diagnostic test checklist.
- **EMR Timeline View:** Chronological feed rendering all past OPD visits, IPD admissions, prescriptions, lab results, and imaging reports for the searched UHID.

---

## 3. Hospital Pharmacy POS (`pharmacy-pos.html`)
- Prescription lookup search bar to auto-load prescribed medicines into the billing cart.
- FEFO batch selector displaying available batches, expiry dates, and current stock.
- Dynamic total calculation, checkout button, and thermal receipt print trigger.

---

## 4. IPD Admission & Bed Matrix View (`ipd-beds.html`)
- Color-coded grid showing bed availability (`green: available`, `red: occupied`, `yellow: reserved`, `gray: maintenance`).
- Bed click actions:
  - If **Available**: Open Patient Admission modal (select UHID, doctor, deposit).
  - If **Occupied**: Open Patient Summary modal with Transfer and Discharge/Final Invoice trigger.

---

## 5. Main Navigation Bar Update
- Add top-level/sidebar menu groups:
  - **Clinical:** OPD Queue, Inpatient (IPD), Bed Matrix, EMR Timeline.
  - **Diagnostics:** Billing, Universal Scanner, Test Catalog, Approvals.
  - **Hospital Operations:** Pharmacy POS, Store Inventory, Blood Bank, Doctor Commissions.
