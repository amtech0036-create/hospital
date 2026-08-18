# Inventory, Sales, Purchase, Accounting & HR Payroll ERP System

A complete Multi-Tenant Enterprise Resource Planning (ERP) System built with Node.js, Express, MongoDB Atlas, and modern web frontend.

---

## 🚀 Key Modules & Current Features

### 1. 🏢 Multi-Tenant & Super Admin Management
- **Tenant Isolation**: Separate data per business/store tenant.
- **SuperAdmin Dashboard**: Manage business accounts, subdomains, user limits, and subscription tiers.
- **Role-Based Access Control (RBAC)**: Admin, Manager, Sales User, Accountant, HR Manager roles.

### 2. 📦 Inventory & Product Catalog Management
- **Products Catalog**: Full CRUD for items, SKU, Barcode, Purchasing & Selling prices.
- **Categories, Brands & Units**: Group products by Category, Brand, and measurement Units (kg, pcs, box, etc.).
- **Stock Tracking**: Live stock calculation, stock entry/deduction history, and low-stock alerts.

### 3. 🛍️ Sales & Customer Management
- **Invoice & Sales Processing**: Create sales with multi-item lists, discount, tax, and automated stock deductions.
- **Delivery Challans**: Generate and track product delivery challans linked to sales.
- **Sales Returns & Cancellations**: Handle customer returns with automatic stock restoration and balance adjustments.
- **Customer Directory & Ledgers**: Manage customer records, transaction histories, credit/debit balances, and payments.

### 4. 🛒 Purchase & Supplier Management
- **Purchase Orders**: Record inventory purchases from suppliers with purchase item details.
- **Purchase Returns & Cancellations**: Handle purchase returns to suppliers and adjust stock levels accordingly.
- **Supplier Directory & Ledgers**: Complete supplier profiles, purchase logs, outstanding balance tracking, and payments.

### 5. 💰 Accounting, Expenses & Payments
- **Standalone Payments**: Receive payments from customers or disburse payments to suppliers outside direct sales/purchases.
- **Expense Tracking**: Categorize daily operational expenses with payment methods and reference IDs.
- **Financial Summaries**: Dashboard KPI cards for total sales, purchases, expenses, and pending balances.

### 6. 👥 HR, Attendance & Payroll Management
- **Employee Directory**: Manage staff profiles, designations, joining dates, basic salary, and assigned departments.
- **Departments & Work Shifts**: Organize personnel by departments and configure shift schedules.
- **Leave Management**: Submit, approve, or reject employee leave requests.
- **Salary Advances**: Track employee loan/salary advance requests and automated deductions.
- **Attendance & Biometric Integration**: Track manual daily attendance and integrate with biometric attendance devices.
- **Payroll Processing**: Automated monthly salary calculation considering basic pay, leave deductions, advance repayments, and bonuses.

### 7. 🔒 System Security, Backup & Settings
- **JWT Authentication**: Secure login with JWT token authorization and password hashing (`bcryptjs`).
- **Database Backup & Drive Integration**: Automated and manual database backups to Google Drive.
- **System Settings**: Configurable shop title, currency symbols, tax defaults, and branding.

---

## 📂 Documentation Files

- [`README.md`](file:///d:/AMTechSolutions/ERP/project/README.md) – Overview & Features list
- [`docs/architecture.md`](file:///d:/AMTechSolutions/ERP/project/docs/architecture.md) – System Architecture & Repository Pattern
- [`docs/database-schema.md`](file:///d:/AMTechSolutions/ERP/project/docs/database-schema.md) – Database Schemas & Data Structures
- [`docs/DEPLOY.md`](file:///d:/AMTechSolutions/ERP/project/docs/DEPLOY.md) – Deployment & Hosting Setup Guide

---

## 🛠️ Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment Variables**
   Set up your `.env` file (refer to `.env.example`).

3. **Start Development Server**
   ```bash
   npm run dev
   ```
   Access the web app at `http://localhost:4000`.
