export interface Customer {
  id: string;
  name: string;
  phone: string;
  whatsappNumber?: string; // Optional WhatsApp number for sending reports
  address: string;
  rate: number; // Default rate per liter/kg
  defaultQuantity?: number; // Default daily quantity to pre-fill
  isActive: boolean;
  createdAt: string;
}

export interface MilkEntry {
  id: string;
  customerId: string;
  date: string; // YYYY-MM-DD
  quantity: number;
  rate: number; // Snapshot of rate at time of entry
  amount: number; // quantity * rate
  timestamp: number;
}

export enum TransactionType {
  CREDIT = 'CREDIT', // Money In (Payment from customer)
  DEBIT = 'DEBIT',   // Money Out (Expense)
}

export enum LedgerCategory {
  MILK_SALE = 'Milk Sale',
  CUSTOMER_PAYMENT = 'Customer Payment',
  FEED = 'Feed/Fodder',
  FUEL = 'Fuel/Transport',
  SALARY = 'Salary',
  MEDICINE = 'Medicine',
  OTHER = 'Other',
}

export interface LedgerTransaction {
  id: string;
  type: TransactionType;
  category: LedgerCategory | string;
  amount: number;
  date: string; // YYYY-MM-DD
  description: string;
  customerId?: string; // Optional link to a customer
  timestamp: number;
}

export interface AppData {
  customers: Customer[];
  entries: MilkEntry[];
  transactions: LedgerTransaction[];
}

export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER'
}