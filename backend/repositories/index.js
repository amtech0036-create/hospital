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
const DeviceRepository = require('./mongo/DeviceRepository');
const ShiftRepository = require('./mongo/ShiftRepository');
const BiometricEmployeeRepository = require('./mongo/BiometricEmployeeRepository');

module.exports = {
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
  advanceRepository: new AdvanceRepository(),
  deviceRepository: new DeviceRepository(),
  shiftRepository: new ShiftRepository(),
  biometricEmployeeRepository: new BiometricEmployeeRepository()
};
