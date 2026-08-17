const BaseSheetRepository = require('./BaseSheetRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id', 'name', 'code', 'managerId', 'description', 'status', 'createdAt', 'updatedAt'
];

class DepartmentRepository extends BaseSheetRepository {
  constructor() {
    super('Departments', COLUMNS, ID_PREFIXES.DEPARTMENT, 'id');
  }
}

module.exports = DepartmentRepository;
