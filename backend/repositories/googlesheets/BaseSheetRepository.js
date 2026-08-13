const { getSheetsClient, getSpreadsheetId } = require('../../config/googleSheetsClient');
const { generateId, extractSequence } = require('../../utils/idGenerator');
const logger = require('../../utils/logger');

/**
 * Generic CRUD repository backed by a single Google Sheets tab.
 *
 * Every sheet is treated as a table:
 *   - Row 1 = column headers (must match `columns` exactly, in order)
 *   - Row 2+ = data
 *
 * This class implements the IRepository contract (see ../interfaces/IRepository.js).
 * Subclasses (UserRepository, etc.) only add domain-specific query helpers —
 * they never talk to the Sheets API directly.
 */
class BaseSheetRepository {
  /**
   * @param {string} sheetName - exact tab name in the spreadsheet, e.g. "Users"
   * @param {string[]} columns - ordered column headers, e.g. ["id","name","email",...]
   * @param {string} idPrefix - prefix used for generated IDs, e.g. "USR"
   * @param {string} idColumn - name of the column holding the record's unique ID
   */
  constructor(sheetName, columns, idPrefix, idColumn = 'id') {
    this.sheetName = sheetName;
    this.columns = columns;
    this.idPrefix = idPrefix;
    this.idColumn = idColumn;
  }

  async _client() {
    const sheets = await getSheetsClient();
    return { sheets, spreadsheetId: getSpreadsheetId() };
  }

  _range(a1 = 'A:ZZ') {
    return `${this.sheetName}!${a1}`;
  }

  _rowToObject(row) {
    const obj = {};
    this.columns.forEach((col, i) => {
      obj[col] = row[i] !== undefined ? row[i] : '';
    });
    return obj;
  }

  _objectToRow(obj) {
    return this.columns.map((col) => (obj[col] !== undefined && obj[col] !== null ? obj[col] : ''));
  }

  /** Returns { headerRow, dataRows, rowsWithSheetIndex } where
   *  rowsWithSheetIndex[i].sheetRow is the 1-based row number in the sheet
   *  (needed for update/delete range targeting). */
  async _readAll() {
    const { sheets, spreadsheetId } = await this._client();
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: this._range()
    });

    const values = result.data.values || [];
    if (values.length === 0) {
      return [];
    }

    // values[0] is assumed to be the header row and is skipped.
    const dataRows = values.slice(1);

    return dataRows.map((row, idx) => ({
      sheetRow: idx + 2, // +2 = skip header row, convert to 1-based
      data: this._rowToObject(row)
    }));
  }

  async findAll(filter = {}) {
    const rows = await this._readAll();
    const filterKeys = Object.keys(filter);
    if (filterKeys.length === 0) return rows.map((r) => r.data);

    return rows
      .filter((r) => filterKeys.every((k) => String(r.data[k]) === String(filter[k])))
      .map((r) => r.data);
  }

  async findById(id) {
    const rows = await this._readAll();
    const found = rows.find((r) => r.data[this.idColumn] === id);
    return found ? found.data : null;
  }

  async findOne(filter) {
    const results = await this.findAll(filter);
    return results[0] || null;
  }

  async _nextSequence() {
    const rows = await this._readAll();
    const max = rows.reduce((acc, r) => Math.max(acc, extractSequence(r.data[this.idColumn])), 0);
    return max;
  }

  /** Subclasses may override to customize ID assignment. */
  async _assignId(record) {
    const nextSeq = await this._nextSequence();
    record[this.idColumn] = generateId(this.idPrefix, nextSeq);
  }

  /**
   * Creates a record. If `data` does not already include an ID for
   * `idColumn`, one is generated automatically using idPrefix.
   */
  async create(data) {
    const { sheets, spreadsheetId } = await this._client();

    const record = { ...data };
    if (!record[this.idColumn]) {
      await this._assignId(record);
    }
    if (!record.createdAt) record.createdAt = new Date().toISOString();
    record.updatedAt = new Date().toISOString();

    const row = this._objectToRow(record);

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: this._range(),
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [row] }
    });

    logger.info(`Created record in ${this.sheetName}: ${record[this.idColumn]}`);
    return record;
  }

  async update(id, data) {
    const rows = await this._readAll();
    const target = rows.find((r) => r.data[this.idColumn] === id);
    if (!target) return null;

    const updated = { ...target.data, ...data, updatedAt: new Date().toISOString() };
    const row = this._objectToRow(updated);

    const { sheets, spreadsheetId } = await this._client();
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: this._range(`A${target.sheetRow}:ZZ${target.sheetRow}`),
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] }
    });

    logger.info(`Updated record in ${this.sheetName}: ${id}`);
    return updated;
  }

  /**
   * Soft delete by default (sets Status = "Inactive") — accounting/inventory
   * data should generally never be hard-deleted. Pass { hard: true } to
   * actually clear the row when a sheet genuinely has no Status column.
   */
  async delete(id, { hard = false } = {}) {
    if (!hard && this.columns.includes('status')) {
      const result = await this.update(id, { status: 'Inactive' });
      return !!result;
    }

    const rows = await this._readAll();
    const target = rows.find((r) => r.data[this.idColumn] === id);
    if (!target) return false;

    const { sheets, spreadsheetId } = await this._client();
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: this._range(`A${target.sheetRow}:ZZ${target.sheetRow}`)
    });

    logger.info(`Deleted record from ${this.sheetName}: ${id}`);
    return true;
  }
}

module.exports = BaseSheetRepository;
