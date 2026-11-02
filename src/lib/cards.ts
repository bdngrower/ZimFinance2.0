export type AccountingSource = 'pagamento' | 'vale';

export type Card = {
  id: string;
  name: string;
  closing_day?: number | null;
  due_day?: number | null;
  accounting_source: AccountingSource;
  start_month: string;
  end_month?: string | null;
};

const PAYDAY = 5;
const ADVANCE_DAY = 20;

/** Sugere a fonte que já estará disponível no vencimento: o pagamento entra dia 5 e o adiantamento dia 20. */
export function suggestAccountingSource(dueDay: number): AccountingSource {
  return dueDay >= PAYDAY && dueDay < ADVANCE_DAY ? 'pagamento' : 'vale';
}

export function isValidDay(day: unknown): boolean {
  const n = Number(day);
  return Number.isInteger(n) && n >= 1 && n <= 31;
}

export function addMonths(monthId: string, count: number): string {
  const [year, month] = monthId.split('-').map(Number);
  const total = year * 12 + (month - 1) + count;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
}

export function isCardActiveInMonth(card: Card, monthId: string): boolean {
  return card.start_month <= monthId && (!card.end_month || card.end_month >= monthId);
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Mês em que a compra será paga. Compra até o fechamento entra na fatura do ciclo;
 * depois dele, na seguinte. Se o vencimento não vem depois do fechamento, a fatura vence no mês seguinte.
 */
export function getInvoiceMonth(purchaseDate: string, closingDay: number, dueDay: number): string {
  const [year, month, day] = purchaseDate.split('-').map(Number);
  const monthId = `${year}-${String(month).padStart(2, '0')}`;
  const closesAfterPurchase = day <= Math.min(closingDay, lastDayOfMonth(year, month));
  const closingMonth = closesAfterPurchase ? monthId : addMonths(monthId, 1);
  return dueDay > closingDay ? closingMonth : addMonths(closingMonth, 1);
}

/** Divide o total em centavos; a diferença do arredondamento fica na primeira parcela. */
export function splitInstallments(total: number, count: number): number[] {
  const cents = Math.round(total * 100);
  const parcel = Math.floor(cents / count);
  return Array.from({ length: count }, (_, i) =>
    (i === 0 ? parcel + (cents - parcel * count) : parcel) / 100,
  );
}

/** Troca a fonte contabilizada levando junto o valor base, para ele não sumir dos totais. */
export function moveBaseAmount<T extends { pagamento: number; vale: number }>(item: T, source: AccountingSource) {
  const amount = Math.max(Number(item.pagamento) || 0, Number(item.vale) || 0);
  return {
    type: `card_${source}`,
    pagamento: source === 'pagamento' ? amount : 0,
    vale: source === 'vale' ? amount : 0,
  };
}
