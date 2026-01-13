import React, { useRef, useState } from 'react';
import { dbService } from '../services/db';
import { Download, Upload, Database, CheckCircle, AlertTriangle, Shield, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';

export default function AppSettings() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const { role, setRole } = useAuth();
  
  // Modal state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

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
        const json = event.target?.result as string;
        await dbService.importData(json);
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
        <p className="text-slate-500">Manage your local data backups and user roles.</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
          {message.text}
        </div>
      )}

      {/* User Role Management */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
           <div className="flex items-center gap-4 mb-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${role === UserRole.ADMIN ? 'bg-purple-50 text-purple-600' : 'bg-gray-50 text-gray-600'}`}>
              <Shield size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900">User Role (Active)</h3>
              <p className="text-sm text-slate-500">Current permission level: <span className="font-semibold text-slate-900">{role}</span></p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
             <button 
               onClick={() => setRole(UserRole.USER)}
               className={`flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all border ${
                 role === UserRole.USER 
                   ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-slate-200' 
                   : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
               }`}
             >
               <User size={18} />
               Switch to User
             </button>
             <button 
               onClick={() => setRole(UserRole.ADMIN)}
               className={`flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all border ${
                 role === UserRole.ADMIN 
                   ? 'bg-purple-600 text-white border-purple-600 ring-2 ring-purple-100' 
                   : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
               }`}
             >
               <Shield size={18} />
               Switch to Admin
             </button>
          </div>
          <p className="text-xs text-slate-400 mt-3 text-center">
            Note: In a real app, Admin access would be password protected.
          </p>
        </div>
      </div>

      {/* Backup Section */}
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
            onChange={handleFileSelect}
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