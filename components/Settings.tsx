import React, { useRef, useState } from 'react';
import { dbService } from '../services/db';
import { Download, Upload, Database, CheckCircle, AlertTriangle } from 'lucide-react';

export default function AppSettings() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const handleExport = async () => {
    try {
      const data = await dbService.exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `javed_dairy_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setMessage({ type: 'success', text: 'Backup downloaded successfully.' });
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to create backup.' });
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm("WARNING: This will overwrite all current data with the backup file. Are you sure?")) {
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = event.target?.result as string;
        await dbService.importData(json);
        setMessage({ type: 'success', text: 'Data restored successfully. Please refresh the page.' });
        setTimeout(() => window.location.reload(), 1500);
      } catch (err) {
        setMessage({ type: 'error', text: 'Invalid backup file or corrupt data.' });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Settings & Data</h2>
        <p className="text-slate-500">Manage your local data backups.</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
              <Download size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900">Backup Data</h3>
              <p className="text-sm text-slate-500">Download a full copy of your database to your device.</p>
            </div>
          </div>
          <button 
            onClick={handleExport}
            className="w-full bg-slate-900 text-white font-medium py-3 rounded-xl hover:bg-slate-800 transition-colors"
          >
            Download Backup File
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
            onChange={handleImport}
            accept=".json"
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
    </div>
  );
}