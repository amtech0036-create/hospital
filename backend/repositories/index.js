const env = require('../config/env');

/**
 * This is the ONLY file in the whole codebase that knows which storage
 * engine is active. Services import repositories from here, never from
 * backend/repositories/googlesheets/* or mongo/* directly.
 *
 * To switch storage engines, set DB_DRIVER in .env:
 *   googlesheets — Google Sheets (legacy)
 *   mongo        — MongoDB Atlas
 */
function buildMongoRepositories() {
  const UserRepository = require('./mongo/UserRepository');
  const CategoryRepository = require('./mongo/CategoryRepository');
  const BrandRepository = require('./mongo/BrandRepository');
  const UnitRepository = require('./mongo/UnitRepository');
  const ProductRepository = require('./mongo/ProductRepository');
  const ProductPriceHistoryRepository = require('./mongo/ProductPriceHistoryRepository');
  const StockTransactionRepository = require('./mongo/StockTransactionRepository');
  const CustomerRepository = require('./mongo/CustomerRepository');
  const SupplierRepository = require('./mongo/SupplierRepository');
  const CustomerTransactionRepository = require('./mongo/CustomerTransactionRepository');
  const SupplierTransactionRepository = require('./mongo/SupplierTransactionRepository');
  const SaleRepository = require('./mongo/SaleRepository');
  const SaleItemRepository = require('./mongo/SaleItemRepository');
  const PurchaseRepository = require('./mongo/PurchaseRepository');
  const PurchaseItemRepository = require('./mongo/PurchaseItemRepository');
  const ChallanRepository = require('./mongo/ChallanRepository');
  const ChallanItemRepository = require('./mongo/ChallanItemRepository');
  const PaymentRepository = require('./mongo/PaymentRepository');
  const ExpenseRepository = require('./mongo/ExpenseRepository');
  const EmployeeRepository = require('./mongo/EmployeeRepository');
  const SalaryRepository = require('./mongo/SalaryRepository');
  const SettingsRepository = require('./mongo/SettingsRepository');
  const SaleReturnRepository = require('./mongo/SaleReturnRepository');
  const SaleReturnItemRepository = require('./mongo/SaleReturnItemRepository');
  const PurchaseReturnRepository = require('./mongo/PurchaseReturnRepository');
  const PurchaseReturnItemRepository = require('./mongo/PurchaseReturnItemRepository');
  const DepartmentRepository = require('./mongo/DepartmentRepository');
  const AttendanceRepository = require('./mongo/AttendanceRepository');
  const LeaveRepository = require('./mongo/LeaveRepository');
  const AdvanceRepository = require('./mongo/AdvanceRepository');
  return {
    userRepository: new UserRepository(),
    categoryRepository: new CategoryRepository(),
    brandRepository: new BrandRepository(),
    unitRepository: new UnitRepository(),
    productRepository: new ProductRepository(),
    productPriceHistoryRepository: new ProductPriceHistoryRepository(),
    stockTransactionRepository: new StockTransactionRepository(),
    customerRepository: new CustomerRepository(),
    supplierRepository: new SupplierRepository(),
    customerTransactionRepository: new CustomerTransactionRepository(),
    supplierTransactionRepository: new SupplierTransactionRepository(),
    saleRepository: new SaleRepository(),
    saleItemRepository: new SaleItemRepository(),
    purchaseRepository: new PurchaseRepository(),
    purchaseItemRepository: new PurchaseItemRepository(),
    challanRepository: new ChallanRepository(),
    challanItemRepository: new ChallanItemRepository(),
    paymentRepository: new PaymentRepository(),
    expenseRepository: new ExpenseRepository(),
    employeeRepository: new EmployeeRepository(),
    salaryRepository: new SalaryRepository(),
    settingsRepository: new SettingsRepository(),
    saleReturnRepository: new SaleReturnRepository(),
    saleReturnItemRepository: new SaleReturnItemRepository(),
    purchaseReturnRepository: new PurchaseReturnRepository(),
    purchaseReturnItemRepository: new PurchaseReturnItemRepository(),
    departmentRepository: new DepartmentRepository(),
    attendanceRepository: new AttendanceRepository(),
    leaveRepository: new LeaveRepository(),
    advanceRepository: new AdvanceRepository()
  };
}

function buildGoogleSheetsRepositories() {
  const UserRepository = require('./googlesheets/UserRepository');
  const CategoryRepository = require('./googlesheets/CategoryRepository');
  const BrandRepository = require('./googlesheets/BrandRepository');
  const UnitRepository = require('./googlesheets/UnitRepository');
  const ProductRepository = require('./googlesheets/ProductRepository');
  const ProductPriceHistoryRepository = require('./googlesheets/ProductPriceHistoryRepository');
  const StockTransactionRepository = require('./googlesheets/StockTransactionRepository');
  const CustomerRepository = require('./googlesheets/CustomerRepository');
  const SupplierRepository = require('./googlesheets/SupplierRepository');
  const CustomerTransactionRepository = require('./googlesheets/CustomerTransactionRepository');
  const SupplierTransactionRepository = require('./googlesheets/SupplierTransactionRepository');
  const SaleRepository = require('./googlesheets/SaleRepository');
  const SaleItemRepository = require('./googlesheets/SaleItemRepository');
  const PurchaseRepository = require('./googlesheets/PurchaseRepository');
  const PurchaseItemRepository = require('./googlesheets/PurchaseItemRepository');
  const ChallanRepository = require('./googlesheets/ChallanRepository');
  const ChallanItemRepository = require('./googlesheets/ChallanItemRepository');
  const PaymentRepository = require('./googlesheets/PaymentRepository');
  const ExpenseRepository = require('./googlesheets/ExpenseRepository');
  const EmployeeRepository = require('./googlesheets/EmployeeRepository');
  const SalaryRepository = require('./googlesheets/SalaryRepository');
  const SettingsRepository = require('./googlesheets/SettingsRepository');
  const SaleReturnRepository = require('./googlesheets/SaleReturnRepository');
  const SaleReturnItemRepository = require('./googlesheets/SaleReturnItemRepository');
  const PurchaseReturnRepository = require('./googlesheets/PurchaseReturnRepository');
  const PurchaseReturnItemRepository = require('./googlesheets/PurchaseReturnItemRepository');
  const DepartmentRepository = require('./googlesheets/DepartmentRepository');
  const AttendanceRepository = require('./googlesheets/AttendanceRepository');
  const LeaveRepository = require('./googlesheets/LeaveRepository');
  const AdvanceRepository = require('./googlesheets/AdvanceRepository');
  return {
    userRepository: new UserRepository(),
    categoryRepository: new CategoryRepository(),
    brandRepository: new BrandRepository(),
    unitRepository: new UnitRepository(),
    productRepository: new ProductRepository(),
    productPriceHistoryRepository: new ProductPriceHistoryRepository(),
    stockTransactionRepository: new StockTransactionRepository(),
    customerRepository: new CustomerRepository(),
    supplierRepository: new SupplierRepository(),
    customerTransactionRepository: new CustomerTransactionRepository(),
    supplierTransactionRepository: new SupplierTransactionRepository(),
    saleRepository: new SaleRepository(),
    saleItemRepository: new SaleItemRepository(),
    purchaseRepository: new PurchaseRepository(),
    purchaseItemRepository: new PurchaseItemRepository(),
    challanRepository: new ChallanRepository(),
    challanItemRepository: new ChallanItemRepository(),
    paymentRepository: new PaymentRepository(),
    expenseRepository: new ExpenseRepository(),
    employeeRepository: new EmployeeRepository(),
    salaryRepository: new SalaryRepository(),
    settingsRepository: new SettingsRepository(),
    saleReturnRepository: new SaleReturnRepository(),
    saleReturnItemRepository: new SaleReturnItemRepository(),
    purchaseReturnRepository: new PurchaseReturnRepository(),
    purchaseReturnItemRepository: new PurchaseReturnItemRepository(),
    departmentRepository: new DepartmentRepository(),
    attendanceRepository: new AttendanceRepository(),
    leaveRepository: new LeaveRepository(),
    advanceRepository: new AdvanceRepository()
  };
}

function buildRepositories() {
  switch (env.DB_DRIVER) {
    case 'googlesheets':
      return buildGoogleSheetsRepositories();
    case 'mongo':
      return buildMongoRepositories();
    case 'mysql':
      throw new Error('MySQL driver is not implemented yet. Set DB_DRIVER=mongo or DB_DRIVER=googlesheets.');
    default:
      throw new Error(`Unknown DB_DRIVER: ${env.DB_DRIVER}`);
  }
}

module.exports = buildRepositories();
