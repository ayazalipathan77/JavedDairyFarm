import React, { useEffect, useState } from 'react';
import { dbService } from '../services/db';
import { Customer, MilkEntry, TransactionType } from '../types';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { FileText, Share2, Download } from 'lucide-react';

interface BillData {
  customer: Customer;
  totalQty: number;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  entries: MilkEntry[];
}

export default function Billing() {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [bills, setBills] = useState<BillData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generateBills();
  }, [selectedMonth]);

  const generateBills = async () => {
    setLoading(true);
    const start = startOfMonth(new Date(selectedMonth));
    const end = endOfMonth(new Date(selectedMonth));

    const [customers, allEntries, allTransactions] = await Promise.all([
      dbService.getCustomers(),
      dbService.getEntries(),
      dbService.getTransactions()
    ]);

    const generatedBills: BillData[] = customers.map(customer => {
      // 1. Get entries for this month
      const entries = allEntries.filter(e => 
        e.customerId === customer.id && 
        isWithinInterval(new Date(e.date), { start, end })
      ).sort((a, b) => a.date.localeCompare(b.date));

      // 2. Calculate Milk Totals
      const totalQty = entries.reduce((sum, e) => sum + e.quantity, 0);
      const totalAmount = entries.reduce((sum, e) => sum + e.amount, 0);

      // 3. Calculate Payments (Credits) for this customer in this month
      // Note: Ideally balance is running, but for specific monthly bill we often look at current month's activity + prev balance. 
      // Simplified here to show current month due.
      const payments = allTransactions.filter(t => 
        t.customerId === customer.id && 
        t.type === TransactionType.CREDIT &&
        isWithinInterval(new Date(t.date), { start, end })
      );
      
      const paidAmount = payments.reduce((sum, t) => sum + t.amount, 0);

      return {
        customer,
        totalQty,
        totalAmount,
        paidAmount,
        balance: totalAmount - paidAmount, // Simple monthly balance
        entries
      };
    });

    setBills(generatedBills.filter(b => b.totalQty > 0 || b.paidAmount > 0)); // Only show active
    setLoading(false);
  };

  const sendWhatsApp = (bill: BillData) => {
    const text = `
*Javed Dairy Farm*
Bill for: ${format(new Date(selectedMonth), 'MMMM yyyy')}
Customer: ${bill.customer.name}
----------------
Total Milk: ${bill.totalQty.toFixed(1)} L
Total Amount: $${bill.totalAmount}
Payments: $${bill.paidAmount}
----------------
*Balance Due: $${bill.balance}*
    `.trim();
    
    const url = `https://wa.me/${bill.customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <h2 className="text-2xl font-bold text-slate-900">Monthly Billing</h2>
        <input 
          type="month" 
          value={selectedMonth} 
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="px-4 py-2 border border-slate-200 rounded-lg bg-white font-medium text-slate-700 outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Generating bills...</div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {bills.length === 0 && <p className="text-center text-slate-500 py-8">No activity found for this month.</p>}
          
          {bills.map(bill => (
            <div key={bill.customer.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden break-inside-avoid">
              <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg text-slate-900">{bill.customer.name}</h3>
                  <p className="text-sm text-slate-500">{bill.customer.phone}</p>
                </div>
                <div className="flex gap-2 no-print">
                  <button 
                    onClick={() => sendWhatsApp(bill)}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="Send via WhatsApp"
                  >
                    <Share2 size={20} />
                  </button>
                  <button 
                     onClick={() => window.print()}
                     className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                     title="Print"
                  >
                     <Download size={20} />
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-xs text-blue-600 font-medium uppercase">Total Milk</p>
                    <p className="text-xl font-bold text-blue-700">{bill.totalQty.toFixed(1)} L</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs text-slate-500 font-medium uppercase">Total Amount</p>
                    <p className="text-xl font-bold text-slate-700">${bill.totalAmount}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-xs text-green-600 font-medium uppercase">Paid</p>
                    <p className="text-xl font-bold text-green-700">${bill.paidAmount}</p>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg">
                    <p className="text-xs text-orange-600 font-medium uppercase">Balance Due</p>
                    <p className="text-xl font-bold text-orange-700">${bill.balance}</p>
                  </div>
                </div>

                {/* Simplified Table for Bill View */}
                <details className="text-sm">
                  <summary className="cursor-pointer text-brand-600 font-medium mb-2 hover:underline">View Daily Details</summary>
                  <div className="border rounded-lg overflow-hidden mt-2">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-2 border-b">Date</th>
                          <th className="px-4 py-2 border-b text-right">Qty</th>
                          <th className="px-4 py-2 border-b text-right">Rate</th>
                          <th className="px-4 py-2 border-b text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bill.entries.map(e => (
                          <tr key={e.id} className="border-b last:border-0">
                            <td className="px-4 py-2">{format(new Date(e.date), 'dd MMM')}</td>
                            <td className="px-4 py-2 text-right">{e.quantity}</td>
                            <td className="px-4 py-2 text-right">{e.rate}</td>
                            <td className="px-4 py-2 text-right">${e.amount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}