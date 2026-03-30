import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Transaction, Investment } from '../types';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { useSettings } from '../hooks/useSettings';
import { Calendar, TrendingUp, TrendingDown, Calculator, ArrowRight, FileText, Landmark, Wallet } from 'lucide-react';

export const ProfitLossStatement: React.FC = () => {
  const { settings } = useSettings();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const q = query(collection(db, 'transactions'), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
    });

    const qInv = query(collection(db, 'investments'), orderBy('date', 'desc'));
    const unsubInv = onSnapshot(qInv, (snapshot) => {
      setInvestments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Investment)));
    });

    return () => {
      unsub();
      unsubInv();
    };
  }, []);

  const filteredTransactions = transactions.filter(t => {
    const tDate = t.date;
    return tDate >= startDate && tDate <= endDate;
  });

  const incomeTransactions = filteredTransactions.filter(t => t.type === 'income');
  const expenseTransactions = filteredTransactions.filter(t => t.type === 'expense');

  const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalInvestment = investments.reduce((sum, i) => sum + i.amount, 0);
  const netProfit = totalIncome - totalExpense;
  const finalBalance = totalInvestment + netProfit;

  const incomeByCategory = settings.categories.map(cat => ({
    name: cat,
    amount: incomeTransactions.filter(t => t.category === cat).reduce((sum, t) => sum + t.amount, 0)
  })).filter(c => c.amount > 0);

  const expenseByCategory = settings.categories.map(cat => ({
    name: cat,
    amount: expenseTransactions.filter(t => t.category === cat).reduce((sum, t) => sum + t.amount, 0)
  })).filter(c => c.amount > 0);

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">লাভ-ক্ষতির হিসাব (P&L)</h2>
          <p className="text-zinc-500">নির্দিষ্ট সময়ের আয় ও ব্যয়ের বিস্তারিত বিবরণ</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-zinc-200 shadow-sm">
          <Calendar className="w-4 h-4 text-zinc-400 ml-2" />
          <input
            type="date"
            className="bg-transparent border-none outline-none text-sm font-medium p-1"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <ArrowRight className="w-4 h-4 text-zinc-300" />
          <input
            type="date"
            className="bg-transparent border-none outline-none text-sm font-medium p-1"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <Landmark className="w-5 h-5" />
            <span className="text-sm font-bold uppercase tracking-wider">মোট ইনভেস্টমেন্ট</span>
          </div>
          <p className="text-3xl font-black text-blue-700">{formatCurrency(totalInvestment, settings.currency)}</p>
        </div>
        <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
          <div className="flex items-center gap-2 text-emerald-600 mb-2">
            <TrendingUp className="w-5 h-5" />
            <span className="text-sm font-bold uppercase tracking-wider">মোট আয়</span>
          </div>
          <p className="text-3xl font-black text-emerald-700">{formatCurrency(totalIncome, settings.currency)}</p>
        </div>
        <div className="bg-rose-50 p-6 rounded-3xl border border-rose-100">
          <div className="flex items-center gap-2 text-rose-600 mb-2">
            <TrendingDown className="w-5 h-5" />
            <span className="text-sm font-bold uppercase tracking-wider">মোট ব্যয়</span>
          </div>
          <p className="text-3xl font-black text-rose-700">{formatCurrency(totalExpense, settings.currency)}</p>
        </div>
        <div className={cn(
          "p-6 rounded-3xl border",
          finalBalance >= 0 ? "bg-zinc-900 text-white" : "bg-amber-50 border-amber-100 text-amber-900"
        )}>
          <div className={cn(
            "flex items-center gap-2 mb-2",
            finalBalance >= 0 ? "text-zinc-400" : "text-amber-600"
          )}>
            <Wallet className="w-5 h-5" />
            <span className="text-sm font-bold uppercase tracking-wider">বর্তমান ব্যালেন্স</span>
          </div>
          <p className="text-3xl font-black">
            {formatCurrency(finalBalance, settings.currency)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Income Breakdown */}
        <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900">আয়ের উৎসসমূহ</h3>
          </div>
          <div className="space-y-4">
            {incomeByCategory.map((cat) => (
              <div key={cat.name} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600 font-medium">{cat.name}</span>
                  <span className="text-zinc-900 font-bold">{formatCurrency(cat.amount, settings.currency)}</span>
                </div>
                <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full" 
                    style={{ width: `${(cat.amount / (totalIncome || 1)) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {incomeByCategory.length === 0 && (
              <p className="text-center text-zinc-400 py-8">এই সময়ে কোনো আয় নেই</p>
            )}
          </div>
        </div>

        {/* Expense Breakdown */}
        <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-rose-100 rounded-full flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-rose-600" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900">ব্যয়ের খাতসমূহ</h3>
          </div>
          <div className="space-y-4">
            {expenseByCategory.map((cat) => (
              <div key={cat.name} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600 font-medium">{cat.name}</span>
                  <span className="text-zinc-900 font-bold">{formatCurrency(cat.amount, settings.currency)}</span>
                </div>
                <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-rose-500 rounded-full" 
                    style={{ width: `${(cat.amount / (totalExpense || 1)) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {expenseByCategory.length === 0 && (
              <p className="text-center text-zinc-400 py-8">এই সময়ে কোনো ব্যয় নেই</p>
            )}
          </div>
        </div>
      </div>

      {/* Category-wise Summary Table */}
      <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-zinc-500" />
            <h3 className="text-lg font-bold text-zinc-900">ক্যাটাগরি ভিত্তিক সারাংশ</h3>
          </div>
          <p className="text-xs text-zinc-500 font-medium">নির্বাচিত সময়ের জন্য</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50">
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-100">ক্যাটাগরি</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-100 text-right">আয়</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-100 text-right">ব্যয়</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-100 text-right">নিট</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {settings.categories.map(cat => {
                const income = incomeTransactions.filter(t => t.category === cat).reduce((sum, t) => sum + t.amount, 0);
                const expense = expenseTransactions.filter(t => t.category === cat).reduce((sum, t) => sum + t.amount, 0);
                const net = income - expense;

                if (income === 0 && expense === 0) return null;

                return (
                  <tr key={cat} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-zinc-900">{cat}</td>
                    <td className="px-6 py-4 text-sm text-emerald-600 font-bold text-right">
                      {income > 0 ? formatCurrency(income, settings.currency) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-rose-600 font-bold text-right">
                      {expense > 0 ? formatCurrency(expense, settings.currency) : '-'}
                    </td>
                    <td className={cn(
                      "px-6 py-4 text-sm font-black text-right",
                      net > 0 ? "text-emerald-700" : net < 0 ? "text-rose-700" : "text-zinc-400"
                    )}>
                      {net !== 0 ? formatCurrency(net, settings.currency) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-zinc-50/80 font-bold">
                <td className="px-6 py-4 text-sm text-zinc-900">মোট</td>
                <td className="px-6 py-4 text-sm text-emerald-700 text-right">{formatCurrency(totalIncome, settings.currency)}</td>
                <td className="px-6 py-4 text-sm text-rose-700 text-right">{formatCurrency(totalExpense, settings.currency)}</td>
                <td className={cn(
                  "px-6 py-4 text-sm text-right",
                  netProfit >= 0 ? "text-emerald-700" : "text-rose-700"
                )}>
                  {formatCurrency(netProfit, settings.currency)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Summary Table Card */}
      <div className="bg-zinc-900 text-white p-8 rounded-3xl shadow-xl">
        <div className="flex items-center gap-2 mb-6">
          <FileText className="w-5 h-5 text-zinc-400" />
          <h3 className="text-lg font-bold">সংক্ষিপ্ত বিবরণ</h3>
        </div>
        <div className="space-y-4">
          <div className="flex justify-between py-2 border-b border-white/10">
            <span className="text-zinc-400">মোট ইনভেস্টমেন্ট</span>
            <span className="font-bold">{formatCurrency(totalInvestment, settings.currency)}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-white/10">
            <span className="text-zinc-400">মোট লেনদেন সংখ্যা</span>
            <span className="font-bold">{filteredTransactions.length} টি</span>
          </div>
          <div className="flex justify-between py-2 border-b border-white/10">
            <span className="text-zinc-400">গড় ইনকাম (প্রতি লেনদেন)</span>
            <span className="font-bold">
              {formatCurrency(incomeTransactions.length ? totalIncome / incomeTransactions.length : 0, settings.currency)}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-white/10">
            <span className="text-zinc-400">গড় খরচ (প্রতি লেনদেন)</span>
            <span className="font-bold">
              {formatCurrency(expenseTransactions.length ? totalExpense / expenseTransactions.length : 0, settings.currency)}
            </span>
          </div>
          <div className="flex justify-between py-4 mt-4">
            <span className="text-xl font-bold">নিট ফলাফল (লাভ/ক্ষতি)</span>
            <span className={cn(
              "text-2xl font-black",
              netProfit >= 0 ? "text-emerald-400" : "text-rose-400"
            )}>
              {netProfit >= 0 ? 'লাভ: ' : 'ক্ষতি: '}
              {formatCurrency(Math.abs(netProfit), settings.currency)}
            </span>
          </div>
          <div className="flex justify-between py-4 mt-2 border-t border-white/20">
            <span className="text-xl font-bold">সর্বমোট ব্যালেন্স (ইনভেস্টমেন্ট সহ)</span>
            <span className={cn(
              "text-3xl font-black",
              finalBalance >= 0 ? "text-white" : "text-rose-400"
            )}>
              {formatCurrency(finalBalance, settings.currency)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
