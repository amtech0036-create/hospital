const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { userRepository } = require('../repositories');

const { getCurrentTenant } = require('../context/tenantContext');

const SALT_ROUNDS = 10;

class AuthService {
  async _enforceUserLimitGuard() {
    const tenant = getCurrentTenant();
    if (!tenant) return;
    const activeUsersCount = await userRepository.count({ status: 'Active' });
    const maxUsers = tenant.maxUsers || 15;
    if (activeUsersCount >= maxUsers) {
      const err = new Error(`User limit reached for current license tier (Tier ${tenant.licenseTier || 1}: max ${maxUsers} users).`);
      err.status = 403;
      throw err;
    }
  }

  async register({ name, email, password, role }) {
    await this._enforceUserLimitGuard();

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

  async login({ email, password }) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      const err = new Error('Invalid email or password.');
      err.status = 401;
      throw err;
    }

    if (user.status !== 'Active') {
      const err = new Error('This account is inactive. Contact an administrator.');
      err.status = 403;
      throw err;
    }

    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      const err = new Error('Invalid email or password.');
      err.status = 401;
      throw err;
    }

    const token = this._issueToken(user);
    return { token, user: this._sanitize(user) };
  }

  _issueToken(user) {
    return jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );
  }

  _sanitize(user) {
    const { passwordHash, ...safe } = user;
    return safe;
  }
}

module.exports = new AuthService();
