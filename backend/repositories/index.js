const env = require('../config/env');

/**
 * This is the ONLY file in the whole codebase that knows which storage
 * engine is active. Services import repositories from here, never from
 * backend/repositories/googlesheets/* directly.
 *
 * To migrate to MySQL later:
 *   1. Create backend/repositories/mysql/UserRepository.js etc.,
 *      implementing the same methods as the Google Sheets versions.
 *   2. Add a case for 'mysql' below.
 *   3. Set DB_DRIVER=mysql in .env.
 * Nothing in services/ or controllers/ needs to change.
 */
function buildRepositories() {
  switch (env.DB_DRIVER) {
    case 'googlesheets': {
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
        purchaseReturnItemRepository: new PurchaseReturnItemRepository()
      };
    }
    case 'mysql':
      throw new Error('MySQL driver is not implemented yet. Set DB_DRIVER=googlesheets.');
    default:
      throw new Error(`Unknown DB_DRIVER: ${env.DB_DRIVER}`);
  }
}

module.exports = buildRepositories();
