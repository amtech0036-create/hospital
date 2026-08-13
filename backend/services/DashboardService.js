const {
  productRepository,
  stockTransactionRepository,
  customerRepository,
  supplierRepository,
  employeeRepository,
  customerTransactionRepository,
  supplierTransactionRepository,
  saleRepository
} = require('../repositories');
const SaleService = require('./SaleService');

class DashboardService {
  async getSummary() {
    const [products, stockByProduct, customers, suppliers, employees, customerBalances, supplierBalances, sales] =
      await Promise.all([
        productRepository.findAll({ status: 'Active' }),
        stockTransactionRepository.computeCurrentStockForAll(),
        customerRepository.findAll({ status: 'Active' }),
        supplierRepository.findAll({ status: 'Active' }),
        employeeRepository.findAll({ status: 'Active' }),
        customerTransactionRepository.computeBalanceForAll(),
        supplierTransactionRepository.computeBalanceForAll(),
        saleRepository.findAll({ status: 'Completed' })
      ]);

    let currentStockValue = 0;
    const lowStockProducts = [];

    for (const p of products) {
      const stock = stockByProduct[p.id] || 0;
      const cost = parseFloat(p.purchasePrice) || 0;
      currentStockValue += stock * cost;

      const minimum = parseFloat(p.minimumStock) || 0;
      if (stock <= minimum) {
        lowStockProducts.push({ id: p.id, name: p.name, currentStock: stock, minimumStock: minimum });
      }
    }

    const customerDue = customers.reduce((total, c) => total + Math.max(0, customerBalances[c.id] || 0), 0);
    const supplierDue = suppliers.reduce((total, s) => total + Math.max(0, supplierBalances[s.id] || 0), 0);

    const [recentPayments, todaysSales, todaysPurchases, grossProfit, recentSales] = await Promise.all([
      this._recentPayments(customers, suppliers),
      SaleService.sumForDate(),
      this._todaysPurchases(),
      SaleService.grossProfitForDate(),
      this._recentSales(sales, customers)
    ]);

    return {
      todaysSales,
      todaysCollection: await this._todaysCollection(),
      todaysPurchases,
      customerDue,
      supplierDue,
      currentStockValue,
      grossProfit,
      netProfit: grossProfit,
      totalProducts: products.length,
      totalCustomers: customers.length,
      totalSuppliers: suppliers.length,
      totalEmployees: employees.length,
      lowStockProducts,
      recentSales,
      recentPayments
    };
  }

  async _todaysPurchases() {
    const PurchaseService = require('./PurchaseService');
    return PurchaseService.sumForDate();
  }

  async _todaysCollection() {
    const all = await customerTransactionRepository.findAll();
    const today = new Date().toDateString();
    return all
      .filter((t) => t.type === 'Payment Received' && new Date(t.transactionDate).toDateString() === today)
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  }

  async _recentSales(sales, customers, limit = 10) {
    const customerNameById = Object.fromEntries(customers.map((c) => [c.id, c.name]));
    return sales
      .sort((a, b) => new Date(b.saleDate) - new Date(a.saleDate))
      .slice(0, limit)
      .map((s) => ({
        id: s.id,
        customerName: customerNameById[s.customerId] || s.customerId,
        total: s.total,
        date: s.saleDate
      }));
  }

  async _recentPayments(customers, suppliers, limit = 10) {
    const [customerTxns, supplierTxns] = await Promise.all([
      customerTransactionRepository.findAll(),
      supplierTransactionRepository.findAll()
    ]);

    const customerNameById = Object.fromEntries(customers.map((c) => [c.id, c.name]));
    const supplierNameById = Object.fromEntries(suppliers.map((s) => [s.id, s.name]));

    const receipts = customerTxns
      .filter((t) => t.type === 'Payment Received')
      .map((t) => ({
        direction: 'in',
        partyName: customerNameById[t.customerId] || t.customerId,
        amount: t.amount,
        date: t.transactionDate,
        note: t.note
      }));

    const payouts = supplierTxns
      .filter((t) => t.type === 'Payment Made')
      .map((t) => ({
        direction: 'out',
        partyName: supplierNameById[t.supplierId] || t.supplierId,
        amount: t.amount,
        date: t.transactionDate,
        note: t.note
      }));

    return [...receipts, ...payouts]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, limit);
  }
}

module.exports = new DashboardService();
