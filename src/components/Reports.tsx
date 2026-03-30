import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Transaction } from '../types';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { useSettings } from '../hooks/useSettings';
import { Download, FileText, Calendar, Filter, Search, Edit2, Trash2, X } from 'lucide-react';
import { AddEntry } from './AddEntry';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export const Reports: React.FC = () => {
  const { settings } = useSettings();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const fixOldData = async () => {
      try {
        const q = query(collection(db, 'transactions'));
        const snapshot = await getDocs(q);
        snapshot.forEach(async (d) => {
          const data = d.data();
          if (data.type === 'income' && data.category === 'অর্ডার (লাভ-ক্ষতি)' && data.title && data.title.startsWith('অর্ডার (ক্রয়)')) {
            const newTitle = data.title.replace('অর্ডার (ক্রয়)', 'অর্ডার (বিক্রয়)');
            await updateDoc(doc(db, 'transactions', d.id), { title: newTitle });
          }
        });
      } catch (error) {
        console.error('Error fixing old data:', error);
      }
    };
    fixOldData();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'transactions'), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
    });
    return unsub;
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDoc(doc(db, 'transactions', deleteId));
      setDeleteId(null);
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  useEffect(() => {
    let filtered = transactions;
    if (searchTerm) {
      filtered = filtered.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()) || t.category.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (typeFilter !== 'all') {
      filtered = filtered.filter(t => t.type === typeFilter);
    }
    if (dateFilter !== 'all') {
      const now = new Date();
      if (dateFilter === 'this-month') {
        filtered = filtered.filter(t => new Date(t.date).getMonth() === now.getMonth() && new Date(t.date).getFullYear() === now.getFullYear());
      } else if (dateFilter === 'this-year') {
        filtered = filtered.filter(t => new Date(t.date).getFullYear() === now.getFullYear());
      }
    }
    setFilteredTransactions(filtered);
  }, [transactions, searchTerm, typeFilter, dateFilter]);

  const exportToExcel = () => {
    const data = filteredTransactions.map(t => ({
      Date: t.date,
      Title: t.title,
      Type: t.type.toUpperCase(),
      Category: t.category,
      Amount: t.amount,
      Note: t.note
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transactions");
    XLSX.writeFile(wb, `PartnerPay_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("PartnerPay Report", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);
    
    const tableData = filteredTransactions.map(t => [
      t.date,
      t.title,
      t.type.toUpperCase(),
      t.category,
      formatCurrency(t.amount, settings.currency)
    ]);

    (doc as any).autoTable({
      head: [['Date', 'Title', 'Type', 'Category', 'Amount']],
      body: tableData,
      startY: 30,
      theme: 'grid',
      headStyles: { fillStyle: '#18181b' }
    });

    doc.save(`PartnerPay_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-8">
      {/* Edit Modal */}
      {editingId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <AddEntry editId={editingId} onClose={() => setEditingId(null)} />
          </div>
        </div>
      )}

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">রিপোর্ট ও ইতিহাস</h2>
          <p className="text-zinc-500">আপনার ডেটা বিশ্লেষণ এবং এক্সপোর্ট করুন</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportToExcel}
            className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-100 transition-all text-sm"
          >
            <Download className="w-4 h-4" />
            এক্সেল
          </button>
          <button
            onClick={exportToPDF}
            className="bg-rose-50 text-rose-600 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-rose-100 transition-all text-sm"
          >
            <FileText className="w-4 h-4" />
            পিডিএফ
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
          <input
            type="text"
            placeholder="লেনদেন খুঁজুন..."
            className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="text-zinc-400 w-4 h-4" />
          <select
            className="flex-1 px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none text-sm"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
          >
            <option value="all">সব ধরন</option>
            <option value="income">শুধুমাত্র ইনকাম</option>
            <option value="expense">শুধুমাত্র খরচ</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="text-zinc-400 w-4 h-4" />
          <select
            className="flex-1 px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none text-sm"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="all">সব সময়</option>
            <option value="this-month">এই মাস</option>
            <option value="this-year">এই বছর</option>
          </select>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wider border-b border-zinc-100">
                <th className="px-6 py-4 font-bold">তারিখ</th>
                <th className="px-6 py-4 font-bold">শিরোনাম</th>
                <th className="px-6 py-4 font-bold">ক্যাটাগরি</th>
                <th className="px-6 py-4 font-bold">পরিমাণ</th>
                <th className="px-6 py-4 font-bold">ধরন</th>
                <th className="px-6 py-4 font-bold text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {filteredTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-zinc-50 transition-colors group">
                  <td className="px-6 py-4 text-sm text-zinc-500">{formatDate(t.date)}</td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-zinc-900">{t.title}</p>
                    {t.note && <p className="text-xs text-zinc-400 line-clamp-1">{t.note}</p>}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-zinc-100 text-zinc-600 rounded-lg text-[10px] font-bold uppercase">
                      {t.category}
                    </span>
                  </td>
                  <td className={cn(
                    "px-6 py-4 text-sm font-bold",
                    t.type === 'income' ? "text-emerald-600" : "text-rose-600"
                  )}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount, settings.currency)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded-lg text-[10px] font-bold uppercase",
                      t.type === 'income' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                    )}>
                      {t.type === 'income' ? 'ইনকাম' : 'খরচ'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 transition-opacity">
                      <button
                        onClick={() => t.id && setEditingId(t.id)}
                        className="p-2 text-zinc-400 hover:text-blue-600 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => t.id && setDeleteId(t.id)}
                        className="p-2 text-zinc-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-400">কোনো লেনদেন পাওয়া যায়নি</td>
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
            <h3 className="text-xl font-bold text-zinc-900 text-center mb-2">লেনদেন ডিলিট করুন</h3>
            <p className="text-zinc-500 text-center mb-8">
              আপনি কি নিশ্চিত যে আপনি এই লেনদেনটি ডিলিট করতে চান?
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
