import React, { useState } from 'react';
import { useSettings } from '../hooks/useSettings';
import { Save, User, DollarSign, Tag, Plus, X, Trash2, AlertTriangle } from 'lucide-react';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { cn } from '../lib/utils';

export const Settings: React.FC = () => {
  const { settings, updateSettings, loading } = useSettings();
  const [partnerAName, setPartnerAName] = useState(settings.partnerAName || '');
  const [partnerBName, setPartnerBName] = useState(settings.partnerBName || '');
  const [partnerCName, setPartnerCName] = useState(settings.partnerCName || '');
  const [currency, setCurrency] = useState(settings.currency || 'BDT');
  const [newCategory, setNewCategory] = useState('');
  const [categories, setCategories] = useState(settings.categories || []);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [clearSuccess, setClearSuccess] = useState(false);

  // Sync local state with settings when they are loaded or updated
  React.useEffect(() => {
    if (!loading) {
      setPartnerAName(settings.partnerAName || '');
      setPartnerBName(settings.partnerBName || '');
      setPartnerCName(settings.partnerCName || '');
      setCurrency(settings.currency || 'BDT');
      setCategories(settings.categories || []);
    }
  }, [settings, loading]);

  const handleSave = async () => {
    setSaving(true);
    await updateSettings({
      partnerAName,
      partnerBName,
      partnerCName,
      currency,
      categories,
    });
    setSaving(false);
  };

  const handleClearAllData = async () => {
    setClearing(true);
    try {
      // Clear transactions
      const transSnap = await getDocs(collection(db, 'transactions'));
      const transDeletes = transSnap.docs.map(d => deleteDoc(doc(db, 'transactions', d.id)));
      
      // Clear investments
      const invSnap = await getDocs(collection(db, 'investments'));
      const invDeletes = invSnap.docs.map(d => deleteDoc(doc(db, 'investments', d.id)));

      // Clear orders
      const orderSnap = await getDocs(collection(db, 'orders'));
      const orderDeletes = orderSnap.docs.map(d => deleteDoc(doc(db, 'orders', d.id)));
      
      await Promise.all([...transDeletes, ...invDeletes, ...orderDeletes]);
      setClearSuccess(true);
      setShowConfirmClear(false);
      setTimeout(() => setClearSuccess(false), 3000);
    } catch (error) {
      console.error('Error clearing data:', error);
    } finally {
      setClearing(false);
    }
  };

  const addCategory = () => {
    if (newCategory && !categories.includes(newCategory)) {
      setCategories([...categories, newCategory]);
      setNewCategory('');
    }
  };

  const removeCategory = (cat: string) => {
    setCategories(categories.filter(c => c !== cat));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900">সেটিংস</h2>
        <p className="text-zinc-500">আপনার লেজার অভিজ্ঞতা কাস্টমাইজ করুন</p>
      </div>

      <div className="space-y-6">
        {/* Partner Names */}
        <section className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-5 h-5 text-zinc-400" />
            <h3 className="font-bold text-zinc-900">পার্টনারদের নাম</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-500">পার্টনার A</label>
              <input
                type="text"
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900"
                value={partnerAName}
                onChange={(e) => setPartnerAName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-500">পার্টনার B</label>
              <input
                type="text"
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900"
                value={partnerBName}
                onChange={(e) => setPartnerBName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-500">পার্টনার C</label>
              <input
                type="text"
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900"
                value={partnerCName}
                onChange={(e) => setPartnerCName(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Currency */}
        <section className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-zinc-400" />
            <h3 className="font-bold text-zinc-900">কারেন্সি</h3>
          </div>
          <div className="max-w-xs">
            <select
              className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              <option value="BDT">BDT (৳)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="INR">INR (₹)</option>
            </select>
          </div>
        </section>

        {/* Categories */}
        <section className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="w-5 h-5 text-zinc-400" />
            <h3 className="font-bold text-zinc-900">লেনদেনের ক্যাটাগরি</h3>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <span key={cat} className="flex items-center gap-1 px-3 py-1 bg-zinc-100 text-zinc-700 rounded-full text-sm font-medium">
                {cat}
                <button onClick={() => removeCategory(cat)} className="hover:text-red-500">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          <div className="flex gap-2 max-w-xs">
            <input
              type="text"
              placeholder="নতুন ক্যাটাগরি..."
              className="flex-1 px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 text-sm"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addCategory()}
            />
            <button
              onClick={addCategory}
              className="p-2 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </section>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all disabled:opacity-70"
        >
          <Save className="w-5 h-5" />
          {saving ? 'সেভ হচ্ছে...' : 'সব সেটিংস সেভ করুন'}
        </button>

        {/* Danger Zone */}
        <section className="mt-12 pt-8 border-t border-zinc-200 space-y-4">
          <div className="flex items-center gap-2 text-rose-600">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="font-bold">ডেঞ্জার জোন</h3>
          </div>
          <div className="bg-rose-50 p-6 rounded-3xl border border-rose-100 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <p className="font-bold text-rose-900">সমস্ত ডেটা মুছে ফেলুন</p>
              <p className="text-sm text-rose-600">এটি আপনার সমস্ত লেনদেন এবং ইনভেস্টমেন্ট রেকর্ড ডিলিট করে দেবে।</p>
            </div>
            {showConfirmClear ? (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowConfirmClear(false)}
                  className="px-4 py-2 bg-zinc-200 text-zinc-700 rounded-xl font-bold hover:bg-zinc-300 transition-all"
                >
                  বাতিল
                </button>
                <button
                  onClick={handleClearAllData}
                  disabled={clearing}
                  className="px-4 py-2 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-all disabled:opacity-70"
                >
                  {clearing ? 'মুছে ফেলা হচ্ছে...' : 'হ্যাঁ, মুছুন'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowConfirmClear(true)}
                className="px-6 py-3 bg-rose-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-rose-700 transition-all whitespace-nowrap"
              >
                <Trash2 className="w-4 h-4" />
                {clearSuccess ? 'সফলভাবে মুছে ফেলা হয়েছে' : 'সব ডেটা মুছুন'}
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
