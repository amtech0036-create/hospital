const BaseMongoRepository = require('./BaseMongoRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id', 'name', 'phone', 'email', 'address', 'designation', 'joinDate',
  'salary', 'status', 'note', 'createdAt', 'updatedAt'
];

class EmployeeRepository extends BaseMongoRepository {
  constructor() {
    super('employees', COLUMNS, ID_PREFIXES.EMPLOYEE, 'id');
  }
}

module.exports = EmployeeRepository;
