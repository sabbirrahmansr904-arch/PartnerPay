import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Investment, ProfitShare } from '../types';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { useSettings } from '../hooks/useSettings';
import { Users, Plus, Trash2, PieChart as PieChartIcon, Edit2, X, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export const Partners: React.FC<{ setActiveTab?: (tab: string) => void }> = ({ setActiveTab }) => {
  const { settings } = useSettings();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [shares, setShares] = useState<ProfitShare[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState('A');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (editingId) {
      const inv = investments.find(i => i.id === editingId);
      if (inv) {
        setPartnerId(inv.partnerId || 'A');
        setAmount(inv.amount?.toString() || '');
        setDate(inv.date || new Date().toISOString().split('T')[0]);
        setNote(inv.note || '');
        setShowAdd(true);
      }
    }
  }, [editingId, investments]);

  useEffect(() => {
    const q = query(collection(db, 'investments'), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setInvestments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Investment)));
    });

    const qShares = query(collection(db, 'profit_shares'), orderBy('date', 'desc'));
    const unsubShares = onSnapshot(qShares, (snapshot) => {
      setShares(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProfitShare)));
    });

    return () => {
      unsub();
      unsubShares();
    };
  }, []);

  const totalA = investments.filter(i => i.partnerId === 'A').reduce((sum, i) => sum + i.amount, 0);
  const totalB = investments.filter(i => i.partnerId === 'B').reduce((sum, i) => sum + i.amount, 0);
  const totalC = investments.filter(i => i.partnerId === 'C').reduce((sum, i) => sum + i.amount, 0);
  const totalInvestment = totalA + totalB + totalC;

  const totalProfit = shares.reduce((sum, s) => sum + s.totalProfit, 0);
  const profitPerPartner = totalProfit / 3;

  const chartData = [
    { name: settings.partnerAName, value: totalA, color: '#3b82f6' },
    { name: settings.partnerBName, value: totalB, color: '#10b981' },
    { name: settings.partnerCName, value: totalC, color: '#f59e0b' },
  ].filter(d => d.value > 0);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const partnerName = partnerId === 'A' ? settings.partnerAName : partnerId === 'B' ? settings.partnerBName : settings.partnerCName;
    
    const investmentData = {
      partnerId,
      partnerName,
      amount: parseFloat(amount),
      date,
      note,
    };

    if (editingId) {
      await updateDoc(doc(db, 'investments', editingId), investmentData);
      setEditingId(null);
    } else {
      await addDoc(collection(db, 'investments'), investmentData);
    }

    setShowAdd(false);
    setAmount('');
    setNote('');
  };

  const handleCancel = () => {
    setShowAdd(false);
    setEditingId(null);
    setAmount('');
    setNote('');
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDoc(doc(db, 'investments', deleteId));
      setDeleteId(null);
    } catch (error) {
      console.error('Error deleting investment:', error);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">পার্টনার ইনভেস্টমেন্ট ও প্রফিট</h2>
          <p className="text-zinc-500">মূলধন অবদান ও লাভ বন্টন ট্র্যাক করুন</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="bg-zinc-900 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-zinc-800 transition-all"
        >
          <Plus className="w-5 h-5" />
          ইনভেস্টমেন্ট যোগ করুন
        </button>
      </header>

      {/* Profit Sharing Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { name: settings.partnerAName, color: 'bg-blue-50 text-blue-700 border-blue-100' },
          { name: settings.partnerBName, color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
          { name: settings.partnerCName, color: 'bg-amber-50 text-amber-700 border-amber-100' },
        ].map((p, i) => (
          <div key={i} className={`p-6 rounded-3xl border ${p.color}`}>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">{p.name} এর মোট প্রফিট অংশ</span>
            </div>
            <p className="text-2xl font-black">{formatCurrency(profitPerPartner, settings.currency)}</p>
          </div>
        ))}
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-zinc-900">{editingId ? 'ইনভেস্টমেন্ট এডিট করুন' : 'নতুন ইনভেস্টমেন্ট'}</h3>
            <button type="button" onClick={handleCancel} className="p-1 hover:bg-zinc-100 rounded-full">
              <X className="w-5 h-5 text-zinc-500" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700">পার্টনার</label>
              <select
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none"
                value={partnerId}
                onChange={(e) => setPartnerId(e.target.value)}
              >
                <option value="A">{settings.partnerAName}</option>
                <option value="B">{settings.partnerBName}</option>
                <option value="C">{settings.partnerCName}</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700">পরিমাণ</label>
              <input
                type="number"
                required
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700">তারিখ</label>
              <input
                type="date"
                required
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <button type="submit" className="bg-zinc-900 text-white py-2 rounded-xl font-bold">
              {editingId ? 'আপডেট করুন' : 'সেভ করুন'}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Investment Summary */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
            <h3 className="text-lg font-bold text-zinc-900 mb-6">মোট ইনভেস্টমেন্ট</h3>
            <p className="text-4xl font-bold text-zinc-900">{formatCurrency(totalInvestment, settings.currency)}</p>
            
            <div className="mt-8 space-y-4">
              {[
                { name: settings.partnerAName, value: totalA, color: 'bg-blue-500' },
                { name: settings.partnerBName, value: totalB, color: 'bg-emerald-500' },
                { name: settings.partnerCName, value: totalC, color: 'bg-amber-500' },
              ].map((p, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-full", p.color)} />
                    <span className="text-sm font-medium text-zinc-600">{p.name}</span>
                  </div>
                  <span className="text-sm font-bold text-zinc-900">{formatCurrency(p.value, settings.currency)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm h-[300px]">
            <h3 className="text-lg font-bold text-zinc-900 mb-4">শেয়ার বন্টন</h3>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Investment History */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-zinc-900">ইনভেস্টমেন্ট ইতিহাস</h3>
            <button 
              onClick={() => setActiveTab?.('reports')}
              className="text-sm font-medium text-zinc-500 hover:text-zinc-900"
            >
              সব দেখুন
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-zinc-500 text-sm border-b border-zinc-100">
                  <th className="pb-4 font-medium">পার্টনার</th>
                  <th className="pb-4 font-medium">পরিমাণ</th>
                  <th className="pb-4 font-medium">তারিখ</th>
                  <th className="pb-4 font-medium text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {investments.map((inv) => (
                  <tr key={inv.id} className="group hover:bg-zinc-50 transition-colors">
                    <td className="py-4 font-bold text-zinc-900">{inv.partnerName}</td>
                    <td className="py-4 text-zinc-900">{formatCurrency(inv.amount, settings.currency)}</td>
                    <td className="py-4 text-zinc-500 text-sm">{formatDate(inv.date)}</td>
                    <td className="py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => inv.id && setEditingId(inv.id)}
                          className="p-2 text-zinc-400 hover:text-blue-600 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => inv.id && setDeleteId(inv.id)}
                          className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {investments.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-zinc-400">কোনো ইনভেস্টমেন্ট রেকর্ড নেই</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 className="w-8 h-8 text-rose-600" />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 text-center mb-2">ইনভেস্টমেন্ট ডিলিট করুন</h3>
            <p className="text-zinc-500 text-center mb-8">
              আপনি কি নিশ্চিত যে আপনি এই ইনভেস্টমেন্টটি ডিলিট করতে চান?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-3 bg-zinc-100 text-zinc-600 rounded-xl font-bold hover:bg-zinc-200 transition-all"
              >
                বাতিল
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-200"
              >
                ডিলিট করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
