/**
 * A simple NLP parser for quick expense entry.
 * It tries to extract the value, description, period, target card and installments from a natural language string.
 */

import { suggestAccountingSource } from './cards';
import { convertWordsToNumbers } from './numberWords';

export interface ParsedExpense {
  amount: number | null;
  description: string;
  period?: 'pagamento' | 'vale';
  targetCardId?: string;
  installments?: number;
}

// Evita casar pedaços de palavras: "inter" não pode encontrar "internet"
const BEFORE = '(?<![\\p{L}\\p{N}])';
const AFTER = '(?![\\p{L}\\p{N}])';

const wholeWords = (pattern: string, flags = 'iu') => new RegExp(`${BEFORE}(?:${pattern})${AFTER}`, flags);

export function parseExpenseText(rawText: string, cards: any[] = []): ParsedExpense {
  if (!rawText) {
    return { amount: null, description: '' };
  }

  let description = convertWordsToNumbers(rawText).trim();

  // 1. Detect target card first, so a number in its name is not read as the value.
  // Sort by name length descending to match longest names first
  let targetCardId: string | undefined;
  const sortedCards = [...cards].sort((a, b) => (b.name?.length || 0) - (a.name?.length || 0));

  for (const card of sortedCards) {
    const cardName = (card.name || '').toLowerCase().trim();
    if (!cardName) continue;

    // Strip "cartão" / "cartao" prefix from the stored card name for matching
    const cleanCardName = cardName.replace(/^cart[ãa]o\s+/i, '').trim();
    const names = `${escapeRegex(cardName)}|${escapeRegex(cleanCardName)}`;
    const reference = wholeWords(`(?:(?:no|na|do|da)\\s+)?(?:cart[ãa]o\\s+)?(?:${names})`);

    if (reference.test(description)) {
      targetCardId = card.id;
      description = description.replace(reference, ' ');
      break;
    }
  }

  // 2. Detect installments: "em 3x", "3 vezes", "12 parcelas"
  let installments: number | undefined;
  const installmentsRegex = wholeWords('(?:em\\s+)?(\\d{1,2})\\s*(?:x|vezes|parcelas)');
  const installmentsMatch = description.match(installmentsRegex);
  if (installmentsMatch) {
    const count = parseInt(installmentsMatch[1], 10);
    if (count >= 2) installments = count;
    description = description.replace(installmentsRegex, ' ');
  }

  // 3. Detect period (pagamento vs adiantamento/vale)
  let period: 'pagamento' | 'vale' | undefined;
  const pagamentoRegex = wholeWords('(?:no\\s+)?(?:pagamento|pgto|sal[aá]rio)');
  // "vale" sozinho no meio da frase costuma ser o nome da despesa, como "vale gás"
  const valeRegex = /(?<![\p{L}\p{N}])(?:(?:no\s+)?(?:adiantamento|adto)(?![\p{L}\p{N}])|(?:no|do|pelo)\s+vale(?![\p{L}\p{N}])|vale\s*$)/iu;
  const dayRegex = wholeWords('(?:no\\s+)?dia\\s*(\\d{1,2})');

  if (pagamentoRegex.test(description)) {
    period = 'pagamento';
    description = description.replace(pagamentoRegex, ' ');
  } else if (valeRegex.test(description)) {
    period = 'vale';
    description = description.replace(valeRegex, ' ');
  } else {
    const dayMatch = description.match(dayRegex);
    if (dayMatch) {
      period = suggestAccountingSource(parseInt(dayMatch[1], 10));
      description = description.replace(dayRegex, ' ');
    }
  }

  // 4. Extract the value: 1500 / 1.500,50 / 1500,50 / 15.50 / 15,5 / R$ 15,50
  const valueRegex = /(?<![\p{L}\p{N}.,])(?:r\$\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)(?![\p{L}\p{N}]|[.,]\d)/iu;
  const match = description.match(valueRegex);
  let amount: number | null = null;

  if (match) {
    const rawValue = match[1];
    // Convert Brazilian number format to float (1.000,50 -> 1000.50, or 15,50 -> 15.50)
    const normalizedValue = /\.\d{3}/.test(rawValue)
      ? rawValue.replace(/\./g, '').replace(',', '.')
      : rawValue.replace(',', '.');
    amount = parseFloat(normalizedValue);
    description = description.replace(match[0], ' ');
  }

  description = description
    .replace(wholeWords('(?:reais|real|conto|contos)(?:\\s+(?:de|em|no|na))?'), ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Clean trailing/leading prepositions
  description = description.replace(/\s+(no|do|na|da|de|em)$/i, '').trim();
  description = description.replace(/^(no|do|na|da|de|em)\s+/i, '').trim();

  // Capitalize first letter of description
  if (description) {
    description = description.charAt(0).toUpperCase() + description.slice(1);
  }

  return { amount, description, period, targetCardId, installments };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
