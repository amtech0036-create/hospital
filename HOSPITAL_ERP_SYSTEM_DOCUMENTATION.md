# Enterprise Hospital & Clinical Diagnostic Information System (HIS / LIS / RIS)
## System Overview & Production Operational Manual

---

## 1. Executive Summary & Architecture

This Enterprise Hospital ERP is an all-in-one **Hospital Information System (HIS)**, **Laboratory Information System (LIS)**, **Radiology Information System (RIS)**, and **Multi-Tenant Accounts & Inventory Platform**.

```
                           +-------------------------------------+
                           |      Universal Multi-Tenant API     |
                           |       (Express.js / Node.js)        |
                           +------------------+------------------+
                                              |
      +----------------------+----------------+----------------------+----------------------+
      |                      |                                 |                      |
+-----v------+        +------v-----+                    +------v-----+         +------v-----+
|   Patient  |        | Diagnostic |                    | Multi-Tenant|         | Super Admin|
| Directory  |        |  Billing   |                    | Workstation|         |   Portal   |
|  & UHID    |        | & Invoices |                    |   Scanner  |         |  Licenses  |
+------------+        +------------+                    +------------+         +------------+
```

### Key Technical Architecture Details
- **Backend Stack:** Node.js v18+, Express.js, MongoDB Atlas (MongoClient / AsyncLocalStorage for Tenant Isolation).
- **Frontend Stack:** Vanilla JS, Bootstrap 5.3, Bootstrap Icons, HTML5 Semantic Layouts.
- **Multi-Tenant Isolation:** `tenantId` auto-scoped via `AsyncLocalStorage` context (`runWithTenant`).
- **Database Target:** `Hospital_ERP_DB` on MongoDB Atlas.

---

## 2. Core Operational Modules

### A. Patient Directory & Universal Health Identifier (UHID) Master
- **Route:** `/patients.html`
- Automatically generates cryptographically unique, non-sequential UHIDs: `UHID-TNT-000001-YYYYMMDD-XXXX`.
- Quick-Add Patient modal from the billing workspace auto-selects the new patient without reloading the page.
- Real-time directory search by Name, Phone, or UHID with hard-deletion support.

### B. Diagnostic Billing & Invoice Processing
- **Route:** `/diagnostics-billing.html`
- Dynamic Patient and Referring Doctor search selectors.
- Searchable diagnostic test catalog lookup.
- Dynamic price tallying, tax calculations, and discount controls.
- **Single Header Master Barcode:** Printable customer bill prints **only one single master header Code128 barcode** (`INV-...`). Individual test barcodes are hidden to prevent billing sheet clutter.

### C. Universal Scanner Workstation & Modality Dispatch
- **Route:** `/diagnostics-scan.html`
- Global keypress listener debounce (15–30ms timing threshold) captures rapid automated USB/Bluetooth scanner inputs while preventing manual keyboard intercept clashes.
- **Modality Splitting:**
  - **Pathology (LIS):** On-demand printing for blood collection tube specimen barcodes (`SPEC-...`), phlebotomy sample collection logging, and tabular reference range entry with critical value alerts.
  - **Radiology (RIS):** Multi-planar MRI/CT/X-Ray patient queue with rich narrative report editing (`clinicalHistory`, `technique`, `findings`, `impression`).

### D. Pathologist & Radiologist Digital Authorization
- **Route:** `/diagnostics-approval.html`
- Doctor digital sign-off and authorization guard (`authorizeResult`).
- Report printing with printable letterhead header and digital doctor signature block.

### E. Referring Doctor Commission Ledger
- **Route:** `/diagnostics-analytics.html`
- Referral commission engine auto-calculates referring doctor earnings (Percentage or Fixed Fee).
- Doctor Payout ledger integration.

### F. SuperAdmin Tenant Portal & Tier Management
- **Route:** `/super-admin.html`
- Tier limits and license key generation:
  - **Starter / Clinic:** Max 25 Users
  - **Diagnostic Center:** Max 50 Users
  - **Hospital Standard:** Max 150 Users
  - **Enterprise:** Max 500 Users

---

## 3. Database Schema & Indexing

All collections enforce tenant isolation via `{ tenantId: 1 }` compound indexes:

| Collection | Key Indexes | Purpose |
| :--- | :--- | :--- |
| `tenants` | `{ subdomain: 1 }`, `{ id: 1 }` | Tenant business provisioning & license tracking |
| `patients` | `{ tenantId: 1, uhid: 1 }`, `{ tenantId: 1, phone: 1 }` | UHID & Patient Master Directory |
| `diagnostic_orders` | `{ tenantId: 1, invoiceNumber: 1 }`, `{ tenantId: 1, orderBarcode: 1 }` | Invoices & Barcode Order Lookups |
| `diagnostic_results` | `{ tenantId: 1, specimenBarcode: 1 }`, `{ tenantId: 1, department: 1, status: 1 }` | LIS / RIS Results & Specimen Tubes |
| `diagnostic_tests` | `{ tenantId: 1, code: 1 }` | Diagnostic Test Catalog Master |
| `doctors` | `{ tenantId: 1, name: 1 }` | Referring & Staff Doctor Directory |
| `users` | `{ tenantId: 1, email: 1 }` | RBAC Clinical & Admin Users |

---

## 4. Hardware & Scanner Integration Guide

### 1. USB & Bluetooth Barcode Scanner Configuration
- **Supported Barcode Types:** Code128, QR Code.
- **Scanner Mode:** Set scanner mode to `USB HID Keyboard` mode with a `CR` (Carriage Return / Enter) suffix.
- **Handling:** Built-in JS listener detects inputs under 30ms inter-character timing as automated scanner events.

### 2. Thermal Label Printer Configuration (50mm x 25mm / 2" x 1")
- **Supported Label Size:** 50mm width x 25mm height (Blood Collection Tubes & Specimen Trays).
- **Supported Output:** Standard HTML/CSS printable label view and ESC/POS raw command stream (`ThermalLabelPrinter.generateEscPosCommands`).

---

## 5. Production Operations & PM2 Cluster Commands

### Server Environment Variables (`.env`)
```env
PORT=4000
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=Hospital_ERP_DB
JWT_SECRET=production_secure_secret_key
```

### Seeding & Verification Commands
```bash
# Seed standard diagnostic test catalog (CBC, LFT, KFT, MRI, CT, X-Ray)
npm run seed:diagnostics

# Seed default tenant (TNT-000001 / default)
npm run seed:tenant

# Run Phase 11 & Phase 12 E2E verification test suites
npm run test:phase11
npm run verify:db
```

### PM2 Production Management Commands
```bash
# Launch PM2 Cluster Mode (4 Instances)
npx pm2 start ecosystem.config.js --env production

# Check Live PM2 Process Status
npx pm2 status

# View Cluster System Logs
npx pm2 logs hospital-erp

# Restart Cluster Instances
npx pm2 restart hospital-erp

# Stop & Remove PM2 Daemon
npx pm2 stop hospital-erp
npx pm2 delete hospital-erp
```
