const BaseMongoRepository = require('./BaseMongoRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id', 'name', 'email', 'passwordHash', 'role', 'status', 'createdAt', 'updatedAt'
];

class UserRepository extends BaseMongoRepository {
  constructor() {
    super('users', COLUMNS, ID_PREFIXES.USER, 'id');
  }

  async findByEmail(email) {
    return this.findOne({ email: email.toLowerCase() });
  }
}

module.exports = UserRepository;
