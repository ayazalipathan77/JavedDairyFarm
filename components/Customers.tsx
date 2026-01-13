import React, { useEffect, useState } from 'react';
import { dbService } from '../services/db';
import { Customer, UserRole } from '../types';
import { Plus, Search, Phone, MapPin, Edit2, Trash2, CheckCircle, XCircle, Droplet } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState<Partial<Customer>>({
    name: '',
    phone: '',
    address: '',
    rate: 100,
    defaultQuantity: 0,
    isActive: true
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const { role } = useAuth();

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    const data = await dbService.getCustomers();
    setCustomers(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    const customer: Customer = {
      id: editingId || crypto.randomUUID(),
      name: formData.name,
      phone: formData.phone || '',
      address: formData.address || '',
      rate: Number(formData.rate) || 0,
      defaultQuantity: Number(formData.defaultQuantity) || 0,
      isActive: formData.isActive ?? true,
      createdAt: editingId ? (customers.find(c => c.id === editingId)?.createdAt || new Date().toISOString()) : new Date().toISOString()
    };

    await dbService.saveCustomer(customer);
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ name: '', phone: '', address: '', rate: 100, defaultQuantity: 0, isActive: true });
    loadCustomers();
  };

  const handleEdit = (customer: Customer) => {
    setFormData(customer);
    setEditingId(customer.id);
    setIsModalOpen(true);
  };

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-900">Customers</h2>
        <button 
          onClick={() => {
            setEditingId(null);
            setFormData({ name: '', phone: '', address: '', rate: 100, defaultQuantity: 0, isActive: true });
            setIsModalOpen(true);
          }}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-brand-700 transition-colors shadow-sm"
        >
          <Plus size={20} />
          Add Customer
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Search by name or phone..." 
          className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Customer List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(customer => (
          <div key={customer.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative group">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg ${customer.isActive ? 'bg-brand-500' : 'bg-slate-400'}`}>
                  {customer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{customer.name}</h3>
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <span className={`w-2 h-2 rounded-full ${customer.isActive ? 'bg-green-500' : 'bg-red-400'}`}></span>
                    {customer.isActive ? 'Active' : 'Inactive'}
                  </div>
                </div>
              </div>
              {role === UserRole.ADMIN && (
                <button onClick={() => handleEdit(customer)} className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg">
                  <Edit2 size={18} />
                </button>
              )}
            </div>
            
            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <Phone size={16} className="text-slate-400" />
                <a href={`https://wa.me/${customer.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="hover:text-green-600 hover:underline">
                  {customer.phone || 'No Phone'}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-slate-400" />
                <span className="truncate">{customer.address || 'No Address'}</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
              <div className="text-xs text-slate-500">
                Rate: <span className="font-semibold text-slate-900">${customer.rate}/L</span>
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-1">
                <Droplet size={12} className="text-blue-400" />
                Def: <span className="font-semibold text-slate-900">{customer.defaultQuantity || 0}L</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold mb-4">{editingId ? 'Edit Customer' : 'New Customer'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input 
                  required
                  type="text" 
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone (WhatsApp)</label>
                  <input 
                    type="tel" 
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Rate / Unit</label>
                  <input 
                    type="number" 
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                    value={formData.rate}
                    onChange={e => setFormData({...formData, rate: parseFloat(e.target.value)})}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Default Quantity (L)</label>
                <div className="relative">
                  <Droplet className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="number" 
                    step="0.5"
                    className="w-full pl-10 pr-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                    value={formData.defaultQuantity}
                    onChange={e => setFormData({...formData, defaultQuantity: parseFloat(e.target.value)})}
                    placeholder="0"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">Automatically pre-fills the daily entry quantity.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                <textarea 
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                  rows={2}
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                />
              </div>

              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="isActive"
                  checked={formData.isActive}
                  onChange={e => setFormData({...formData, isActive: e.target.checked})}
                  className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-slate-700">Active Customer</label>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}