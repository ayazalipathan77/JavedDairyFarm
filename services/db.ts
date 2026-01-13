import { Customer, MilkEntry, LedgerTransaction, AppData } from '../types';

const DB_NAME = 'JavedDairyDB';
const DB_VERSION = 1;

class DBService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains('customers')) {
          db.createObjectStore('customers', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('entries')) {
          const store = db.createObjectStore('entries', { keyPath: 'id' });
          store.createIndex('customerId', 'customerId', { unique: false });
          store.createIndex('date', 'date', { unique: false });
        }
        if (!db.objectStoreNames.contains('transactions')) {
          const store = db.createObjectStore('transactions', { keyPath: 'id' });
          store.createIndex('date', 'date', { unique: false });
          store.createIndex('customerId', 'customerId', { unique: false });
        }
      };
    });
  }

  private getStore(storeName: string, mode: IDBTransactionMode): IDBObjectStore {
    if (!this.db) throw new Error("Database not initialized");
    return this.db.transaction(storeName, mode).objectStore(storeName);
  }

  // --- Generic Helpers ---

  async getAll<T>(storeName: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const request = this.getStore(storeName, 'readonly').getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async add<T>(storeName: string, item: T): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = this.getStore(storeName, 'readwrite').put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName: string, id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = this.getStore(storeName, 'readwrite').delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Specific Methods ---

  async getCustomers(): Promise<Customer[]> {
    await this.ensureInit();
    return this.getAll<Customer>('customers');
  }

  async saveCustomer(customer: Customer): Promise<void> {
    await this.ensureInit();
    return this.add('customers', customer);
  }

  async getEntries(date?: string): Promise<MilkEntry[]> {
    await this.ensureInit();
    const all = await this.getAll<MilkEntry>('entries');
    if (date) {
      return all.filter(e => e.date === date);
    }
    return all;
  }

  async getEntriesByCustomer(customerId: string): Promise<MilkEntry[]> {
    await this.ensureInit();
    const all = await this.getAll<MilkEntry>('entries');
    return all.filter(e => e.customerId === customerId);
  }

  async saveEntry(entry: MilkEntry): Promise<void> {
    await this.ensureInit();
    return this.add('entries', entry);
  }

  async deleteEntry(id: string): Promise<void> {
    await this.ensureInit();
    return this.delete('entries', id);
  }

  async getTransactions(): Promise<LedgerTransaction[]> {
    await this.ensureInit();
    return this.getAll<LedgerTransaction>('transactions');
  }

  async saveTransaction(tx: LedgerTransaction): Promise<void> {
    await this.ensureInit();
    return this.add('transactions', tx);
  }

  async deleteTransaction(id: string): Promise<void> {
    await this.ensureInit();
    return this.delete('transactions', id);
  }

  // --- Backup/Restore ---

  async exportData(): Promise<string> {
    await this.ensureInit();
    const customers = await this.getAll<Customer>('customers');
    const entries = await this.getAll<MilkEntry>('entries');
    const transactions = await this.getAll<LedgerTransaction>('transactions');
    
    const data: AppData = { customers, entries, transactions };
    return JSON.stringify(data, null, 2);
  }

  async importData(jsonString: string): Promise<void> {
    await this.ensureInit();
    try {
      const data = JSON.parse(jsonString);
      
      if (!data || typeof data !== 'object') {
        throw new Error("Invalid data structure");
      }

      const tx = this.db!.transaction(['customers', 'entries', 'transactions'], 'readwrite');
      
      // Clear existing data
      tx.objectStore('customers').clear();
      tx.objectStore('entries').clear();
      tx.objectStore('transactions').clear();

      // Add new data (with safety checks for arrays)
      if (Array.isArray(data.customers)) {
        data.customers.forEach((c: any) => tx.objectStore('customers').put(c));
      }
      if (Array.isArray(data.entries)) {
        data.entries.forEach((e: any) => tx.objectStore('entries').put(e));
      }
      if (Array.isArray(data.transactions)) {
        data.transactions.forEach((t: any) => tx.objectStore('transactions').put(t));
      }

      return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(new Error("Transaction aborted"));
      });
    } catch (e) {
      console.error("Backup import error:", e);
      throw new Error("Invalid backup file format");
    }
  }

  private async ensureInit() {
    if (!this.db) {
      await this.init();
    }
  }
}

export const dbService = new DBService();