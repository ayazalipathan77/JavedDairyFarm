import React, { useEffect, useState, useMemo } from 'react';
import { dbService } from '../services/db';
import { Customer, MilkEntry, UserRole } from '../types';
import { Calendar, Save, RotateCcw, Copy, Check, ChevronLeft, ChevronRight, SaveAll, AlertTriangle } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';

export default function DailyEntry() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [entries, setEntries] = useState<Record<string, number>>({}); // Map customerId -> qty
  const [savedStatus, setSavedStatus] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const { role } = useAuth();
  
  // Modal State
  const [showCopyConfirm, setShowCopyConfirm] = useState(false);

  useEffect(() => {
    loadData();
  }, [date]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allCustomers, dayEntries] = await Promise.all([
        dbService.getCustomers(),
        dbService.getEntries(date)
      ]);

      const activeCustomers = allCustomers.filter(c => c.isActive);
      setCustomers(activeCustomers);

      const entryMap: Record<string, number> = {};
      const statusMap: Record<string, boolean> = {};
      
      // 1. First pass: Pre-fill from Customer Defaults
      activeCustomers.forEach(c => {
         entryMap[c.id] = c.defaultQuantity || 0;
         statusMap[c.id] = false; // Default values are considered unsaved
      });

      // 2. Second pass: Overwrite with actual DB entries for the day
      dayEntries.forEach(e => {
        entryMap[e.customerId] = e.quantity;
        statusMap[e.customerId] = true; // DB values are saved
      });

      setEntries(entryMap);
      setSavedStatus(statusMap);
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = async (customerId: string, qty: string) => {
    const val = parseFloat(qty);
    setEntries(prev => ({ ...prev, [customerId]: isNaN(val) ? 0 : val }));
    setSavedStatus(prev => ({ ...prev, [customerId]: false }));
  };

  const saveEntry = async (customer: Customer, manualQty?: number) => {
    const qty = manualQty !== undefined ? manualQty : (entries[customer.id] || 0);
    
    // Logic: 
    // If quantity > 0, we save it.
    // If quantity is 0, BUT customer has a defaultQuantity > 0, we MUST save the 0 to override the default on reload.
    // If quantity is 0 and no default, we can delete the entry to clean up.
    
    const entry: MilkEntry = {
      id: `${date}-${customer.id}`,
      customerId: customer.id,
      date: date,
      quantity: qty,
      rate: customer.rate,
      amount: qty * customer.rate,
      timestamp: Date.now()
    };

    if (qty > 0 || (customer.defaultQuantity && customer.defaultQuantity > 0)) {
      await dbService.saveEntry(entry);
    } else {
      await dbService.deleteEntry(entry.id);
    }
    
    setSavedStatus(prev => ({ ...prev, [customer.id]: true }));
  };

  const handleBlur = (customer: Customer) => {
    saveEntry(customer);
  };

  const handleSaveAll = async () => {
    setIsSavingAll(true);
    try {
      // Save all current entries visible on screen
      const promises = customers.map(c => saveEntry(c));
      await Promise.all(promises);
    } finally {
      setIsSavingAll(false);
    }
  };

  const executeCopyYesterday = async () => {
    setShowCopyConfirm(false);
    
    const yesterday = format(addDays(new Date(date), -1), 'yyyy-MM-dd');
    const yesterdayEntries = await dbService.getEntries(yesterday);
    
    const newEntries = { ...entries };
    const newStatus = { ...savedStatus };
    const updates: Promise<void>[] = [];

    yesterdayEntries.forEach(e => {
      // Only copy if currently 0 or default (unsaved)
      if (!newStatus[e.customerId] || newEntries[e.customerId] === 0) {
        newEntries[e.customerId] = e.quantity;
        // We will mark it as unsaved so user has to confirm/save, OR we save immediately.
        // Let's save immediately to match 'Copy' behavior expectation
        
        const customer = customers.find(c => c.id === e.customerId);
        if (customer) {
            const entry: MilkEntry = {
              id: `${date}-${e.customerId}`,
              customerId: e.customerId,
              date: date,
              quantity: e.quantity,
              rate: customer.rate,
              amount: e.quantity * customer.rate,
              timestamp: Date.now()
            };
            updates.push(dbService.saveEntry(entry));
            newStatus[e.customerId] = true;
        }
      }
    });

    await Promise.all(updates);
    setEntries(newEntries);
    setSavedStatus(newStatus);
  };

  const changeDate = (days: number) => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + days);
    setDate(format(newDate, 'yyyy-MM-dd'));
  };

  const totalQty = (Object.values(entries) as number[]).reduce((sum, val) => sum + (val || 0), 0);
  const totalAmount = customers.reduce((sum, c) => {
    const qty = entries[c.id] || 0;
    return sum + (qty * c.rate);
  }, 0);

  const unsavedCount = Object.values(savedStatus).filter(s => !s).length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20 md:pb-0">
      {/* Date Navigator */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-10">
        <div className="flex items-center gap-4 w-full md:w-auto justify-between">
          <button 
            onClick={() => changeDate(-1)} 
            className={`p-2 rounded-lg transition-colors ${role === UserRole.USER ? 'opacity-30 cursor-not-allowed text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}
            disabled={role === UserRole.USER}
          >
            <ChevronLeft size={24} />
          </button>
          <div className="flex items-center gap-2">
            <Calendar size={20} className="text-brand-600" />
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={role === UserRole.USER}
              className={`font-bold text-lg text-slate-900 bg-transparent outline-none ${role === UserRole.USER ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
            />
          </div>
          <button 
            onClick={() => changeDate(1)} 
            className={`p-2 rounded-lg transition-colors ${role === UserRole.USER ? 'opacity-30 cursor-not-allowed text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}
            disabled={role === UserRole.USER}
          >
            <ChevronRight size={24} />
          </button>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={() => setShowCopyConfirm(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg font-medium hover:bg-indigo-100 transition-colors text-sm"
          >
            <Copy size={16} />
            <span className="hidden sm:inline">Copy Yesterday</span>
            <span className="sm:hidden">Copy Prev</span>
          </button>
          <div className="bg-slate-100 px-4 py-2 rounded-lg text-right min-w-[120px]">
            <div className="text-xs text-slate-500 uppercase font-bold">Total</div>
            <div className="font-bold text-brand-600">{totalQty.toFixed(1)} L</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading daily entries...</div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="grid grid-cols-12 bg-slate-50 p-4 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <div className="col-span-5 md:col-span-4">Customer</div>
              <div className="col-span-3 md:col-span-2 text-right">Rate</div>
              <div className="col-span-4 md:col-span-3 text-center">Quantity (L)</div>
              <div className="hidden md:block col-span-2 text-right">Amount</div>
              <div className="hidden md:block col-span-1 text-center">Status</div>
            </div>

            <div className="divide-y divide-slate-100">
              {customers.map(customer => {
                const qty = entries[customer.id] || '';
                const amount = (Number(qty) * customer.rate).toFixed(0);
                const isSaved = savedStatus[customer.id];

                return (
                  <div key={customer.id} className="grid grid-cols-12 p-3 items-center hover:bg-slate-50 transition-colors">
                    <div className="col-span-5 md:col-span-4 font-medium text-slate-900 truncate pr-2">
                      {customer.name}
                      {customer.defaultQuantity && customer.defaultQuantity > 0 && (
                         <span className="block text-[10px] text-slate-400 font-normal">Def: {customer.defaultQuantity}L</span>
                      )}
                    </div>
                    <div className="col-span-3 md:col-span-2 text-right text-slate-500 text-sm">
                      {customer.rate}
                    </div>
                    <div className="col-span-4 md:col-span-3 flex justify-center px-2">
                      <input 
                        type="number" 
                        min="0"
                        step="0.5"
                        placeholder="0"
                        className="w-20 bg-white border border-slate-200 rounded-lg py-2 px-2 text-center font-bold text-slate-900 focus:ring-2 focus:ring-brand-500"
                        value={qty}
                        onChange={(e) => handleQuantityChange(customer.id, e.target.value)}
                        onBlur={() => handleBlur(customer)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                        }}
                      />
                    </div>
                    <div className="hidden md:block col-span-2 text-right font-medium text-slate-900">
                      {amount}
                    </div>
                    <div className="hidden md:flex col-span-1 justify-center">
                      {isSaved ? (
                        <Check size={18} className="text-green-500" />
                      ) : (
                        <div title="Unsaved" className="w-2 h-2 bg-slate-300 rounded-full"></div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="flex justify-end sticky bottom-20 md:static z-20">
             <button 
               onClick={handleSaveAll}
               disabled={isSavingAll}
               className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl shadow-lg shadow-green-600/30 flex items-center gap-2 font-semibold transition-all w-full md:w-auto justify-center"
             >
               {isSavingAll ? (
                 <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
               ) : (
                 <SaveAll size={20} />
               )}
               {isSavingAll ? 'Saving...' : `Save Daily Log ${unsavedCount > 0 ? `(${unsavedCount} Unsaved)` : ''}`}
             </button>
          </div>
        </div>
      )}
      
      {/* Mobile Sticky Footer for Total */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-20 flex justify-between items-center">
        <div>
           <p className="text-xs text-slate-500">Total Amount</p>
           <p className="font-bold text-lg text-slate-900">${totalAmount.toLocaleString()}</p>
        </div>
        <div>
           <p className="text-xs text-slate-500 text-right">Total Liters</p>
           <p className="font-bold text-lg text-brand-600 text-right">{totalQty.toFixed(1)} L</p>
        </div>
      </div>

      {/* Copy Confirmation Modal */}
      {showCopyConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4 mx-auto">
              <Copy size={24} />
            </div>
            <h3 className="text-lg font-bold text-center text-slate-900 mb-2">Copy Yesterday's Data?</h3>
            <p className="text-center text-slate-500 text-sm mb-6">
              This will overwrite today's empty entries with data from yesterday. Existing entries for today will not be changed.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setShowCopyConfirm(false)}
                className="py-2.5 px-4 bg-white border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button 
                onClick={executeCopyYesterday}
                className="py-2.5 px-4 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700"
              >
                Copy Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}