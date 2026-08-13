# Inventory, Sales, Purchase, Accounting & Payroll ERP

Phase 1: project skeleton, architecture, Google Sheets integration layer,
authentication, and dashboard shell. See `docs/architecture.md` for how the
layers fit together and `docs/database-schema.md` for the sheet structure.

## Prerequisites

- Node.js 18+
- A Google Cloud project with the **Google Sheets API** enabled
- A Google **Service Account** with a JSON key
- A Google Sheet, shared with the service account email (Editor access)

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create the Google Sheet**
   - Create a new Google Spreadsheet.
   - Add a tab named exactly `Users`.
   - In row 1, add these headers exactly, in this order:
     `id, name, email, passwordHash, role, status, createdAt, updatedAt`
   - Share the sheet with your service account's email as **Editor**.
   - Copy the Spreadsheet ID from the URL:
     `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Fill in:
   - `GOOGLE_SHEETS_SPREADSHEET_ID`
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY` (paste the full private key from the service
     account JSON, keeping the `\n` sequences literally as they appear in
     the JSON file)
   - `JWT_SECRET` (any long random string)

4. **Run the server**
   ```bash
   npm start
   ```
   The app serves both the API and the static frontend from
   `http://localhost:4000`.

5. **Create your first user**

   There's no signup UI yet (Admin creates users). Call the register
   endpoint directly, e.g. with curl:
   ```bash
   curl -X POST http://localhost:4000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"name":"Admin User","email":"admin@example.com","password":"changeme123","role":"Admin"}'
   ```

6. **Log in**

   Open `http://localhost:4000/login.html` and sign in with the account you
   just created.

## API endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /api/health | No | Health check |
| POST | /api/auth/register | No | Create a user |
| POST | /api/auth/login | No | Log in, returns JWT |
| GET | /api/auth/me | Yes | Current authenticated user |
| GET | /api/dashboard/summary | Yes | Dashboard stats |
| GET/POST | /api/sales | Yes | List / create sales (POST: Admin, Manager, Sales User) |
| GET | /api/sales/:id | Yes | Sale detail with line items |
| GET/POST | /api/purchases | Yes | List / create purchases (POST: Admin, Manager, Accountant) |
| GET | /api/purchases/:id | Yes | Purchase detail with line items |
| POST | /api/purchases/:id/return | Yes | Partial purchase return |
| POST | /api/purchases/:id/cancel | Yes | Cancel purchase (Admin, Manager) |
| GET/POST | /api/challans | Yes | Delivery challans |
| POST | /api/challans/:id/cancel | Yes | Cancel challan |
| GET/POST | /api/payments | Yes | Standalone customer/supplier payments |
| POST | /api/sales/:id/return | Yes | Partial sale return |
| POST | /api/sales/:id/cancel | Yes | Cancel sale (Admin, Manager) |

See route files under `backend/routes/` for the full list of Phase 1–5 endpoints.

## What's next

Phase 6 onward will add Expenses, Employees, Payroll, Reports, and Settings.

## Migrating to MySQL later

Only `backend/repositories/` changes. Add `backend/repositories/mysql/*`
implementing the same methods as the Google Sheets repositories, wire the
`'mysql'` case into `backend/repositories/index.js`, and set
`DB_DRIVER=mysql`. See `docs/architecture.md`.
