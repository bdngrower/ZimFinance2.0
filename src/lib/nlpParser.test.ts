import { describe, expect, it } from 'vitest';
import { parseExpenseText as parse } from './nlpParser';

const cards = [{ id: 'inter', name: 'Inter' }, { id: 'neon', name: 'Cartão Neon' }, { id: 'c6', name: 'C6' }];

describe('valores', () => {
  it.each([
    ['1500 aluguel', 1500], ['1500,50 aluguel', 1500.5], ['1.500,50 aluguel', 1500.5], ['1.500 aluguel', 1500],
    ['15.50 cafe', 15.5], ['15,5 cafe', 15.5], ['R$ 15,50 cafe', 15.5], ['r$15 cafe', 15],
  ])('%s => %d', (text, amount) => {
    const parsed = parse(text);
    expect(parsed.amount).toBe(amount);
    expect(parsed.description).toBe(text.endsWith('aluguel') ? 'Aluguel' : 'Cafe');
  });

  it('entende números por extenso', () => {
    expect(parse('vinte e cinco reais de pizza').amount).toBe(25);
    expect(parse('vinte e cinco reais de pizza').description).toBe('Pizza');
    expect(parse('mil e quinhentos aluguel').amount).toBe(1500);
    expect(parse('dois mil aluguel').amount).toBe(2000);
  });

  it('não confunde artigo com valor', () => {
    const parsed = parse('um café 20');
    expect(parsed.amount).toBe(20);
    expect(parsed.description).toBe('Um café');
  });

  it('não confunde o dia com o valor', () => {
    const parsed = parse('dia 10 mercado 30');
    expect(parsed.amount).toBe(30);
    expect(parsed.description).toBe('Mercado');
    expect(parsed.period).toBe('pagamento');
  });
});

describe('cartões', () => {
  it('não casa pedaço de palavra', () => {
    const parsed = parse('100 internet', cards);
    expect(parsed.targetCardId).toBeUndefined();
    expect(parsed.description).toBe('Internet');
  });
  it.each(['20 café cartão neon', '20 café no neon', '20 café neon', 'cartão Neon 20 café'])('%s', text => {
    const parsed = parse(text, cards);
    expect(parsed.targetCardId).toBe('neon');
    expect(parsed.amount).toBe(20);
    expect(parsed.description).toBe('Café');
  });
  it('número no nome do cartão não vira valor', () => {
    const parsed = parse('c6 20 café', cards);
    expect(parsed.targetCardId).toBe('c6');
    expect(parsed.amount).toBe(20);
  });
});

describe('período', () => {
  it('mantém "vale" quando é o nome da despesa', () => {
    const parsed = parse('50 vale gas');
    expect(parsed.period).toBeUndefined();
    expect(parsed.description).toBe('Vale gas');
  });
  it.each(['50 mercado no vale', '50 mercado vale', '50 mercado adiantamento', '50 mercado adto'])('%s', text => {
    expect(parse(text).period).toBe('vale');
    expect(parse(text).description).toBe('Mercado');
  });
  it('detecta pagamento', () => {
    expect(parse('20 pagamento academia').period).toBe('pagamento');
    expect(parse('20 pagamento academia').description).toBe('Academia');
  });
  it('não usa "pagamento" dentro de outra palavra', () => {
    expect(parse('20 prevale').period).toBeUndefined();
  });
});

describe('parcelas', () => {
  it.each(['300 tv neon em 3x', '300 tv neon 3x', '300 tv neon 3 vezes', '300 tv neon 3 parcelas'])('%s', text => {
    const parsed = parse(text, cards);
    expect(parsed).toMatchObject({ amount: 300, installments: 3, targetCardId: 'neon', description: 'Tv' });
  });
  it('não trata 1x como parcelamento', () => {
    expect(parse('300 tv 1x').installments).toBeUndefined();
  });
});
