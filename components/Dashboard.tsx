import React, { useEffect, useState } from 'react';
import { dbService } from '../services/db';
import { MilkEntry, LedgerTransaction, Customer, TransactionType } from '../types';
import { Users, Droplets, CreditCard, TrendingUp, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { format, addDays, endOfMonth, isWithinInterval } from 'date-fns';

const StatCard = ({ title, value, subtitle, icon: Icon, color }: any) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start justify-between">
    <div>
      <p className="text-slate-500 font-medium text-sm mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
      {subtitle && <p className={`text-xs mt-2 font-medium ${color === 'red' ? 'text-red-600' : 'text-green-600'}`}>{subtitle}</p>}
    </div>
    <div className={`p-3 rounded-xl ${
      color === 'blue' ? 'bg-blue-50 text-blue-600' : 
      color === 'green' ? 'bg-green-50 text-green-600' : 
      color === 'orange' ? 'bg-orange-50 text-orange-600' : 
      'bg-purple-50 text-purple-600'
    }`}>
      <Icon size={24} />
    </div>
  </div>
);

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeCustomers: 0,
    todayMilk: 0,
    monthMilk: 0,
    monthRevenue: 0,
    outstandingBalance: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const now = new Date();
      const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endMonth = endOfMonth(new Date());

      const [customers, entries, transactions] = await Promise.all([
        dbService.getCustomers(),
        dbService.getEntries(),
        dbService.getTransactions()
      ]);

      // Calculate Stats
      const activeCustomers = customers.filter(c => c.isActive).length;
      
      const todayEntries = entries.filter(e => e.date === today);
      const todayMilk = todayEntries.reduce((sum, e) => sum + e.quantity, 0);

      const monthEntries = entries.filter(e => isWithinInterval(new Date(e.date), { start: startMonth, end: endMonth }));
      const monthMilk = monthEntries.reduce((sum, e) => sum + e.quantity, 0);
      const monthRevenue = monthEntries.reduce((sum, e) => sum + e.amount, 0);

      // Simple Outstanding Balance Estimate (Total Revenue - Total Payments)
      // Note: In a real accounting system this is more complex. 
      // Here we assume: All Entries = Debt, All Credit Transactions = Payment.
      const totalRevenueAllTime = entries.reduce((sum, e) => sum + e.amount, 0);
      const totalPaymentsAllTime = transactions
        .filter(t => t.type === TransactionType.CREDIT)
        .reduce((sum, t) => sum + t.amount, 0);
      
      const outstandingBalance = totalRevenueAllTime - totalPaymentsAllTime;

      setStats({
        activeCustomers,
        todayMilk,
        monthMilk,
        monthRevenue,
        outstandingBalance
      });

      // Prepare Chart Data (Last 7 Days)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = addDays(new Date(), -(6 - i));
        const dateStr = format(d, 'yyyy-MM-dd');
        const dayEntries = entries.filter(e => e.date === dateStr);
        return {
          name: format(d, 'MMM dd'),
          milk: dayEntries.reduce((sum, e) => sum + e.quantity, 0),
          revenue: dayEntries.reduce((sum, e) => sum + e.amount, 0)
        };
      });

      setChartData(last7Days);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading dashboard...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
          <p className="text-slate-500">Welcome back, here is your daily overview.</p>
        </div>
        <button onClick={loadData} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-sm font-medium">
          Refresh Data
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Today's Milk" 
          value={`${stats.todayMilk.toFixed(1)} L`} 
          subtitle="Collected today" 
          icon={Droplets} 
          color="blue" 
        />
        <StatCard 
          title="Active Customers" 
          value={stats.activeCustomers} 
          subtitle="Total Active Profiles" 
          icon={Users} 
          color="green" 
        />
        <StatCard 
          title="Est. Outstanding" 
          value={`$${stats.outstandingBalance.toLocaleString()}`} 
          subtitle="Pending Payments" 
          icon={AlertCircle} 
          color="orange" 
        />
        <StatCard 
          title="Monthly Revenue" 
          value={`$${stats.monthRevenue.toLocaleString()}`} 
          subtitle="Current Month Est." 
          icon={TrendingUp} 
          color="purple" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Milk Collection (Last 7 Days)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="milk" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Revenue Trend (Last 7 Days)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Line type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}