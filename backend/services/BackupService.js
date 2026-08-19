const repos = require('../repositories');

class BackupService {
  async exportJson({ tenantId } = {}) {
    const exportedAt = new Date().toISOString();
    const repoMap = {
      users: repos.userRepository,
      categories: repos.categoryRepository,
      brands: repos.brandRepository,
      units: repos.unitRepository,
      products: repos.productRepository,
      productPriceHistory: repos.productPriceHistoryRepository,
      stockTransactions: repos.stockTransactionRepository,
      customers: repos.customerRepository,
      suppliers: repos.supplierRepository,
      customerTransactions: repos.customerTransactionRepository,
      supplierTransactions: repos.supplierTransactionRepository,
      sales: repos.saleRepository,
      saleItems: repos.saleItemRepository,
      saleReturns: repos.saleReturnRepository,
      saleReturnItems: repos.saleReturnItemRepository,
      purchases: repos.purchaseRepository,
      purchaseItems: repos.purchaseItemRepository,
      purchaseReturns: repos.purchaseReturnRepository,
      purchaseReturnItems: repos.purchaseReturnItemRepository,
      challans: repos.challanRepository,
      challanItems: repos.challanItemRepository,
      payments: repos.paymentRepository,
      expenses: repos.expenseRepository,
      employees: repos.employeeRepository,
      salaries: repos.salaryRepository,
      settings: repos.settingsRepository,
      departments: repos.departmentRepository,
      attendance: repos.attendanceRepository,
      leaves: repos.leaveRepository,
      advances: repos.advanceRepository,
      devices: repos.deviceRepository,
      shifts: repos.shiftRepository,
      biometricEmployees: repos.biometricEmployeeRepository
    };

    const collections = {};

    for (const [key, repo] of Object.entries(repoMap)) {
      if (repo && typeof repo.findAll === 'function') {
        try {
          collections[key] = await repo.findAll({});
        } catch (err) {
          collections[key] = [];
        }
      }
    }

    return {
      exportedAt,
      tenantId: tenantId || 'default',
      collections
    };
  }
}

module.exports = new BackupService();
