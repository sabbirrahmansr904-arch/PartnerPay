import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Transaction, Investment, ProfitShare } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { Wallet, TrendingUp, TrendingDown, PieChart, Landmark, Users } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export const Balance: React.FC<{ setActiveTab?: (tab: string) => void }> = ({ setActiveTab }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [shares, setShares] = useState<ProfitShare[]>([]);
  const { settings } = useSettings();

  useEffect(() => {
    const q = query(collection(db, 'transactions'), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(data);
    });

    const qInv = query(collection(db, 'investments'), orderBy('date', 'desc'));
    const unsubInv = onSnapshot(qInv, (snapshot) => {
      setInvestments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Investment)));
    });

    const qShares = query(collection(db, 'profit_shares'), orderBy('date', 'desc'));
    const unsubShares = onSnapshot(qShares, (snapshot) => {
      setShares(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProfitShare)));
    });

    return () => {
      unsub();
      unsubInv();
      unsubShares();
    };
  }, []);

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const totalInvestment = investments.reduce((sum, i) => sum + i.amount, 0);
  const totalOrderProfit = shares.reduce((sum, s) => sum + s.totalProfit, 0);
  const currentBalance = totalInvestment + totalIncome - totalExpense;
  const profitPerPartner = totalOrderProfit / 3;

  const categoryData = settings.categories.map(cat => {
    const amount = transactions
      .filter(t => t.category === cat)
      .reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);
    return { name: cat, value: Math.abs(amount), actual: amount };
  }).filter(c => c.value > 0);

  // Add investment as a category for the breakdown if it exists
  if (totalInvestment > 0) {
    categoryData.unshift({ name: 'ইনভেস্টমেন্ট', value: totalInvestment, actual: totalInvestment });
  }

  const COLORS = ['#3b82f6', '#10b981', '#f43f5e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-bold text-zinc-900">মোট ব্যালেন্স</h2>
        <p className="text-zinc-500">আপনার ব্যবসার বর্তমান আর্থিক অবস্থা</p>
      </header>

      {/* Main Balance Card */}
      <div className="bg-zinc-900 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden border border-zinc-800">
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-zinc-400 mb-2">
            <Wallet className="w-5 h-5" />
            <span className="text-sm font-medium uppercase tracking-wider">সর্বমোট বর্তমান ব্যালেন্স</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight text-white">
            {formatCurrency(currentBalance, settings.currency)}
          </h1>
          <p className="text-zinc-400 mt-2 text-sm font-medium">ইনভেস্টমেন্ট সহ আপনার ব্যবসার মোট নগদ অর্থ</p>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mt-12 pt-8 border-t border-white/10">
            <div>
              <div className="flex items-center gap-2 text-blue-400 mb-1">
                <Landmark className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-widest">মোট ইনভেস্টমেন্ট</span>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(totalInvestment, settings.currency)}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-emerald-400 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-widest">মোট ইনকাম</span>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(totalIncome, settings.currency)}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-rose-400 mb-1">
                <TrendingDown className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-widest">মোট খরচ</span>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(totalExpense, settings.currency)}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-amber-400 mb-1">
                <Users className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-widest">প্রতি পার্টনার প্রফিট</span>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(profitPerPartner, settings.currency)}</p>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Category Breakdown */}
        <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
          <div className="flex items-center gap-2 mb-8">
            <PieChart className="w-5 h-5 text-zinc-400" />
            <h3 className="text-lg font-bold text-zinc-900">ক্যাটাগরি ভিত্তিক ব্যালেন্স</h3>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value, settings.currency)}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </RePieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Details List */}
        <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-zinc-900">বিস্তারিত হিসাব</h3>
            <button 
              onClick={() => setActiveTab?.('reports')}
              className="text-sm font-medium text-zinc-500 hover:text-zinc-900"
            >
              সব দেখুন
            </button>
          </div>
          <div className="space-y-4">
            {categoryData.map((cat, i) => (
              <div key={cat.name} className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="font-medium text-zinc-700">{cat.name}</span>
                </div>
                <span className={cn(
                  "font-bold",
                  cat.actual >= 0 ? "text-emerald-600" : "text-rose-600"
                )}>
                  {formatCurrency(cat.actual, settings.currency)}
                </span>
              </div>
            ))}
            {categoryData.length === 0 && (
              <p className="text-center text-zinc-400 py-12">কোনো ডেটা পাওয়া যায়নি</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
