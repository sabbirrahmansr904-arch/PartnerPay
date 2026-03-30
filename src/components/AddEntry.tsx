import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { TransactionType, Transaction } from '../types';
import { useSettings } from '../hooks/useSettings';
import { Plus, Image as ImageIcon, Loader2, CheckCircle2, Save, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface AddEntryProps {
  editId?: string;
  onClose?: () => void;
}

export const AddEntry: React.FC<AddEntryProps> = ({ editId, onClose }) => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [type, setType] = useState<TransactionType>('income');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!editId);

  useEffect(() => {
    if (editId) {
      const fetchTransaction = async () => {
        try {
          const docRef = doc(db, 'transactions', editId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data() as Transaction;
            setTitle(data.title || '');
            setAmount(data.amount?.toString() || '');
            setType(data.type || 'income');
            setCategory(data.category || '');
            setDate(data.date || new Date().toISOString().split('T')[0]);
            setNote(data.note || '');
          }
        } catch (error) {
          console.error('Error fetching transaction:', error);
        } finally {
          setInitialLoading(false);
        }
      };
      fetchTransaction();
    }
  }, [editId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      let receiptUrl = '';
      if (file) {
        const storageRef = ref(storage, `receipts/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        receiptUrl = await getDownloadURL(storageRef);
      }

      const transactionData: any = {
        title,
        amount: parseFloat(amount),
        type,
        category: category || settings.categories[0],
        date,
        note,
        updatedAt: serverTimestamp(),
      };

      if (receiptUrl) {
        transactionData.receiptUrl = receiptUrl;
      }

      if (editId) {
        await updateDoc(doc(db, 'transactions', editId), transactionData);
      } else {
        await addDoc(collection(db, 'transactions'), {
          ...transactionData,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
        });
      }

      setSuccess(true);
      if (!editId) {
        setTitle('');
        setAmount('');
        setNote('');
        setFile(null);
      }
      
      setTimeout(() => {
        setSuccess(false);
        if (editId && onClose) onClose();
      }, 1500);
    } catch (error) {
      console.error('Error saving entry:', error);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className={cn("max-w-2xl mx-auto space-y-8", editId && "p-4")}>
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">
            {editId ? 'এন্ট্রি এডিট করুন' : 'নতুন এন্ট্রি যোগ করুন'}
          </h2>
          <p className="text-zinc-500">
            {editId ? 'লেনদেনের তথ্য পরিবর্তন করুন' : 'একটি নতুন ইনকাম বা খরচ রেকর্ড করুন'}
          </p>
        </div>
        {editId && onClose && (
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-zinc-500" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm space-y-6">
        {/* Type Toggle */}
        <div className="flex p-1 bg-zinc-100 rounded-2xl">
          <button
            type="button"
            onClick={() => setType('income')}
            className={cn(
              "flex-1 py-3 rounded-xl font-bold transition-all",
              type === 'income' ? "bg-white text-emerald-600 shadow-sm" : "text-zinc-500"
            )}
          >
            ইনকাম
          </button>
          <button
            type="button"
            onClick={() => setType('expense')}
            className={cn(
              "flex-1 py-3 rounded-xl font-bold transition-all",
              type === 'expense' ? "bg-white text-rose-600 shadow-sm" : "text-zinc-500"
            )}
          >
            খরচ
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700">শিরোনাম</label>
            <input
              type="text"
              required
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none"
              placeholder="যেমন: অফিসের ভাড়া"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700">পরিমাণ ({settings.currency})</label>
            <input
              type="number"
              required
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700">ক্যাটাগরি</label>
            <select
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {settings.categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700">তারিখ</label>
            <input
              type="date"
              required
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-700">নোট (ঐচ্ছিক)</label>
          <textarea
            className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none min-h-[100px]"
            placeholder="কিছু বিস্তারিত লিখুন..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-700">রসিদ / ছবি</label>
          <div className="relative">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              id="file-upload"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <label
              htmlFor="file-upload"
              className="flex items-center justify-center gap-2 w-full px-4 py-4 border-2 border-dashed border-zinc-200 rounded-2xl hover:border-zinc-400 hover:bg-zinc-50 transition-all cursor-pointer"
            >
              <ImageIcon className="w-5 h-5 text-zinc-400" />
              <span className="text-sm text-zinc-500">
                {file ? file.name : 'রসিদ আপলোড করতে ক্লিক করুন'}
              </span>
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={cn(
            "w-full py-4 rounded-2xl font-bold text-white transition-all flex items-center justify-center gap-2",
            type === 'income' ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700",
            loading && "opacity-70 cursor-not-allowed"
          )}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : success ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : editId ? (
            <Save className="w-5 h-5" />
          ) : (
            <Plus className="w-5 h-5" />
          )}
          {loading ? 'সেভ হচ্ছে...' : success ? 'সফলভাবে সেভ হয়েছে!' : editId ? 'আপডেট করুন' : `${type === 'income' ? 'ইনকাম' : 'খরচ'} যোগ করুন`}
        </button>
      </form>
    </div>
  );
};
