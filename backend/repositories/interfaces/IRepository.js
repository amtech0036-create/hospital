/**
 * This file is documentation-as-code. It defines the contract every
 * repository must implement for storage engines.
 *
 * Services depend ONLY on this shape. They receive repository instances
 * (see backend/repositories/index.js) that satisfy this contract.
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
