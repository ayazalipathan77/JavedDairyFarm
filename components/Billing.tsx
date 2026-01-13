import React, { useEffect, useState } from 'react';
import { dbService } from '../services/db';
import { Customer, MilkEntry, TransactionType } from '../types';
import { format } from 'date-fns';
import { FileText, Share2, Printer, Search, Calculator, Send, AlertTriangle } from 'lucide-react';

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
  const [search, setSearch] = useState('');
  const [bills, setBills] = useState<BillData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [showSendConfirm, setShowSendConfirm] = useState(false);

  useEffect(() => {
    generateBills();
  }, [selectedMonth]);

  const generateBills = async () => {
    setLoading(true);

    const [customers, allEntries, allTransactions] = await Promise.all([
      dbService.getCustomers(),
      dbService.getEntries(),
      dbService.getTransactions()
    ]);

    const generatedBills: BillData[] = customers.map(customer => {
      // 1. Get entries for this month using simple string matching (YYYY-MM)
      // This avoids timezone issues with date objects
      const entries = allEntries.filter(e => 
        e.customerId === customer.id && 
        e.date.startsWith(selectedMonth)
      ).sort((a, b) => a.date.localeCompare(b.date));

      // 2. Calculate Milk Totals
      const totalQty = entries.reduce((sum, e) => sum + e.quantity, 0);
      const totalAmount = entries.reduce((sum, e) => sum + e.amount, 0);

      // 3. Calculate Payments (Credits) for this customer in this month
      const payments = allTransactions.filter(t => 
        t.customerId === customer.id && 
        t.type === TransactionType.CREDIT &&
        t.date.startsWith(selectedMonth)
      );
      
      const paidAmount = payments.reduce((sum, t) => sum + t.amount, 0);

      return {
        customer,
        totalQty,
        totalAmount,
        paidAmount,
        balance: totalAmount - paidAmount, 
        entries
      };
    });

    // Show active customers or those with balance
    setBills(generatedBills.filter(b => b.totalQty > 0 || b.paidAmount > 0 || b.balance !== 0));
    setLoading(false);
  };

  const filteredBills = bills.filter(b => 
    b.customer.name.toLowerCase().includes(search.toLowerCase()) ||
    b.customer.phone.includes(search)
  );

  const printBill = (bill: BillData) => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    const monthDate = new Date(selectedMonth);
    const invoiceTitle = `Invoice - ${bill.customer.name} - ${format(monthDate, 'MMM yyyy')}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${invoiceTitle}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
          body { font-family: 'Inter', sans-serif; }
        </style>
      </head>
      <body class="bg-white p-8">
        <div class="max-w-3xl mx-auto border border-slate-200 rounded-lg p-8 shadow-none print:border-none print:p-0">
          
          <!-- Header -->
          <div class="flex justify-between items-start mb-8 border-b border-slate-100 pb-6">
            <div>
              <h1 class="text-3xl font-bold text-slate-900">Javed Dairy Farm</h1>
              <p class="text-slate-500 mt-1">Daily Fresh Milk Supply</p>
            </div>
            <div class="text-right">
              <h2 class="text-xl font-semibold text-slate-900">INVOICE</h2>
              <p class="text-slate-500 text-sm mt-1">Month: ${format(monthDate, 'MMMM yyyy')}</p>
              <p class="text-slate-500 text-sm">Date: ${format(new Date(), 'dd MMM yyyy')}</p>
            </div>
          </div>

          <!-- Customer Info -->
          <div class="mb-8 bg-slate-50 p-4 rounded-lg">
            <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Bill To</p>
            <h3 class="text-xl font-bold text-slate-900">${bill.customer.name}</h3>
            <p class="text-slate-600">${bill.customer.phone}</p>
            <p class="text-slate-600 text-sm">${bill.customer.address}</p>
          </div>

          <!-- Summary Table -->
          <table class="w-full mb-8">
            <thead>
              <tr class="border-b-2 border-slate-900">
                <th class="text-left py-3 font-bold text-slate-900">Description</th>
                <th class="text-right py-3 font-bold text-slate-900">Quantity</th>
                <th class="text-right py-3 font-bold text-slate-900">Rate</th>
                <th class="text-right py-3 font-bold text-slate-900">Amount</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr>
                <td class="py-4 text-slate-800">Fresh Milk Supply (${format(monthDate, 'MMM')})</td>
                <td class="py-4 text-right text-slate-600">${bill.totalQty.toFixed(1)} L</td>
                <td class="py-4 text-right text-slate-600">${bill.customer.rate}</td>
                <td class="py-4 text-right font-bold text-slate-900">$${bill.totalAmount.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          <!-- Totals -->
          <div class="flex flex-col items-end border-t border-slate-200 pt-6">
            <div class="w-full max-w-xs space-y-3">
              <div class="flex justify-between text-slate-600">
                <span>Total Amount</span>
                <span class="font-medium">$${bill.totalAmount.toLocaleString()}</span>
              </div>
              <div class="flex justify-between text-green-600">
                <span>Payments Received</span>
                <span class="font-medium">($${bill.paidAmount.toLocaleString()})</span>
              </div>
              <div class="flex justify-between text-2xl font-bold text-slate-900 border-t border-slate-900 pt-3">
                <span>Balance Due</span>
                <span>$${bill.balance.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="mt-12 text-center pt-8 border-t border-slate-100">
            <p class="text-slate-500 font-medium">Thank you for your business!</p>
            <p class="text-xs text-slate-400 mt-2">Javed Dairy Farm System</p>
          </div>
        </div>
        <script>
          window.onload = () => { window.print(); };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const sendWhatsApp = (bill: BillData) => {
    const text = `
*Javed Dairy Farm - Invoice*
Month: ${format(new Date(selectedMonth), 'MMMM yyyy')}
Customer: ${bill.customer.name}
--------------------------------
🥛 Total Milk: ${bill.totalQty.toFixed(1)} L
💰 Total Amount: $${bill.totalAmount}
✅ Paid: $${bill.paidAmount}
--------------------------------
*❗ Balance Due: $${bill.balance}*
    `.trim();
    
    const url = `https://wa.me/${bill.customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const executeSendAll = () => {
    setShowSendConfirm(false);
    filteredBills.forEach((bill, index) => {
      setTimeout(() => {
        sendWhatsApp(bill);
      }, index * 1000);
    });
  };

  const handleSendAllClick = () => {
     if (filteredBills.length > 0) {
        setShowSendConfirm(true);
     }
  };

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Monthly Billing</h2>
          <p className="text-slate-500 text-sm">Manage invoices and payments.</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto">
          {/* Send All Button */}
          <button 
            onClick={handleSendAllClick}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 font-medium shadow-sm transition-colors whitespace-nowrap"
            title="Send WhatsApp message to all visible customers"
          >
            <Send size={18} />
            Send All ({filteredBills.length})
          </button>

          {/* Month Filter */}
          <div className="relative">
            <Calculator className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="month" 
              max={new Date().toISOString().slice(0, 7)}
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full md:w-auto pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 font-medium text-slate-700 outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          
          {/* Search Filter */}
          <div className="relative flex-1 md:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-64 pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 font-medium text-slate-700 outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mb-4"></div>
          <p>Generating bills...</p>
        </div>
      ) : (
        <>
          {filteredBills.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
              <FileText size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 font-medium">No bills found for {format(new Date(selectedMonth), 'MMMM yyyy')}.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Milk (L)</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Rate</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Total</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Paid</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Balance</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Status</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBills.map((bill) => (
                      <tr key={bill.customer.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">{bill.customer.name}</div>
                          <div className="text-xs text-slate-400 font-mono">{bill.customer.phone}</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-semibold text-blue-600">{bill.totalQty.toFixed(1)}</span>
                        </td>
                        <td className="px-6 py-4 text-right text-slate-500">
                          {bill.customer.rate}
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-slate-900">
                          ${bill.totalAmount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-green-600">
                          ${bill.paidAmount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`font-bold ${bill.balance > 0 ? 'text-orange-600' : 'text-slate-400'}`}>
                            ${bill.balance.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {bill.balance <= 0 ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Paid
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              Due
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => printBill(bill)}
                              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Print Invoice"
                            >
                              <Printer size={18} />
                            </button>
                            <button 
                              onClick={() => sendWhatsApp(bill)}
                              className="p-2 text-green-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Send via WhatsApp"
                            >
                              <Share2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Confirmation Modal */}
      {showSendConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4 mx-auto">
              <Share2 size={24} />
            </div>
            <h3 className="text-lg font-bold text-center text-slate-900 mb-2">Send Bulk WhatsApp?</h3>
            <p className="text-center text-slate-500 text-sm mb-6">
              You are about to send bills to <span className="font-bold text-slate-900">{filteredBills.length}</span> customers. This will open multiple tabs. Please allow popups.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setShowSendConfirm(false)}
                className="py-2.5 px-4 bg-white border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button 
                onClick={executeSendAll}
                className="py-2.5 px-4 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700"
              >
                Send All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}