# Phase 10: Diagnostic Billing Flow & Master CRUD Fixes

## Execution Directives
- Output only targeted bug fixes and updated React/Express components.
- DO NOT output conversational pleasantries, explanations, or tutorials.
- Maintain existing state management, multi-tenant scoping (`tenantId`), and API patterns.

---

## 1. Diagnostic Billing: Patient Quick-Add Modal & Auto-Select
- Add a `+ New Patient` action button next to the Patient lookup on the Diagnostic Billing screen.
- Clicking opens a Quick-Add Modal (`fullName`, `age`, `gender`, `phone`, `emergencyContact`).
- **Flow:** Submitting triggers `POST /api/patients`, adds the record to Patient Master, automatically closes the modal, and sets the newly generated UHID/Patient as the active selection in the billing form without a page reload.

---

## 2. Diagnostic Billing: Doctor Search Autocomplete
- Replace the plain text `referredDoctor` input with an asynchronous searchable dropdown / autocomplete selector.
- **Flow:**
  - Queries `GET /api/doctors?search={query}` with a 300ms debounce.
  - Displays Doctor Name, Department, and Specialization in the dropdown list.
  - Selecting a doctor attaches `referredDoctorId` and `referredDoctorName` to the diagnostic order payload.
  - Fallback: Allow typing a custom doctor name string if the doctor is not in the Master directory.

---

## 3. Diagnostic Test Catalog: Reactivity & Edit Fix
- **Fix Visibility:** After creating a test (`POST /api/diagnostic-tests`), update the local state array or invalidate the query cache so the new test appears immediately in the table.
- **Fix Edit Mode:**
  - Add an Edit action button to each row in the Test Catalog table.
  - Clicking pre-fills the Test Form modal with existing values (Name, Code, Department, Price, Sample Type, Parameters array / Radiology template HTML).
  - Submitting sends `PUT/PATCH /api/diagnostic-tests/:id` and updates the row in real-time.

---

## 4. Patient Master: Reactivity & Edit Fix
- **Fix Visibility & Mutability:**
  - Ensure `GET /api/patients` supports pagination, search, and sorting.
  - Implement full Edit modal triggered by a row action button.
  - Submitting sends `PUT/PATCH /api/patients/:id`, updates the state locally, and re-renders the updated patient row instantly.
