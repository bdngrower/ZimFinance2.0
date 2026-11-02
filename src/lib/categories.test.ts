import { describe, expect, it } from 'vitest';
import { DEFAULT_CATEGORIES, groupByCategory, suggestCategory } from './categories';

describe('suggestCategory', () => {
  it.each([
    ['ALUGUEL', 'moradia'], ['Água', 'moradia'], ['Netflix', 'assinaturas'], ['GOOGLE ONE', 'assinaturas'],
    ['mercado', 'mercado'], ['Churrasco Leo', 'alimentacao'], ['AÇAI', 'alimentacao'], ['DROGARIA COLORIO', 'saude'],
    ['GASOLINA', 'transporte'], ['Auto Posto Brisa', 'transporte'], ['FACULDADE', 'educacao'], ['AIRBNB', 'lazer'],
  ])('%s => %s', (name, category) => expect(suggestCategory(name)).toBe(category));

  it('não confunde mercado livre com mercado', () => {
    expect(suggestCategory('MERCADO LIVRE 2')).toBeNull();
  });
  it('não casa pedaço de palavra', () => {
    expect(suggestCategory('timbre')).toBeNull();
    expect(suggestCategory('luzia')).toBeNull();
    expect(suggestCategory('gasto')).toBeNull();
  });
  it('sem correspondência fica sem categoria', () => {
    expect(suggestCategory('Bruna')).toBeNull();
    expect(suggestCategory('')).toBeNull();
    expect(suggestCategory(null)).toBeNull();
  });
});

describe('DEFAULT_CATEGORIES', () => {
  it('explica o que entra em cada categoria padrão', () => {
    expect(DEFAULT_CATEGORIES.every(category => category.description)).toBe(true);
  });
});

describe('groupByCategory', () => {
  const items = [
    { id: 'a', name: 'Aluguel', type: 'expense_pagamento', pagamento: 1000, vale: 0, category: 'moradia', month_id: '2026-11' },
    { id: 'b', name: 'Água', type: 'expense_vale', pagamento: 0, vale: 100, category: 'moradia', month_id: '2026-12' },
    { id: 'c', name: 'Neon', type: 'card_vale', pagamento: 0, vale: 300, month_id: '2026-11' },
    { id: 'd', name: 'Sem valor', type: 'expense_pagamento', pagamento: 0, vale: 0, category: 'lazer', month_id: '2026-11' },
  ];
  const expenses = (id: string) =>
    id === 'c' ? [{ id: 'e1', name: 'Netflix', value: 55, category: 'assinaturas' }, { id: 'e2', name: 'Loja', value: 20 }] : [];

  const result = groupByCategory(items, expenses, DEFAULT_CATEGORIES, '2026-11');
  const get = (id: string) => result.find(r => r.id === id)!;

  it('separa mês, acumulado e ano', () => {
    expect(get('moradia')).toMatchObject({ monthValue: 1000, ytdValue: 1000, yearValue: 1100 });
  });
  it('divide o cartão pelas compras e deixa o valor base em Outros', () => {
    expect(get('assinaturas').monthValue).toBe(55);
    expect(get('outros').monthValue).toBe(320);
    expect(get('outros').entries.map(e => e.name)).toEqual(['Neon (valor base)', 'Loja']);
  });
  it('ignora lançamentos sem valor', () => {
    expect(result.find(r => r.id === 'lazer')).toBeUndefined();
  });
  it('categoria excluída volta para Outros', () => {
    const custom = groupByCategory(
      [{ id: 'x', name: 'Y', type: 'expense_vale', pagamento: 0, vale: 10, category: 'apagada', month_id: '2026-11' }],
      () => [],
      DEFAULT_CATEGORIES,
      '2026-11',
    );
    expect(custom[0].id).toBe('outros');
  });
});
