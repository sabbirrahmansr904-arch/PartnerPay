import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc, serverTimestamp, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Order, Transaction } from '../types';
import { useSettings } from '../hooks/useSettings';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { ShoppingBag, Plus, Search, Trash2, Edit2, User, Phone, MapPin, Package, DollarSign, Calendar, X, Save } from 'lucide-react';

export const Orders: React.FC = () => {
  const { settings } = useSettings();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    customerName: '',
    customerNumber: '',
    customerAddress: '',
    productCode: '',
    quantity: '1',
    price: '',
    buyingPrice: '560',
    totalBill: '',
    date: new Date().toISOString().split('T')[0],
  });

  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);

  useEffect(() => {
    const qty = parseFloat(formData.quantity) || 0;
    const prc = parseFloat(formData.price) || 0;
    if (qty > 0 && prc > 0) {
      setFormData(prev => ({ ...prev, totalBill: (qty * prc).toString() }));
    }
  }, [formData.quantity, formData.price]);

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
    const q = query(collection(db, 'orders'), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    });
    return unsub;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(formData.price) || 0;
    const quantity = parseFloat(formData.quantity) || 1;
    const buyingPrice = parseFloat(formData.buyingPrice) || 0;
    const totalBill = parseFloat(formData.totalBill) || 0;
    const totalBuyingCost = buyingPrice * quantity;

    try {
      if (editingOrder) {
        // Update existing order
        const orderRef = doc(db, 'orders', editingOrder.id!);
        await updateDoc(orderRef, {
          ...formData,
          price,
          quantity,
          buyingPrice,
          totalBill,
        });

        // Update linked income transaction
        if (editingOrder.transactionId) {
          const transRef = doc(db, 'transactions', editingOrder.transactionId);
          await updateDoc(transRef, {
            title: `অর্ডার (বিক্রয়): ${formData.customerName} (${formData.productCode})`,
            amount: totalBill,
            category: 'অর্ডার (লাভ-ক্ষতি)',
            date: formData.date,
            note: `কাস্টমার: ${formData.customerName}, ফোন: ${formData.customerNumber}, ঠিকানা: ${formData.customerAddress}`,
          });
        }

        // Update linked expense transaction (buying price)
        if (editingOrder.expenseTransactionId) {
          const expTransRef = doc(db, 'transactions', editingOrder.expenseTransactionId);
          await updateDoc(expTransRef, {
            title: `অর্ডার (ক্রয়): ${formData.customerName} (${formData.productCode})`,
            amount: totalBuyingCost,
            category: 'অর্ডার (লাভ-ক্ষতি)',
            date: formData.date,
            note: `কাস্টমার: ${formData.customerName}, প্রোডাক্ট: ${formData.productCode}`,
          });
        } else if (totalBuyingCost > 0) {
          // If it didn't have an expense transaction but now has a buying price
          const expTransRef = await addDoc(collection(db, 'transactions'), {
            title: `অর্ডার (ক্রয়): ${formData.customerName} (${formData.productCode})`,
            amount: totalBuyingCost,
            type: 'expense',
            category: 'অর্ডার (লাভ-ক্ষতি)',
            date: formData.date,
            note: `কাস্টমার: ${formData.customerName}, প্রোডাক্ট: ${formData.productCode}`,
            createdAt: serverTimestamp(),
          });
          await updateDoc(orderRef, { expenseTransactionId: expTransRef.id });
        }

        // Update profit share record
        const profit = totalBill - totalBuyingCost;
        const q = query(collection(db, 'profit_shares'), where('orderId', '==', editingOrder.id));
        const sharesSnap = await getDocs(q);
        
        if (!sharesSnap.empty) {
          const shareDoc = sharesSnap.docs[0];
          await updateDoc(doc(db, 'profit_shares', shareDoc.id), {
            customerName: formData.customerName,
            productCode: formData.productCode,
            totalProfit: profit,
            sharePerPartner: profit / 3,
            date: formData.date,
          });
        } else {
          // Create record for all orders
          await addDoc(collection(db, 'profit_shares'), {
            orderId: editingOrder.id,
            customerName: formData.customerName,
            productCode: formData.productCode,
            totalProfit: profit,
            sharePerPartner: profit / 3,
            partnerA: settings.partnerAName,
            partnerB: settings.partnerBName,
            partnerC: settings.partnerCName,
            date: formData.date,
            createdAt: serverTimestamp(),
          });
        }

        setEditingOrder(null);
      } else {
        // Create new income transaction
        const transRef = await addDoc(collection(db, 'transactions'), {
          title: `অর্ডার (বিক্রয়): ${formData.customerName} (${formData.productCode})`,
          amount: totalBill,
          type: 'income',
          category: 'অর্ডার (লাভ-ক্ষতি)',
          date: formData.date,
          note: `কাস্টমার: ${formData.customerName}, ফোন: ${formData.customerNumber}, ঠিকানা: ${formData.customerAddress}`,
          createdAt: serverTimestamp(),
        });

        // Create new expense transaction (buying price)
        let expenseTransactionId = '';
        if (totalBuyingCost > 0) {
          const expTransRef = await addDoc(collection(db, 'transactions'), {
            title: `অর্ডার (ক্রয়): ${formData.customerName} (${formData.productCode})`,
            amount: totalBuyingCost,
            type: 'expense',
            category: 'অর্ডার (লাভ-ক্ষতি)',
            date: formData.date,
            note: `কাস্টমার: ${formData.customerName}, প্রোডাক্ট: ${formData.productCode}`,
            createdAt: serverTimestamp(),
          });
          expenseTransactionId = expTransRef.id;
        }

        // Create new order
        const orderRef = await addDoc(collection(db, 'orders'), {
          ...formData,
          price,
          quantity,
          buyingPrice,
          totalBill,
          transactionId: transRef.id,
          expenseTransactionId,
        });

        // Create profit share record for all orders
        const profit = totalBill - totalBuyingCost;
        await addDoc(collection(db, 'profit_shares'), {
          orderId: orderRef.id,
          customerName: formData.customerName,
          productCode: formData.productCode,
          totalProfit: profit,
          sharePerPartner: profit / 3,
          partnerA: settings.partnerAName,
          partnerB: settings.partnerBName,
          partnerC: settings.partnerCName,
          date: formData.date,
          createdAt: serverTimestamp(),
        });
        setIsAdding(false);
      }

      setFormData({
        customerName: '',
        customerNumber: '',
        customerAddress: '',
        productCode: '',
        quantity: '1',
        price: '',
        buyingPrice: '560',
        totalBill: '',
        date: new Date().toISOString().split('T')[0],
      });
    } catch (error) {
      console.error('Error saving order:', error);
    }
  };

  const handleDelete = async () => {
    if (!orderToDelete) return;
    
    try {
      await deleteDoc(doc(db, 'orders', orderToDelete.id!));
      if (orderToDelete.transactionId) {
        await deleteDoc(doc(db, 'transactions', orderToDelete.transactionId));
      }
      if (orderToDelete.expenseTransactionId) {
        await deleteDoc(doc(db, 'transactions', orderToDelete.expenseTransactionId));
      }
      
      // Delete linked profit share
      const q = query(collection(db, 'profit_shares'), where('orderId', '==', orderToDelete.id));
      const snapshot = await getDocs(collection(db, 'profit_shares')); // Simplified for now, but better to use query
      // Actually, let's just search and delete
      const sharesSnap = await getDocs(q);
      sharesSnap.forEach(async (d) => {
        await deleteDoc(doc(db, 'profit_shares', d.id));
      });

      setOrderToDelete(null);
    } catch (error) {
      console.error('Error deleting order:', error);
    }
  };

  const startEdit = (order: Order) => {
    setEditingOrder(order);
    setFormData({
      customerName: order.customerName || '',
      customerNumber: order.customerNumber || '',
      customerAddress: order.customerAddress || '',
      productCode: order.productCode || '',
      quantity: order.quantity?.toString() || '1',
      price: order.price?.toString() || '',
      buyingPrice: order.buyingPrice?.toString() || '',
      totalBill: order.totalBill?.toString() || '',
      date: order.date || new Date().toISOString().split('T')[0],
    });
    setIsAdding(true);
  };

  const filteredOrders = orders.filter(o => 
    o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.productCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.customerNumber.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">অর্ডার ডেটা (All Order Data)</h2>
          <p className="text-zinc-500">কাস্টমার অর্ডার এবং ইনকাম ম্যানেজমেন্ট</p>
        </div>
        <button
          onClick={() => {
            setIsAdding(!isAdding);
            setEditingOrder(null);
            if (!isAdding) {
              setFormData({
                customerName: '',
                customerNumber: '',
                customerAddress: '',
                productCode: '',
                quantity: '1',
                price: '',
                buyingPrice: '560',
                totalBill: '',
                date: new Date().toISOString().split('T')[0],
              });
            }
          }}
          className="flex items-center gap-2 px-6 py-3 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200"
        >
          {isAdding ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          {isAdding ? 'বন্ধ করুন' : 'নতুন অর্ডার'}
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
          <h3 className="text-lg font-bold text-zinc-900 mb-6 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-zinc-400" />
            {editingOrder ? 'অর্ডার এডিট করুন' : 'নতুন অর্ডার এন্ট্রি'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700 flex items-center gap-2">
                <User className="w-4 h-4" /> কাস্টমারের নাম
              </label>
              <input
                required
                type="text"
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
                value={formData.customerName}
                onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                placeholder="উদা: রহিম উদ্দিন"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700 flex items-center gap-2">
                <Phone className="w-4 h-4" /> মোবাইল নম্বর
              </label>
              <input
                required
                type="tel"
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
                value={formData.customerNumber}
                onChange={e => setFormData({ ...formData, customerNumber: e.target.value })}
                placeholder="উদা: 017XXXXXXXX"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-bold text-zinc-700 flex items-center gap-2">
                <MapPin className="w-4 h-4" /> ঠিকানা
              </label>
              <textarea
                required
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all min-h-[80px]"
                value={formData.customerAddress}
                onChange={e => setFormData({ ...formData, customerAddress: e.target.value })}
                placeholder="উদা: বাড়ি নং-১০, রোড নং-৫, ঢাকা"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700 flex items-center gap-2">
                <Package className="w-4 h-4" /> প্রোডাক্ট কোড
              </label>
              <input
                required
                type="text"
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
                value={formData.productCode}
                onChange={e => setFormData({ ...formData, productCode: e.target.value })}
                placeholder="উদা: P-101"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700 flex items-center gap-2">
                <Package className="w-4 h-4" /> পরিমাণ (Quantity)
              </label>
              <input
                required
                type="number"
                min="1"
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
                value={formData.quantity}
                onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="উদা: 1"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> তারিখ
              </label>
              <input
                required
                type="date"
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700 flex items-center gap-2">
                <DollarSign className="w-4 h-4" /> ক্রয় মূল্য (প্রতি পিস)
              </label>
              <input
                required
                type="number"
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
                value={formData.buyingPrice}
                onChange={e => setFormData({ ...formData, buyingPrice: e.target.value })}
                placeholder="560.00"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700 flex items-center gap-2">
                <DollarSign className="w-4 h-4" /> বিক্রয় মূল্য (প্রতি পিস)
              </label>
              <input
                required
                type="number"
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
                value={formData.price}
                onChange={e => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700 flex items-center gap-2">
                <DollarSign className="w-4 h-4" /> মোট বিল (Income)
              </label>
              <input
                required
                type="number"
                className="w-full px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-emerald-700"
                value={formData.totalBill}
                onChange={e => setFormData({ ...formData, totalBill: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="md:col-span-2 pt-4">
              <button
                type="submit"
                className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all shadow-lg"
              >
                <Save className="w-5 h-5" />
                {editingOrder ? 'আপডেট করুন' : 'অর্ডার সেভ করুন'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-zinc-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="font-bold text-zinc-900 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-zinc-400" />
            অর্ডার তালিকা
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
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-100">প্রোডাক্ট ও দাম</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-100 text-right">লাভ (Profit)</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-100 text-right">মোট বিল</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-100 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredOrders.map((order) => {
                const profit = order.totalBill - ((order.buyingPrice || 0) * (order.quantity || 1));
                return (
                  <tr key={order.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-zinc-900">{order.customerName}</span>
                        <span className="text-xs text-zinc-500 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {order.customerNumber}
                        </span>
                        <span className="text-[10px] text-zinc-400 mt-1">{formatDate(order.date)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-zinc-900">{order.productCode}</span>
                        <span className="text-[10px] text-zinc-500 mt-1">পরিমাণ: {order.quantity || 1} টি</span>
                        <span className="text-[10px] text-zinc-400">দর: {formatCurrency(order.price, settings.currency)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className={cn(
                          "text-sm font-bold",
                          profit >= 0 ? "text-emerald-600" : "text-rose-600"
                        )}>
                          {formatCurrency(profit, settings.currency)}
                        </span>
                        {profit > 0 && (
                          <span className="text-[10px] text-zinc-400">
                            প্রতিজন: {formatCurrency(profit / 3, settings.currency)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-black text-zinc-900">
                        {formatCurrency(order.totalBill, settings.currency)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => startEdit(order)}
                          className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setOrderToDelete(order)}
                          className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-zinc-400">
                    কোনো অর্ডার পাওয়া যায়নি
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {orderToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 className="w-8 h-8 text-rose-600" />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 text-center mb-2">অর্ডার ডিলিট করুন</h3>
            <p className="text-zinc-500 text-center mb-8">
              আপনি কি নিশ্চিত যে এই অর্ডারটি ডিলিট করতে চান? এটি ইনকাম থেকেও মুছে যাবে।
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setOrderToDelete(null)}
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
