import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { LogIn, Mail, Lock } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError('ভুল ইমেইল বা পাসওয়ার্ড। আবার চেষ্টা করুন।');
      } else if (err.code === 'auth/wrong-password') {
        setError('ভুল পাসওয়ার্ড। আবার চেষ্টা করুন।');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('এই ইমেইলটি ইতিমধ্যে ব্যবহার করা হয়েছে।');
      } else if (err.code === 'auth/weak-password') {
        setError('পাসওয়ার্ডটি অন্তত ৬ অক্ষরের হতে হবে।');
      } else if (err.code === 'auth/too-many-requests') {
        setError('অতিরিক্ত চেষ্টার কারণে অ্যাকাউন্টটি সাময়িকভাবে ব্লক করা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('ইমেইল/পাসওয়ার্ড লগইন ফায়ারবেস কনসোলে এনাবল করা নেই। অনুগ্রহ করে এটি এনাবল করুন।');
      } else {
        setError('লগইন ত্রুটি: ' + err.message);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 border border-zinc-200">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-zinc-900">PartnerPay</h1>
          <p className="text-zinc-500 mt-2">{isLogin ? 'অ্যাডমিন প্যানেল লগইন' : 'নতুন অ্যাকাউন্ট তৈরি করুন'}</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">ইমেইল ঠিকানা</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
              <input
                type="email"
                required
                className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none transition-all"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">পাসওয়ার্ড</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
              <input
                type="password"
                required
                className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

          <button
            type="submit"
            className="w-full bg-zinc-900 text-white py-3 rounded-xl font-semibold hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
          >
            <LogIn className="w-5 h-5" />
            {isLogin ? 'লগইন করুন' : 'অ্যাকাউন্ট তৈরি করুন'}
          </button>

          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="w-full text-zinc-500 text-sm hover:text-zinc-900 transition-colors"
          >
            {isLogin ? 'নতুন অ্যাকাউন্ট তৈরি করতে চান?' : 'ইতিমধ্যে অ্যাকাউন্ট আছে? লগইন করুন'}
          </button>
        </form>
      </div>
    </div>
  );
};
