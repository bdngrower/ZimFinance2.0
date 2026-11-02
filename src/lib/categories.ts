export type Category = {
  id: string;
  name: string;
  icon: string;
};

export const OTHER_CATEGORY: Category = { id: 'outros', name: 'Outros', icon: 'tag' };

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'moradia', name: 'Moradia', icon: 'home' },
  { id: 'alimentacao', name: 'Alimentação', icon: 'utensils' },
  { id: 'mercado', name: 'Mercado', icon: 'cart' },
  { id: 'transporte', name: 'Transporte', icon: 'car' },
  { id: 'saude', name: 'Saúde', icon: 'health' },
  { id: 'lazer', name: 'Lazer', icon: 'ticket' },
  { id: 'assinaturas', name: 'Assinaturas', icon: 'tv' },
  { id: 'educacao', name: 'Educação', icon: 'education' },
  OTHER_CATEGORY,
];

/**
 * Regras em ordem de prioridade. O termo vale como palavra inteira; com `*` no fim, como início de palavra.
 * A primeira regra existe para "mercado livre" não cair em Mercado.
 */
export const CATEGORY_RULES: [string, string[]][] = [
  ['outros', ['mercado livre', 'shopee', 'amazon']],
  ['assinaturas', ['netflix', 'spotify', 'youtube', 'google one', 'google ai', 'claude', 'chatgpt', 'disney', 'prime video', 'hbo', 'globoplay', 'deezer', 'anuidade']],
  ['moradia', ['aluguel', 'agua', 'energia', 'luz', 'condominio', 'iptu', 'medidor', 'internet', 'roteador', 'claro', 'vivo', 'tim', 'gas']],
  ['mercado', ['mercado', 'supermercado', 'emporio', 'atacadao', 'hortifruti', 'feira']],
  ['alimentacao', ['almoco', 'jantar', 'acai', 'churrasc*', 'mequi', 'mcdonalds', 'subway', 'sorveteria', 'american mania', 'restaurante', 'lanche*', 'pizza*', 'cafe', 'ifood', 'padaria', 'burger*', 'adega']],
  ['transporte', ['gasolina', 'posto', 'combustivel', 'etanol', 'uber', '99', 'estacionamento', 'sem parar', 'pedagio', 'oficina', 'carro', 'moto', 's10', 'clio', 'ipva', 'seguro auto']],
  ['saude', ['drog*', 'farmacia', 'dental', 'dentista', 'medico', 'consulta', 'exame*', 'oculos', 'academia', 'plano de saude']],
  ['lazer', ['viagem', 'airbnb', 'festa*', 'cinema', 'niver', 'show', 'maria fumaca', 'forro', 'hookah']],
  ['educacao', ['faculdade', 'escola', 'curso*', 'livro*']],
];

const normalize = (text: string) =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const compiledRules = CATEGORY_RULES.map(([category, terms]) => ({
  category,
  regex: new RegExp(
    `(?<![a-z0-9])(?:${terms
      .map(term => (term.endsWith('*') ? `${term.slice(0, -1)}[a-z0-9]*` : term))
      .join('|')})(?![a-z0-9])`,
  ),
}));

/** Sugere a categoria pelo nome; sem correspondência, o lançamento fica sem categoria. */
export function suggestCategory(name: string | null | undefined): string | null {
  const text = normalize(name ?? '');
  if (!text) return null;
  const rule = compiledRules.find(({ regex }) => regex.test(text));
  return rule && rule.category !== OTHER_CATEGORY.id ? rule.category : null;
}

export function findCategory(categories: Category[], id: string | null | undefined): Category {
  return categories.find(category => category.id === id) ?? OTHER_CATEGORY;
}

type SourceItem = {
  id: string;
  name: string;
  type: string;
  pagamento: number;
  vale: number;
  category?: string | null;
  month_id?: string;
};

type SourceExpense = {
  id: string;
  name: string;
  value: number;
  category?: string | null;
};

export type CategoryEntry = {
  id: string;
  name: string;
  monthId: string;
  value: number;
  cardName?: string;
};

export type CategoryTotal = {
  id: string;
  name: string;
  icon: string;
  monthValue: number;
  ytdValue: number;
  yearValue: number;
  entries: CategoryEntry[];
};

/** Soma por categoria. No cartão, cada compra conta na própria categoria e o valor base fica em Outros. */
export function groupByCategory(
  items: SourceItem[],
  getExpenses: (itemId: string) => SourceExpense[],
  categories: Category[],
  currentMonthId: string,
): CategoryTotal[] {
  const totals = new Map<string, CategoryTotal>();

  const add = (categoryId: string | null | undefined, entry: CategoryEntry) => {
    if (entry.value <= 0) return;
    const category = findCategory(categories, categoryId);
    const total = totals.get(category.id) ?? {
      id: category.id,
      name: category.name,
      icon: category.icon,
      monthValue: 0,
      ytdValue: 0,
      yearValue: 0,
      entries: [],
    };
    total.yearValue += entry.value;
    if (entry.monthId === currentMonthId) total.monthValue += entry.value;
    if (entry.monthId <= currentMonthId) total.ytdValue += entry.value;
    total.entries.push(entry);
    totals.set(category.id, total);
  };

  items.forEach(item => {
    const monthId = item.month_id || currentMonthId;
    const base = (Number(item.pagamento) || 0) + (Number(item.vale) || 0);
    const name = item.name?.trim() || 'Sem nome';

    if (item.type.startsWith('card_')) {
      add(null, { id: item.id, name: `${name} (valor base)`, monthId, value: base, cardName: name });
      getExpenses(item.id).forEach(expense => {
        add(expense.category, {
          id: expense.id,
          name: expense.name?.trim() || 'Sem nome',
          monthId,
          value: Number(expense.value) || 0,
          cardName: name,
        });
      });
    } else if (item.type.startsWith('expense_')) {
      add(item.category, { id: item.id, name, monthId, value: base });
    }
  });

  return [...totals.values()];
}
