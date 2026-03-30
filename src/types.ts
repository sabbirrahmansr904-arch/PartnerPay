export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id?: string;
  title: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string;
  note: string;
  receiptUrl?: string;
  createdBy: string;
  createdAt: any;
}

export interface Investment {
  id?: string;
  partnerId: string;
  partnerName: string;
  amount: number;
  date: string;
  note: string;
}

export interface AppSettings {
  currency: string;
  partnerAName: string;
  partnerBName: string;
  partnerCName: string;
  categories: string[];
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'partner';
}

export interface Order {
  id?: string;
  customerName: string;
  customerNumber: string;
  customerAddress: string;
  productCode: string;
  quantity: number;
  price: number;
  buyingPrice: number;
  totalBill: number;
  date: string;
  transactionId?: string;
  expenseTransactionId?: string;
}

export interface ProfitShare {
  id?: string;
  orderId: string;
  customerName: string;
  productCode: string;
  totalProfit: number;
  sharePerPartner: number;
  partnerA: string;
  partnerB: string;
  partnerC: string;
  date: string;
  createdAt: any;
}
