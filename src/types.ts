export type ExpenseRecord = {
  id: string;
  name: string;
  pagamento: number;
  vale: number;
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
