const { expenseRepository } = require('../repositories');

const EXPENSE_CATEGORIES = [
  'Daily Lunch Bill',
  'Snacks Bill',
  'Office Rent',
  'Kitchen Items Buying Bill',
  'Others'
];

const PAYMENT_METHODS = ['Cash', 'Bank'];

class ExpenseService {
  async list({ category, from, to } = {}) {
    let expenses = await expenseRepository.findAll();
    if (category) expenses = expenses.filter((e) => e.category === category);
    if (from) {
      const fromDate = new Date(from);
      expenses = expenses.filter((e) => new Date(e.expenseDate) >= fromDate);
    }
    if (to) {
      const toDate = new Date(to);
      expenses = expenses.filter((e) => new Date(e.expenseDate) <= toDate);
    }
    expenses.sort((a, b) => new Date(b.expenseDate) - new Date(a.expenseDate));
    return expenses;
  }

  async getById(id) {
    const expense = await expenseRepository.findById(id);
    if (!expense) {
      const err = new Error('Expense not found.');
      err.status = 404;
      throw err;
    }
    return expense;
  }

  async create(input, { createdBy } = {}) {
    const { category, amount, paymentMethod = 'Cash', note = '', expenseDate } = input;

    if (!EXPENSE_CATEGORIES.includes(category)) {
      const err = new Error(`category must be one of: ${EXPENSE_CATEGORIES.join(', ')}`);
      err.status = 422;
      throw err;
    }
    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      const err = new Error(`paymentMethod must be one of: ${PAYMENT_METHODS.join(', ')}`);
      err.status = 422;
      throw err;
    }

    const amt = parseFloat(amount);
    if (!(amt > 0)) {
      const err = new Error('amount must be a positive number.');
      err.status = 422;
      throw err;
    }

    if (category === 'Others' && !String(note).trim()) {
      const err = new Error('Please add a note describing this expense when category is Others.');
      err.status = 422;
      throw err;
    }

    return expenseRepository.create({
      category,
      amount: amt,
      paymentMethod,
      note: String(note).trim(),
      expenseDate: expenseDate || new Date().toISOString(),
      createdBy: createdBy || 'unknown'
    });
  }
}

module.exports = new ExpenseService();
module.exports.EXPENSE_CATEGORIES = EXPENSE_CATEGORIES;
module.exports.PAYMENT_METHODS = PAYMENT_METHODS;
