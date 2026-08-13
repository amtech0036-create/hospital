const {
  saleRepository,
  saleItemRepository,
  purchaseRepository,
  expenseRepository,
  salaryRepository,
  customerRepository,
  supplierRepository,
  customerTransactionRepository,
  supplierTransactionRepository,
  productRepository,
  stockTransactionRepository
} = require('../repositories');

function roundMoney(n) {
  return Math.round((parseFloat(n) || 0) * 100) / 100;
}

function inDateRange(isoDate, from, to) {
  if (!isoDate) return false;
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return false;
  if (from) {
    const start = new Date(from.includes('T') ? from : `${from}T00:00:00`);
    if (d < start) return false;
  }
  if (to) {
    const end = new Date(to.includes('T') ? to : `${to}T23:59:59.999`);
    if (d > end) return false;
  }
  return true;
}

function defaultRange() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const from = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
  const to = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return { from, to };
}

class ReportService {
  async getReport({ from, to } = {}) {
    const range = {
      from: from || defaultRange().from,
      to: to || defaultRange().to
    };

    const [
      sales,
      purchases,
      expenses,
      payroll,
      customerTxns,
      supplierTxns,
      products,
      stockByProduct,
      customers,
      suppliers,
      customerBalances,
      supplierBalances
    ] = await Promise.all([
      saleRepository.findAll({ status: 'Completed' }),
      purchaseRepository.findAll({ status: 'Completed' }),
      expenseRepository.findAll(),
      salaryRepository.findAll({ status: 'Paid' }),
      customerTransactionRepository.findAll(),
      supplierTransactionRepository.findAll(),
      productRepository.findAll({ status: 'Active' }),
      stockTransactionRepository.computeCurrentStockForAll(),
      customerRepository.findAll({ status: 'Active' }),
      supplierRepository.findAll({ status: 'Active' }),
      customerTransactionRepository.computeBalanceForAll(),
      supplierTransactionRepository.computeBalanceForAll()
    ]);

    const filteredSales = sales.filter((s) => inDateRange(s.saleDate, range.from, range.to));
    const filteredPurchases = purchases.filter((p) => inDateRange(p.purchaseDate, range.from, range.to));
    const filteredExpenses = expenses.filter((e) => inDateRange(e.expenseDate, range.from, range.to));
    const filteredPayroll = payroll.filter((p) => inDateRange(p.paidDate, range.from, range.to));

    const totalSales = filteredSales.reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0);
    const totalPurchases = filteredPurchases.reduce((sum, p) => sum + (parseFloat(p.total) || 0), 0);
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    const totalPayroll = filteredPayroll.reduce((sum, p) => sum + (parseFloat(p.netPay) || 0), 0);

    // Use ledger transactions as source of truth — covers manual ledger entries,
    // Accounts → Payments, and payments recorded on sales/purchases.
    const paymentsReceived = customerTxns
      .filter((t) => t.type === 'Payment Received' && inDateRange(t.transactionDate, range.from, range.to))
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    const paymentsPaid = supplierTxns
      .filter((t) => t.type === 'Payment Made' && inDateRange(t.transactionDate, range.from, range.to))
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

    let grossProfit = 0;
    for (const sale of filteredSales) {
      const items = await saleItemRepository.findBySale(sale.id);
      for (const item of items) {
        const qty = parseFloat(item.quantity) || 0;
        const revenue = parseFloat(item.lineTotal) || 0;
        const cost = qty * (parseFloat(item.unitCost) || 0);
        grossProfit += revenue - cost;
      }
      grossProfit -= parseFloat(sale.discount) || 0;
    }
    grossProfit = roundMoney(grossProfit);
    const netProfit = roundMoney(grossProfit - totalExpenses - totalPayroll);

    const expensesByCategory = {};
    for (const exp of filteredExpenses) {
      const cat = exp.category || 'Others';
      if (!expensesByCategory[cat]) expensesByCategory[cat] = { category: cat, count: 0, total: 0 };
      expensesByCategory[cat].count += 1;
      expensesByCategory[cat].total += parseFloat(exp.amount) || 0;
    }

    const salesByDayMap = {};
    for (const sale of filteredSales) {
      const day = new Date(sale.saleDate).toISOString().slice(0, 10);
      if (!salesByDayMap[day]) salesByDayMap[day] = { date: day, count: 0, total: 0 };
      salesByDayMap[day].count += 1;
      salesByDayMap[day].total += parseFloat(sale.total) || 0;
    }
    const salesByDay = Object.values(salesByDayMap)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({ ...d, total: roundMoney(d.total) }));

    const productStats = {};
    for (const sale of filteredSales) {
      const items = await saleItemRepository.findBySale(sale.id);
      for (const item of items) {
        const key = item.productId || item.productName;
        if (!productStats[key]) {
          productStats[key] = {
            productId: item.productId,
            productName: item.productName,
            quantity: 0,
            revenue: 0
          };
        }
        productStats[key].quantity += parseFloat(item.quantity) || 0;
        productStats[key].revenue += parseFloat(item.lineTotal) || 0;
      }
    }
    const topProducts = Object.values(productStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map((p) => ({ ...p, revenue: roundMoney(p.revenue) }));

    let stockValue = 0;
    for (const p of products) {
      const stock = stockByProduct[p.id] || 0;
      stockValue += stock * (parseFloat(p.purchasePrice) || 0);
    }

    const customerDue = customers.reduce((total, c) => total + Math.max(0, customerBalances[c.id] || 0), 0);
    const supplierDue = suppliers.reduce((total, s) => total + Math.max(0, supplierBalances[s.id] || 0), 0);

    return {
      range,
      sales: {
        count: filteredSales.length,
        total: roundMoney(totalSales)
      },
      purchases: {
        count: filteredPurchases.length,
        total: roundMoney(totalPurchases)
      },
      grossProfit,
      expenses: {
        count: filteredExpenses.length,
        total: roundMoney(totalExpenses),
        byCategory: Object.values(expensesByCategory)
          .map((c) => ({ ...c, total: roundMoney(c.total) }))
          .sort((a, b) => b.total - a.total)
      },
      payroll: {
        count: filteredPayroll.length,
        total: roundMoney(totalPayroll)
      },
      payments: {
        received: roundMoney(paymentsReceived),
        paid: roundMoney(paymentsPaid)
      },
      netProfit,
      salesByDay,
      topProducts,
      snapshots: {
        customerDue: roundMoney(customerDue),
        supplierDue: roundMoney(supplierDue),
        stockValue: roundMoney(stockValue)
      }
    };
  }
}

module.exports = new ReportService();
