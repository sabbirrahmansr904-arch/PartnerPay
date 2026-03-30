import React, { useState } from 'react';
import { LayoutDashboard, PlusCircle, Users, FileText, LogOut, Settings, Wallet, Calculator, Menu, X, ShoppingBag, LogIn } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ activeTab, setActiveTab, children }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, profile, loading, signIn, logout } = useAuth();

  const tabs = [
    { id: 'dashboard', label: 'ড্যাশবোর্ড', icon: LayoutDashboard },
    { id: 'balance', label: 'ব্যালেন্স', icon: Wallet },
    { id: 'add', label: 'এন্ট্রি যোগ করুন', icon: PlusCircle },
    { id: 'orders', label: 'অর্ডার ডেটা', icon: ShoppingBag },
    { id: 'pl', label: 'লাভ-ক্ষতি', icon: Calculator },
    { id: 'profit_sharing', label: 'লাভ বন্টন', icon: Users },
    { id: 'partners', label: 'পার্টনারগণ', icon: Users },
    { id: 'reports', label: 'রিপোর্ট', icon: FileText },
    { id: 'settings', label: 'সেটিংস', icon: Settings },
  ];

  const handleTabClick = (id: string) => {
    setActiveTab(id);
    setIsMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-zinc-200 h-16 flex items-center px-4 sticky top-0 z-40">
        <button 
          onClick={() => setIsMenuOpen(true)}
          className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-600"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h1 className="ml-4 text-lg font-bold text-zinc-900">PartnerPay</h1>
      </header>

      {/* Sidebar Overlay */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 md:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <nav className={cn(
        "fixed inset-y-0 left-0 w-72 bg-white border-r border-zinc-200 z-50 transform transition-transform duration-300 md:relative md:translate-x-0 md:w-64",
        isMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full p-4">
          <div className="flex items-center justify-between mb-8 px-4">
            <div>
              <h1 className="text-xl font-bold text-zinc-900">PartnerPay</h1>
              <div className="flex flex-col">
                <p className="text-xs text-zinc-500">লেজার v1.0</p>
              </div>
            </div>
            <button 
              onClick={() => setIsMenuOpen(false)}
              className="md:hidden p-2 hover:bg-zinc-100 rounded-lg text-zinc-400"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex flex-col gap-1 w-full flex-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium",
                  activeTab === tab.id 
                    ? "bg-zinc-900 text-white shadow-lg shadow-zinc-200" 
                    : "text-zinc-500 hover:bg-zinc-100"
                )}
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
