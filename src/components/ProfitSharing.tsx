import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { ProfitShare } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';
import { useSettings } from '../hooks/useSettings';
import { Users, Calendar, TrendingUp, Search, Trash2, X } from 'lucide-react';

export const ProfitSharing: React.FC = () => {
  const { settings } = useSettings();
  const [shares, setShares] = useState<ProfitShare[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const path = 'profit_shares';
    const q = query(collection(db, path), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setShares(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProfitShare)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
    return unsub;
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDoc(doc(db, 'profit_shares', deleteId));
      setDeleteId(null);
    } catch (error) {
      console.error('Error deleting profit share:', error);
    }
  };

  const filteredShares = shares.filter(s => 
    s.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.productCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalProfit = shares.reduce((sum, s) => sum + s.totalProfit, 0);
  const sharePerPartner = totalProfit / 3;

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">লাভ বন্টন (Profit Sharing)</h2>
          <p className="text-zinc-500">অর্ডার ভিত্তিক লাভের অংশীদারিত্ব</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm flex items-center gap-6">
          <div className="text-center">
            <p className="text-xs text-zinc-500 font-bold uppercase">মোট লাভ</p>
            <p className="text-lg font-black text-emerald-600">{formatCurrency(totalProfit, settings.currency)}</p>
          </div>
          <div className="w-px h-8 bg-zinc-100" />
          <div className="text-center">
            <p className="text-xs text-zinc-500 font-bold uppercase">প্রতি পার্টনার</p>
            <p className="text-lg font-black text-blue-600">{formatCurrency(sharePerPartner, settings.currency)}</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { name: settings.partnerAName, color: 'bg-blue-50 text-blue-700 border-blue-100' },
          { name: settings.partnerBName, color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
          { name: settings.partnerCName, color: 'bg-amber-50 text-amber-700 border-amber-100' },
        ].map((p, i) => (
          <div key={i} className={`p-6 rounded-3xl border ${p.color}`}>
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">{p.name} এর অংশ</span>
            </div>
            <p className="text-2xl font-black">{formatCurrency(sharePerPartner, settings.currency)}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-zinc-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="font-bold text-zinc-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-zinc-400" />
            লাভ বন্টন তালিকা
          </h3>
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="সার্চ করুন..."
              className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 text-sm"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50">
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-100">তারিখ ও কাস্টমার</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-100">প্রোডাক্ট</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-100 text-right">মোট লাভ</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-100 text-right">প্রতি পার্টনার</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-100 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredShares.map((share) => (
                <tr key={share.id} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-zinc-900">{share.customerName}</span>
                      <span className="text-[10px] text-zinc-400 mt-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {formatDate(share.date)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-zinc-700">কোড: {share.productCode}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-bold text-emerald-600">
                      {formatCurrency(share.totalProfit, settings.currency)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-black text-zinc-900">
                        {formatCurrency(share.sharePerPartner, settings.currency)}
                      </span>
                      <div className="flex flex-col items-end mt-1 space-y-0.5">
                        <span className="text-[9px] text-zinc-400">{settings.partnerAName}: {formatCurrency(share.sharePerPartner, settings.currency)}</span>
                        <span className="text-[9px] text-zinc-400">{settings.partnerBName}: {formatCurrency(share.sharePerPartner, settings.currency)}</span>
                        <span className="text-[9px] text-zinc-400">{settings.partnerCName}: {formatCurrency(share.sharePerPartner, settings.currency)}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => share.id && setDeleteId(share.id)}
                      className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredShares.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-zinc-400">
                    কোনো লাভ বন্টন রেকর্ড পাওয়া যায়নি
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 className="w-8 h-8 text-rose-600" />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 text-center mb-2">লাভ বন্টন ডিলিট করুন</h3>
            <p className="text-zinc-500 text-center mb-8">
              আপনি কি নিশ্চিত যে আপনি এই লাভ বন্টন রেকর্ডটি ডিলিট করতে চান?
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
