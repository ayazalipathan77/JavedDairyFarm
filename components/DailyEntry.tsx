import React, { useEffect, useState, useMemo } from 'react';
import { dbService } from '../services/db';
import { Customer, MilkEntry } from '../types';
import { Calendar, Save, RotateCcw, Copy, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, subDays, addDays } from 'date-fns';

export default function DailyEntry() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [entries, setEntries] = useState<Record<string, number>>({}); // Map customerId -> qty
  const [savedStatus, setSavedStatus] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

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
      
      dayEntries.forEach(e => {
        entryMap[e.customerId] = e.quantity;
        statusMap[e.customerId] = true;
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

  const saveEntry = async (customer: Customer) => {
    const qty = entries[customer.id] || 0;
    
    // Only save if quantity > 0 or if we need to update an existing entry to 0
    // Simple logic: Always overwrite for the day
    const entry: MilkEntry = {
      id: `${date}-${customer.id}`, // Deterministic ID for easy overwrite
      customerId: customer.id,
      date: date,
      quantity: qty,
      rate: customer.rate,
      amount: qty * customer.rate,
      timestamp: Date.now()
    };

    if (qty > 0) {
      await dbService.saveEntry(entry);
    } else {
      // If 0, check if we need to delete existing or just ignore
      // For simplicity in this app, we save 0 entries to explicitely show "no milk" or we delete. 
      // Let's delete if 0 to keep DB clean
      await dbService.deleteEntry(entry.id);
    }
    
    setSavedStatus(prev => ({ ...prev, [customer.id]: true }));
  };

  const handleBlur = (customer: Customer) => {
    // Auto-save on blur
    saveEntry(customer);
  };

  const copyYesterday = async () => {
    if (!window.confirm("Overwrite today's empty entries with yesterday's data?")) return;
    
    const yesterday = format(subDays(new Date(date), 1), 'yyyy-MM-dd');
    const yesterdayEntries = await dbService.getEntries(yesterday);
    
    const newEntries = { ...entries };
    const newStatus = { ...savedStatus };
    const updates: Promise<void>[] = [];

    yesterdayEntries.forEach(e => {
      // Only copy if today is empty for this customer
      if (newEntries[e.customerId] === undefined || newEntries[e.customerId] === 0) {
        newEntries[e.customerId] = e.quantity;
        newStatus[e.customerId] = true; // Mark as saved visually
        
        const entry: MilkEntry = {
          id: `${date}-${e.customerId}`,
          customerId: e.customerId,
          date: date,
          quantity: e.quantity,
          rate: e.rate, // Use current rate or yesterday's? Usually current customer rate.
          amount: e.quantity * e.rate,
          timestamp: Date.now()
        };
        // We should fetch the customer to get current rate, but for speed using yesterday's rate or looking up customer
        const customer = customers.find(c => c.id === e.customerId);
        if (customer) {
            entry.rate = customer.rate;
            entry.amount = entry.quantity * customer.rate;
            updates.push(dbService.saveEntry(entry));
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Date Navigator */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-10">
        <div className="flex items-center gap-4 w-full md:w-auto justify-between">
          <button onClick={() => changeDate(-1)} className="p-2 hover:bg-slate-100 rounded-lg">
            <ChevronLeft size={24} className="text-slate-600" />
          </button>
          <div className="flex items-center gap-2">
            <Calendar size={20} className="text-brand-600" />
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="font-bold text-lg text-slate-900 bg-transparent outline-none cursor-pointer"
            />
          </div>
          <button onClick={() => changeDate(1)} className="p-2 hover:bg-slate-100 rounded-lg">
            <ChevronRight size={24} className="text-slate-600" />
          </button>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={copyYesterday}
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
                     {isSaved ? <Check size={18} className="text-green-500" /> : <div className="w-2 h-2 bg-slate-300 rounded-full"></div>}
                  </div>
                </div>
              );
            })}
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
    </div>
  );
}