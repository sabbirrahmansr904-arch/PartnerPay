import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Transaction, Investment, ProfitShare } from '../types';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { TrendingUp, TrendingDown, Wallet, Users, ArrowRight, Landmark } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const Dashboard: React.FC<{ setActiveTab?: (tab: string) => void }> = ({ setActiveTab }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [shares, setShares] = useState<ProfitShare[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const { settings } = useSettings();

  useEffect(() => {
    const transPath = 'transactions';
    const q = query(collection(db, transPath), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(data);
      setRecentTransactions(data.slice(0, 5));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, transPath);
    });

    const invPath = 'investments';
    const qInv = query(collection(db, invPath), orderBy('date', 'desc'));
    const unsubInv = onSnapshot(qInv, (snapshot) => {
      setInvestments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Investment)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, invPath);
    });

    const sharesPath = 'profit_shares';
    const qShares = query(collection(db, sharesPath), orderBy('date', 'desc'));
    const unsubShares = onSnapshot(qShares, (snapshot) => {
      setShares(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProfitShare)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, sharesPath);
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
  const netProfit = totalIncome - totalExpense;
  const currentBalance = totalInvestment + netProfit;
  const profitPerPartner = totalOrderProfit / 3;

  const stats = [
    { label: 'মোট ইনভেস্টমেন্ট', value: totalInvestment, icon: Landmark, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'মোট ইনকাম', value: totalIncome, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'মোট খরচ', value: totalExpense, icon: TrendingDown, color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'প্রতি পার্টনার প্রফিট', value: profitPerPartner, icon: Users, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'বর্তমান ব্যালেন্স', value: currentBalance, icon: Wallet, color: 'text-white', bg: 'bg-zinc-900' },
  ];

  const chartData = [
    { name: 'ইনভেস্টমেন্ট', value: totalInvestment, color: '#3b82f6' },
    { name: 'ইনকাম', value: totalIncome, color: '#10b981' },
    { name: 'খরচ', value: totalExpense, color: '#f43f5e' },
    { name: 'প্রফিট', value: netProfit, color: netProfit >= 0 ? '#10b981' : '#f43f5e' },
  ];

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">ড্যাশবোর্ড</h2>
          <p className="text-zinc-500">রিয়েল-টাইম ব্যবসার ওভারভিউ</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-xl border border-zinc-200 shadow-sm">
          <span className="text-sm font-medium text-zinc-600">কারেন্সি: </span>
          <span className="text-sm font-bold text-zinc-900">{settings.currency}</span>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className={cn(
            "p-6 rounded-3xl border shadow-sm hover:shadow-md transition-shadow",
            stat.label === 'বর্তমান ব্যালেন্স' ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"
          )}>
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4", stat.bg)}>
              <stat.icon className={cn("w-6 h-6", stat.color)} />
            </div>
            <p className={cn("text-sm font-medium", stat.label === 'বর্তমান ব্যালেন্স' ? "text-zinc-400" : "text-zinc-500")}>{stat.label}</p>
            <p className={cn("text-2xl font-bold mt-1", stat.label === 'বর্তমান ব্যালেন্স' ? "text-white" : "text-zinc-900")}>
              {formatCurrency(stat.value, settings.currency)}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart Section */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
          <h3 className="text-lg font-bold text-zinc-900 mb-6">আর্থিক সারাংশ</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} />
                <Tooltip 
                  cursor={{ fill: '#f4f4f5' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={60}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-zinc-900">সাম্প্রতিক কার্যক্রম</h3>
            <button 
              onClick={() => setActiveTab?.('reports')}
              className="text-sm font-medium text-zinc-500 hover:text-zinc-900 flex items-center gap-1"
            >
              সব দেখুন <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-4">
            {recentTransactions.length === 0 ? (
              <p className="text-center text-zinc-400 py-8">এখনও কোনো লেনদেন নেই</p>
            ) : (
              recentTransactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 hover:bg-zinc-50 rounded-2xl transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      t.type === 'income' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                    )}>
                      {t.type === 'income' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-900 line-clamp-1">{t.title}</p>
                      <p className="text-xs text-zinc-500">{formatDate(t.date)}</p>
                    </div>
                  </div>
                  <p className={cn(
                    "text-sm font-bold",
                    t.type === 'income' ? "text-emerald-600" : "text-rose-600"
                  )}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount, settings.currency)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
