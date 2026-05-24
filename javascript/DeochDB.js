/**
 * @module DeochDB
 * @description promise-based IndexedDB wrapper for DEOCH character persistence.
 * Provides asynchronous storage for large character objects and assets.
 */
export const DeochDB = {
    DB_NAME: 'deoch-db',
    VERSION: 1,
    STORES: {
        CHARACTERS: 'characters'
    },
    db: null,

    /**
     * Initializes the database and creates object stores if necessary.
     * @returns {Promise<IDBDatabase>}
     */
    async init() {
        if (this.db) return this.db;
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.VERSION);
            
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(this.STORES.CHARACTERS)) {
                    db.createObjectStore(this.STORES.CHARACTERS, { keyPath: 'id' });
                }
            };

            request.onsuccess = (e) => {
                this.db = e.target.result;
                console.log('DeochDB: Connection established.');
                resolve(this.db);
            };

            request.onerror = (e) => {
                console.error('DeochDB: Failed to open database', e.target.error);
                reject(e.target.error);
            };
        });
    },

    /**
     * Retrieves all records from a specified store.
     * @param {string} storeName - The name of the object store.
     * @returns {Promise<Array<Object>>} Resolved with an array of records.
     */
    async getAll(storeName) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Adds or updates a record in the store.
     * @param {string} storeName - The name of the object store.
     * @param {Object} data - The record object to persist (must contain keyPath matching property).
     * @returns {Promise<string>} Resolved with the key of the inserted/updated record.
     */
    async put(storeName, data) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Retrieves a single record by its key.
     * @param {string} storeName - The name of the object store.
     * @param {string} key - The unique identifier of the record.
     * @returns {Promise<Object|undefined>} Resolved with the record, or undefined if not found.
     */
    async get(storeName, key) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Deletes a record by its key.
     * @param {string} storeName - The name of the object store.
     * @param {string} key - The unique identifier of the record to delete.
     * @returns {Promise<void>} Resolved when the operation completes.
     */
    async delete(storeName, key) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Utility to clear a store entirely.
     * @param {string} storeName - The name of the object store.
     * @returns {Promise<void>} Resolved when the store is cleared.
     */
    async clear(storeName) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
};
