const { getCollection } = require('../../config/mongoClient');
const { generateId, extractSequence } = require('../../utils/idGenerator');
const { getCurrentTenantId } = require('../../context/tenantContext');
const logger = require('../../utils/logger');

/**
 * Generic CRUD repository backed by a MongoDB collection.
 * Supports automatic multi-tenant data isolation via tenantId scoping.
 */
class BaseMongoRepository {
  /**
   * @param {string} collectionName - MongoDB collection name, e.g. "users"
   * @param {string[]} columns - document field names (same as sheet columns)
   * @param {string} idPrefix - prefix for generated IDs, e.g. "USR"
   * @param {string} idColumn - field holding the record's unique ID
   */
  constructor(collectionName, columns, idPrefix, idColumn = 'id') {
    this.collectionName = collectionName;
    this.columns = columns;
    this.idPrefix = idPrefix;
    this.idColumn = idColumn;
  }

  async _collection() {
    return getCollection(this.collectionName);
  }

  _toDocument(obj) {
    const doc = {};
    this.columns.forEach((col) => {
      doc[col] = obj[col] !== undefined && obj[col] !== null ? obj[col] : '';
    });
    return doc;
  }

  _fromDocument(doc) {
    if (!doc) return null;
    const { _id, ...rest } = doc;
    return this._toDocument(rest);
  }

  _buildQuery(filter = {}) {
    const query = { ...filter };
    const tenantId = getCurrentTenantId();
    if (this.columns.includes('tenantId') && tenantId && filter.tenantId === undefined) {
      query.tenantId = tenantId;
    }
    return query;
  }

  async findAll(filter = {}) {
    const col = await this._collection();
    const docs = await col.find(this._buildQuery(filter)).toArray();
    return docs.map((d) => this._fromDocument(d));
  }

  async findById(id) {
    const col = await this._collection();
    const query = { [this.idColumn]: id };
    const tenantId = getCurrentTenantId();
    if (this.columns.includes('tenantId') && tenantId) {
      query.tenantId = tenantId;
    }
    const doc = await col.findOne(query);
    return this._fromDocument(doc);
  }

  async findOne(filter) {
    const col = await this._collection();
    const doc = await col.findOne(this._buildQuery(filter));
    return this._fromDocument(doc);
  }

  async count(filter = {}) {
    const col = await this._collection();
    return col.countDocuments(this._buildQuery(filter));
  }

  async _nextSequence() {
    const col = await this._collection();
    const regex = new RegExp(`^${this.idPrefix}-\\d+$`);
    // Query without tenantId filter so generated IDs are globally unique
    const docs = await col
      .find({ [this.idColumn]: regex })
      .project({ [this.idColumn]: 1 })
      .toArray();
    return docs.reduce((acc, d) => Math.max(acc, extractSequence(d[this.idColumn])), 0);
  }

  async _assignId(record) {
    const nextSeq = await this._nextSequence();
    record[this.idColumn] = generateId(this.idPrefix, nextSeq);
  }

  async create(data) {
    const col = await this._collection();
    const record = { ...data };

    if (this.columns.includes('tenantId') && !record.tenantId) {
      const tenantId = getCurrentTenantId();
      if (tenantId) record.tenantId = tenantId;
    }

    if (!record[this.idColumn]) {
      await this._assignId(record);
    }
    if (!record.createdAt) record.createdAt = new Date().toISOString();
    record.updatedAt = new Date().toISOString();

    const doc = this._toDocument(record);
    await col.insertOne(doc);

    logger.info(`Created record in ${this.collectionName}: ${record[this.idColumn]} (Tenant: ${record.tenantId || 'global'})`);
    return record;
  }

  async update(id, data) {
    const col = await this._collection();
    const query = { [this.idColumn]: id };
    const tenantId = getCurrentTenantId();
    if (this.columns.includes('tenantId') && tenantId) {
      query.tenantId = tenantId;
    }
    const existing = await col.findOne(query);
    if (!existing) return null;

    const merged = { ...this._fromDocument(existing), ...data, updatedAt: new Date().toISOString() };
    const doc = this._toDocument(merged);

    await col.replaceOne({ [this.idColumn]: id }, doc);
    logger.info(`Updated record in ${this.collectionName}: ${id}`);
    return merged;
  }

  async delete(id, { hard = false } = {}) {
    if (!hard && this.columns.includes('status')) {
      const result = await this.update(id, { status: 'Inactive' });
      return !!result;
    }

    const col = await this._collection();
    const query = { [this.idColumn]: id };
    const tenantId = getCurrentTenantId();
    if (this.columns.includes('tenantId') && tenantId) {
      query.tenantId = tenantId;
    }
    const result = await col.deleteOne(query);
    if (result.deletedCount > 0) {
      logger.info(`Deleted record from ${this.collectionName}: ${id}`);
      return true;
    }
    return false;
  }
}

module.exports = BaseMongoRepository;
