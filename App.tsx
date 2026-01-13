import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Milk, 
  BookOpen, 
  FileText, 
  Settings, 
  Menu, 
  X,
  Shield,
  ShieldCheck
} from 'lucide-react';
import { dbService } from './services/db';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { UserRole } from './types';

// Components
import Dashboard from './components/Dashboard';
import Customers from './components/Customers';
import DailyEntry from './components/DailyEntry';
import Ledger from './components/Ledger';
import Billing from './components/Billing';
import AppSettings from './components/Settings';

const NavItem = ({ to, icon: Icon, label, onClick }: { to: string, icon: any, label: string, onClick?: () => void }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link 
      to={to} 
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
        isActive 
          ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30' 
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <Icon size={20} className={isActive ? 'text-white' : 'text-slate-500'} />
      <span className="font-medium">{label}</span>
    </Link>
  );
};

const MobileHeader = ({ onMenuClick }: { onMenuClick: () => void }) => (
  <header className="md:hidden bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 sticky top-0 z-20">
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
        <Milk className="text-white" size={20} />
      </div>
      <h1 className="font-bold text-lg text-slate-800">Javed Dairy</h1>
    </div>
    <button onClick={onMenuClick} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
      <Menu size={24} />
    </button>
  </header>
);

const Sidebar = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const { role } = useAuth();
  
  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar Content */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out
        md:translate-x-0 md:static md:h-screen
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col">
          <div className="p-6 flex items-center justify-between border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/30">
                <Milk className="text-white" size={24} />
              </div>
              <div>
                <h1 className="font-bold text-xl text-slate-900 leading-tight">Javed Dairy</h1>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-500">System v1.0</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide ${role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                    {role === UserRole.ADMIN ? 'Admin' : 'User'}
                  </span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="md:hidden p-2 text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <NavItem to="/" icon={LayoutDashboard} label="Dashboard" onClick={onClose} />
            <NavItem to="/daily-entry" icon={Milk} label="Daily Entry" onClick={onClose} />
            <NavItem to="/customers" icon={Users} label="Customers" onClick={onClose} />
            <NavItem to="/ledger" icon={BookOpen} label="Cash & Ledger" onClick={onClose} />
            <NavItem to="/billing" icon={FileText} label="Monthly Billing" onClick={onClose} />
            <div className="pt-4 mt-4 border-t border-gray-100">
              <NavItem to="/settings" icon={Settings} label="Settings & Backup" onClick={onClose} />
            </div>
          </nav>

          <div className="p-4 border-t border-gray-100">
             <div className="flex items-center gap-2 text-xs text-slate-400 justify-center">
               {role === UserRole.ADMIN ? <ShieldCheck size={14} /> : <Shield size={14} />}
               <span>Logged in as {role}</span>
             </div>
          </div>
        </div>
      </aside>
    </>
  );
};

const AppContent = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDbReady, setIsDbReady] = useState(false);

  useEffect(() => {
    dbService.init().then(() => setIsDbReady(true));
  }, []);

  if (!isDbReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      <MobileHeader onMenuClick={() => setIsSidebarOpen(true)} />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <main className="flex-1 overflow-x-hidden overflow-y-auto h-[calc(100vh-64px)] md:h-screen p-4 md:p-8">
        <div className="max-w-7xl mx-auto h-full">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/daily-entry" element={<DailyEntry />} />
            <Route path="/ledger" element={<Ledger />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/settings" element={<AppSettings />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <AppContent />
      </HashRouter>
    </AuthProvider>
  );
}