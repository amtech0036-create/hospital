const bcrypt = require('bcryptjs');
const { settingsRepository, userRepository } = require('../repositories');

const SALT_ROUNDS = 10;

const SETTING_KEYS = [
  'companyName',
  'companyPhone',
  'companyEmail',
  'companyAddress',
  'currencySymbol',
  'invoiceFooterNote'
];

const DEFAULTS = {
  companyName: 'AM Tech Solutions BD',
  companyPhone: '+880 1736002401',
  companyEmail: '',
  companyAddress: 'Baraipara Bazar Ashulia Savar Dhaka',
  companyWebsite: 'https://amtechsolutionsbd.vercel.app/',
  currencySymbol: '৳',
  invoiceFooterNote: 'Thank you for your business.'
};

class SettingsService {
  async getAll() {
    const stored = await settingsRepository.getAllAsMap();
    return { ...DEFAULTS, ...stored };
  }

  async update(input) {
    const updates = {};
    for (const key of SETTING_KEYS) {
      if (input[key] !== undefined) {
        updates[key] = String(input[key]).trim();
      }
    }
    if (Object.keys(updates).length === 0) {
      const err = new Error('No valid settings provided.');
      err.status = 422;
      throw err;
    }
    for (const [key, value] of Object.entries(updates)) {
      await settingsRepository.upsert(key, value);
    }
    return this.getAll();
  }
}

class UserService {
  _sanitize(user) {
    const { passwordHash, ...safe } = user;
    return safe;
  }

  async list() {
    const users = await userRepository.findAll();
    return users.map((u) => this._sanitize(u)).sort((a, b) => a.name.localeCompare(b.name));
  }

  async getById(id) {
    const user = await userRepository.findById(id);
    if (!user) {
      const err = new Error('User not found.');
      err.status = 404;
      throw err;
    }
    return this._sanitize(user);
  }

  async create({ name, email, password, role }) {
    const existing = await userRepository.findByEmail(email);
    if (existing) {
      const err = new Error('A user with this email already exists.');
      err.status = 409;
      throw err;
    }
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await userRepository.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role,
      status: 'Active'
    });
    return this._sanitize(user);
  }

  async update(id, input, { currentUserId } = {}) {
    await this.getById(id);
    const payload = {};
    if (input.name !== undefined) payload.name = input.name.trim();
    if (input.email !== undefined) payload.email = input.email.toLowerCase().trim();
    if (input.role !== undefined) payload.role = input.role;
    if (input.status !== undefined) payload.status = input.status;

    if (input.email) {
      const existing = await userRepository.findByEmail(input.email);
      if (existing && existing.id !== id) {
        const err = new Error('A user with this email already exists.');
        err.status = 409;
        throw err;
      }
    }

    if (input.status === 'Inactive' && id === currentUserId) {
      const err = new Error('You cannot deactivate your own account.');
      err.status = 422;
      throw err;
    }

    if (input.password) {
      payload.passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    }

    const updated = await userRepository.update(id, payload);
    return this._sanitize(updated);
  }

  async deactivate(id, { currentUserId } = {}) {
    if (id === currentUserId) {
      const err = new Error('You cannot deactivate your own account.');
      err.status = 422;
      throw err;
    }
    await this.getById(id);
    return userRepository.delete(id);
  }
}

module.exports = {
  SettingsService: new SettingsService(),
  UserService: new UserService(),
  SETTING_KEYS,
  DEFAULTS
};
