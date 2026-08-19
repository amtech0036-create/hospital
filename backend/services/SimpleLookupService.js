/**
 * Generic CRUD business logic for simple lookup tables (Categories, Brands,
 * Units). Each still gets its own thin subclass so validators/controllers
 * import a clearly-named service, and so any table-specific rule can be
 * added later without disturbing the others.
 */
class SimpleLookupService {
  constructor(repository, entityLabel) {
    this.repository = repository;
    this.entityLabel = entityLabel;
  }

  async list({ status } = {}) {
    return this.repository.findAll(status ? { status } : {});
  }

  async getById(id) {
    const record = await this.repository.findById(id);
    if (!record) {
      const err = new Error(`${this.entityLabel} not found.`);
      err.status = 404;
      throw err;
    }
    return record;
  }

  async create(data) {
    const existing = await this.repository.findOne({ name: data.name });
    if (existing) {
      const err = new Error(`A ${this.entityLabel.toLowerCase()} named "${data.name}" already exists.`);
      err.status = 409;
      throw err;
    }
    return this.repository.create({ ...data, status: data.status || 'Active' });
  }

  async update(id, data) {
    await this.getById(id); // throws 404 if missing
    return this.repository.update(id, data);
  }

  async remove(id) {
    await this.getById(id);
    return this.repository.delete(id); // soft delete (status = Inactive)
  }
}

module.exports = SimpleLookupService;
