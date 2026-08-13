const BaseSheetRepository = require('./BaseSheetRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const USERS_COLUMNS = [
  'id',
  'name',
  'email',
  'passwordHash',
  'role',
  'status',
  'createdAt',
  'updatedAt'
];

class UserRepository extends BaseSheetRepository {
  constructor() {
    super('Users', USERS_COLUMNS, ID_PREFIXES.USER, 'id');
  }

  async findByEmail(email) {
    return this.findOne({ email: email.toLowerCase() });
  }
}

module.exports = UserRepository;
