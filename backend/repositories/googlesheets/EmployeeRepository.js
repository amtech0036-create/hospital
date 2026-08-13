const BaseSheetRepository = require('./BaseSheetRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id',
  'name',
  'phone',
  'email',
  'address',
  'designation',
  'joinDate',
  'salary',
  'status',
  'note',
  'createdAt',
  'updatedAt'
];

class EmployeeRepository extends BaseSheetRepository {
  constructor() {
    super('Employees', COLUMNS, ID_PREFIXES.EMPLOYEE, 'id');
  }
}

module.exports = EmployeeRepository;
