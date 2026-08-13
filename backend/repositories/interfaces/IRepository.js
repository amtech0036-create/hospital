/**
 * This file is documentation-as-code. It defines the contract every
 * repository must implement, regardless of the underlying storage engine
 * (Google Sheets today, MySQL later).
 *
 * Services depend ONLY on this shape. They never import a Google Sheets
 * or MySQL specific class directly — they receive a repository instance
 * (see backend/repositories/index.js) that already satisfies this contract.
 *
 * Swapping storage engines later means writing a new repositories/mysql/*
 * folder that implements the same methods, then changing repositories/index.js
 * to pick it based on config.DB_DRIVER. Nothing in services/ or controllers/
 * has to change.
 *
 * interface IRepository<T> {
 *   findAll(filter?: object): Promise<T[]>
 *   findById(id: string): Promise<T | null>
 *   findOne(filter: object): Promise<T | null>
 *   create(data: object): Promise<T>
 *   update(id: string, data: object): Promise<T>
 *   delete(id: string): Promise<boolean>
 * }
 */
module.exports = {};
