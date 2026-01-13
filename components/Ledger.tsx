import React, { useEffect, useState } from 'react';
import { dbService } from '../services/db';
import { LedgerTransaction, TransactionType, LedgerCategory, Customer } from '../types';
import { format } from 'date-fns';
import { TrendingDown, TrendingUp, Plus } from 'lucide-react';

export default function Ledger() {
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showForm, setShowForm] = useState(false);
  
  // Form State
  const [type, setType] = useState<TransactionType>(TransactionType.DEBIT);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>(LedgerCategory.OTHER);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedCustomer, setSelectedCustomer] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [txs, custs] = await Promise.all([
      dbService.getTransactions(),
      dbService.getCustomers()
    ]);
    // Sort by date desc
    setTransactions(txs.sort((a, b) => b.timestamp - a.timestamp));
    setCustomers(custs);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;

    const tx: LedgerTransaction = {
      id: crypto.randomUUID(),
      type,
      amount: parseFloat(amount),
      category,
      description,
      date,
      customerId: selectedCustomer || undefined,
      timestamp: Date.now()
    };

    await dbService.saveTransaction(tx);
    setShowForm(false);
    resetForm();
    loadData();
  };

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setCategory(LedgerCategory.OTHER);
    setSelectedCustomer('');
  };

  const getCustomerName = (id?: string) => customers.find(c => c.id === id)?.name;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">Cash & Ledger</h2>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-brand-700 shadow-sm"
        >
          <Plus size={20} />
          New Transaction
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-brand-100 animate-in slide-in-from-top-4 duration-200">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                 <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                 <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
                   <button 
                    type="button"
                    onClick={() => setType(TransactionType.CREDIT)}
                    className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${type === TransactionType.CREDIT ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500'}`}
                   >
                     Income (Credit)
                   </button>
                   <button 
                    type="button"
                    onClick={() => setType(TransactionType.DEBIT)}
                    className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${type === TransactionType.DEBIT ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500'}`}
                   >
                     Expense (Debit)
                   </button>
                 </div>
              </div>
              <div className="col-span-2 sm:col-span-1">
                 <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                 <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-3 py-2 bg-white border rounded-lg outline-none focus:ring-2 focus:ring-brand-500" required />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full px-3 py-2 bg-white border rounded-lg outline-none focus:ring-2 focus:ring-brand-500" placeholder="0.00" required />
               </div>
               <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-3 py-2 bg-white border rounded-lg outline-none focus:ring-2 focus:ring-brand-500">
                  {Object.values(LedgerCategory).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
               </div>
            </div>
            
            {type === TransactionType.CREDIT && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Received From (Optional)</label>
                <select value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)} className="w-full px-3 py-2 bg-white border rounded-lg outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="">-- General / Cash Sale --</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description / Notes</label>
              <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full px-3 py-2 bg-white border rounded-lg outline-none focus:ring-2 focus:ring-brand-500" placeholder="Details..." />
            </div>

            <div className="flex justify-end pt-2">
              <button type="submit" className="bg-brand-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-brand-700">Save Transaction</button>
            </div>
          </form>
        </div>
      )}

      {/* Transactions List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-600">Date</th>
                <th className="px-6 py-4 font-semibold text-slate-600">Description</th>
                <th className="px-6 py-4 font-semibold text-slate-600">Category</th>
                <th className="px-6 py-4 font-semibold text-slate-600 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map(tx => (
                <tr key={tx.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{tx.date}</td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{tx.description || '-'}</div>
                    {tx.customerId && <div className="text-xs text-slate-500">From: {getCustomerName(tx.customerId)}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-slate-100 rounded text-xs font-medium text-slate-600">
                      {tx.category}
                    </span>
                  </td>
                  <td className={`px-6 py-4 text-right font-bold ${tx.type === TransactionType.CREDIT ? 'text-green-600' : 'text-red-600'}`}>
                    <div className="flex items-center justify-end gap-2">
                       {tx.type === TransactionType.CREDIT ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                       {tx.type === TransactionType.CREDIT ? '+' : '-'}${tx.amount.toLocaleString()}
                    </div>
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">No transactions recorded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}