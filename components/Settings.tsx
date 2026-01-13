import React, { useRef, useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { datBackupService } from '../services/datBackup';
import { Download, Upload, Database, CheckCircle, AlertTriangle } from 'lucide-react';

export default function AppSettings() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [backupInfo, setBackupInfo] = useState<any>(null);

  // Modal state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  useEffect(() => {
    // Load backup info on mount
    const info = datBackupService.getBackupInfo();
    setBackupInfo(info);
  }, []);

  const handleExport = async () => {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' +
                       new Date().toISOString().split('T')[1].split('.')[0].replace(/:/g, '-');

      // Export only .dat backup file from the parallel backup
      const datBlob = await datBackupService.exportToFile();
      const datUrl = URL.createObjectURL(datBlob);
      const datLink = document.createElement('a');
      datLink.href = datUrl;
      datLink.download = `javed_dairy_backup_${timestamp}.dat`;
      document.body.appendChild(datLink);
      datLink.click();
      document.body.removeChild(datLink);
      URL.revokeObjectURL(datUrl);

      // Update backup info
      const info = datBackupService.getBackupInfo();
      setBackupInfo(info);

      setMessage({ type: 'success', text: 'DAT backup file downloaded successfully.' });
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to create backup.' });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Clear input so same file can be selected again
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }

    setPendingFile(file);
    setIsConfirmOpen(true);
  };

  const executeRestore = async () => {
    if (!pendingFile) return;
    setIsConfirmOpen(false);

    setMessage({ type: 'success', text: 'Restoring data...' });

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const fileContent = event.target?.result as string;

        // Check if it's a .dat file
        if (pendingFile.name.endsWith('.dat')) {
          // Import from DAT backup
          const appData = await datBackupService.importFromFile(fileContent);
          // Convert to JSON string for dbService.importData
          const json = JSON.stringify(appData);
          await dbService.importData(json);
        } else {
          // Import from JSON directly
          await dbService.importData(fileContent);
        }

        setMessage({ type: 'success', text: 'Restore backup data done. Reloading app...' });

        // Reload after a short delay
        setTimeout(() => window.location.reload(), 2000);
      } catch (err) {
        console.error(err);
        setMessage({ type: 'error', text: 'Invalid backup file or corrupt data.' });
      }
    };
    reader.onerror = () => {
      setMessage({ type: 'error', text: 'Error reading the file.' });
    };
    reader.readAsText(pendingFile);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Settings & Data</h2>
        <p className="text-slate-500">Manage your local data backups and exports.</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
          {message.text}
        </div>
      )}


      {/* Backup Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
              <Download size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg text-slate-900">Backup Data (.DAT)</h3>
              <p className="text-sm text-slate-500">Parallel backup file updated with every change</p>
            </div>
          </div>

          {backupInfo && (
            <div className="mb-4 p-3 bg-slate-50 rounded-lg">
              <div className="text-xs text-slate-500 uppercase font-bold mb-2">Last Backup</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-slate-500">Time:</span>{' '}
                  <span className="font-medium">{new Date(backupInfo.timestamp).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-500">Customers:</span>{' '}
                  <span className="font-medium">{backupInfo.recordCount.customers}</span>
                </div>
                <div>
                  <span className="text-slate-500">Entries:</span>{' '}
                  <span className="font-medium">{backupInfo.recordCount.entries}</span>
                </div>
                <div>
                  <span className="text-slate-500">Transactions:</span>{' '}
                  <span className="font-medium">{backupInfo.recordCount.transactions}</span>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleExport}
            className="w-full bg-slate-900 text-white font-medium py-3 rounded-xl hover:bg-slate-800 transition-colors"
          >
            Download .DAT Backup File
          </button>
        </div>

        <div className="p-6 bg-slate-50">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center">
              <Upload size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900">Restore Data</h3>
              <p className="text-sm text-slate-500">Restore from a previously downloaded backup file.</p>
            </div>
          </div>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".json,.dat"
            className="hidden"
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-white border border-slate-300 text-slate-700 font-medium py-3 rounded-xl hover:bg-slate-100 transition-colors"
          >
            Select Backup File to Restore
          </button>
          <p className="text-xs text-center mt-3 text-red-500 font-medium">
            Warning: Restoring will delete all current data on this device.
          </p>
        </div>
      </div>

      <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
        <div className="flex gap-3">
          <Database className="text-blue-600 shrink-0" />
          <div>
            <h4 className="font-bold text-blue-900 text-sm uppercase mb-1">About Offline Storage</h4>
            <p className="text-sm text-blue-800 leading-relaxed">
              This application stores all data directly in your browser (IndexedDB). 
              If you clear your browser history or site data, you may lose your records. 
              Please download a backup regularly.
            </p>
          </div>
        </div>
      </div>

      {/* Custom Confirmation Modal */}
      {isConfirmOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 mx-auto">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-lg font-bold text-center text-slate-900 mb-2">Confirm Restore</h3>
            <p className="text-center text-slate-500 text-sm mb-6">
              This will <span className="font-bold text-red-600">permanently overwrite</span> all current data with the selected backup file. This action cannot be undone.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => { setIsConfirmOpen(false); setPendingFile(null); }}
                className="py-2.5 px-4 bg-white border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button 
                onClick={executeRestore}
                className="py-2.5 px-4 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700"
              >
                Restore Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}