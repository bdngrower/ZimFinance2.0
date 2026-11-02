import { describe, expect, it } from 'vitest';
import { addMonths, getInvoiceMonth, isCardActiveInMonth, moveBaseAmount, splitInstallments, suggestAccountingSource } from './cards';

describe('suggestAccountingSource', () => {
  it.each([[4, 'vale'], [5, 'pagamento'], [10, 'pagamento'], [19, 'pagamento'], [20, 'vale'], [31, 'vale']])(
    'vencimento dia %i sugere %s', (day, source) => expect(suggestAccountingSource(day)).toBe(source));
});

describe('getInvoiceMonth', () => {
  it('compra até o fechamento entra no ciclo atual', () => {
    expect(getInvoiceMonth('2026-11-10', 10, 20)).toBe('2026-11');
  });
  it('compra depois do fechamento vai para o ciclo seguinte', () => {
    expect(getInvoiceMonth('2026-11-11', 10, 20)).toBe('2026-12');
  });
  it('vencimento antes do fechamento cai no mês seguinte ao fechamento', () => {
    expect(getInvoiceMonth('2026-11-20', 25, 5)).toBe('2026-12');
    expect(getInvoiceMonth('2026-11-26', 25, 5)).toBe('2027-01');
  });
  it('atravessa o ano', () => {
    expect(getInvoiceMonth('2026-12-15', 10, 20)).toBe('2027-01');
  });
  it('fechamento dia 31 em fevereiro usa o último dia do mês', () => {
    expect(getInvoiceMonth('2027-02-28', 31, 10)).toBe('2027-03');
  });
});

describe('splitInstallments', () => {
  it('não perde centavos', () => {
    expect(splitInstallments(100, 3)).toEqual([33.34, 33.33, 33.33]);
    expect(splitInstallments(0.1, 3).reduce((a, b) => a + b, 0)).toBeCloseTo(0.1);
  });
});

describe('moveBaseAmount', () => {
  it('leva o valor base para a nova fonte', () => {
    expect(moveBaseAmount({ pagamento: 150, vale: 0 }, 'vale')).toEqual({ type: 'card_vale', pagamento: 0, vale: 150 });
  });
});

describe('meses', () => {
  it('soma e subtrai meses', () => {
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2027-01', -1)).toBe('2026-12');
  });
  it('respeita início e fim do cartão', () => {
    const card = { id: '1', name: 'A', accounting_source: 'vale' as const, start_month: '2026-03', end_month: '2026-05' };
    expect(isCardActiveInMonth(card, '2026-02')).toBe(false);
    expect(isCardActiveInMonth(card, '2026-05')).toBe(true);
    expect(isCardActiveInMonth(card, '2026-06')).toBe(false);
    expect(isCardActiveInMonth({ ...card, end_month: null }, '2030-01')).toBe(true);
  });
});
