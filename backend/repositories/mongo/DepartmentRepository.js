const BaseMongoRepository = require('./BaseMongoRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id', 'name', 'code', 'managerId', 'description', 'status', 'createdAt', 'updatedAt'
];

class DepartmentRepository extends BaseMongoRepository {
  constructor() {
    super('departments', COLUMNS, ID_PREFIXES.DEPARTMENT, 'id');
  }
}

module.exports = DepartmentRepository;
