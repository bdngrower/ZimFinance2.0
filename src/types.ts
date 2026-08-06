export type ExpenseRecord = {
  id: string;
  name: string;
  pagamento: number;
  vale: number;
  is_paid?: boolean;
};

export type IncomeRecord = {
  pagamento: number;
  vale: number;
  ferias: number;
  decimoTerceiro: number;
};

export type MonthData = {
  id: string;
  monthName: string;
  year: number;
  income: IncomeRecord;
  expenses: ExpenseRecord[];
  cards: ExpenseRecord[];
};

export type BankConnection = {
  id: string;
  user_id: string;
  provider: string;
  status: 'active' | 'disconnected';
  last_sync: string;
  created_at: string;
};

export type OpenFinanceTransaction = {
  id: string; // internal id if imported
  external_transaction_id: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
  type: 'income' | 'expense';
  imported?: boolean; // UI flag
};
