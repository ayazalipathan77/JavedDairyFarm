/**
 * Parallel .DAT Backup Service
 * Writes all database operations to a .dat file for backup purposes
 * This runs alongside IndexedDB as a write-only backup
 */

import { AppData } from '../types';

class DATBackupService {
  private readonly STORAGE_KEY = 'javed_dairy_dat_backup';
  private readonly MAX_HISTORY = 100; // Keep last 100 operations

  /**
   * Write data to localStorage as .dat backup
   * Called after every successful IndexedDB write operation
   */
  async writeBackup(data: AppData): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      const backupData = {
        timestamp,
        data,
        version: 1
      };

      // Store in localStorage (acts as persistent .dat file)
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(backupData));

      // Also maintain operation history
      this.addToHistory(backupData);
    } catch (error) {
      console.error('DAT Backup write failed:', error);
      // Don't throw - backup failure shouldn't break main operations
    }
  }

  /**
   * Maintain history of operations
   */
  private addToHistory(backupData: any): void {
    try {
      const historyKey = `${this.STORAGE_KEY}_history`;
      const historyStr = localStorage.getItem(historyKey);
      const history = historyStr ? JSON.parse(historyStr) : [];

      // Add new entry
      history.push({
        timestamp: backupData.timestamp,
        recordCount: {
          customers: backupData.data.customers?.length || 0,
          entries: backupData.data.entries?.length || 0,
          transactions: backupData.data.transactions?.length || 0
        }
      });

      // Keep only last MAX_HISTORY entries
      if (history.length > this.MAX_HISTORY) {
        history.shift();
      }

      localStorage.setItem(historyKey, JSON.stringify(history));
    } catch (error) {
      console.error('History update failed:', error);
    }
  }

  /**
   * Read current backup data
   */
  async readBackup(): Promise<AppData | null> {
    try {
      const dataStr = localStorage.getItem(this.STORAGE_KEY);
      if (!dataStr) return null;

      const backup = JSON.parse(dataStr);
      return backup.data;
    } catch (error) {
      console.error('DAT Backup read failed:', error);
      return null;
    }
  }

  /**
   * Export backup as downloadable .dat file
   */
  async exportToFile(): Promise<Blob> {
    const dataStr = localStorage.getItem(this.STORAGE_KEY);
    if (!dataStr) {
      throw new Error('No backup data available');
    }

    // Create blob with timestamp
    const backup = JSON.parse(dataStr);
    const exportData = {
      ...backup,
      exportedAt: new Date().toISOString()
    };

    return new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/octet-stream'
    });
  }

  /**
   * Import from .dat file
   */
  async importFromFile(fileContent: string): Promise<AppData> {
    try {
      const backup = JSON.parse(fileContent);

      // Validate backup structure
      if (!backup.data || !backup.timestamp) {
        throw new Error('Invalid .dat backup file structure');
      }

      // Store as current backup
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
        timestamp: backup.timestamp,
        data: backup.data,
        version: backup.version || 1,
        restoredAt: new Date().toISOString()
      }));

      return backup.data;
    } catch (error) {
      console.error('DAT import failed:', error);
      throw new Error('Failed to import .dat backup file');
    }
  }

  /**
   * Get backup info
   */
  getBackupInfo(): { timestamp: string; recordCount: any } | null {
    try {
      const dataStr = localStorage.getItem(this.STORAGE_KEY);
      if (!dataStr) return null;

      const backup = JSON.parse(dataStr);
      return {
        timestamp: backup.timestamp,
        recordCount: {
          customers: backup.data.customers?.length || 0,
          entries: backup.data.entries?.length || 0,
          transactions: backup.data.transactions?.length || 0
        }
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Clear all backup data
   */
  async clearBackup(): Promise<void> {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(`${this.STORAGE_KEY}_history`);
  }
}

export const datBackupService = new DATBackupService();
