/**
 * A simple NLP parser for quick expense entry.
 * It tries to extract the value, description, period, and target card from a natural language string.
 */

export interface ParsedExpense {
  amount: number | null;
  description: string;
  period?: 'pagamento' | 'vale';
  targetCardId?: string;
}

export function parseExpenseText(text: string, cards: any[] = []): ParsedExpense {
  if (!text) {
    return { amount: null, description: '' };
  }

  // Common patterns for values like: 15,50 / 15.50 / R$ 15,50 / R$15.50
  const valueRegex = /(?:r\$\s*)?(\d{1,3}(?:\.\d{3})*(?:,\d{2})?|\d+(?:[.,]\d+)?)/i;
  
  const match = text.match(valueRegex);
  
  let amount: number | null = null;
  let description = text.trim();

  if (match) {
    const rawValue = match[1];
    // Convert Brazilian number format to float (1.000,50 -> 1000.50, or 15,50 -> 15.50)
    const normalizedValue = rawValue.replace(/\./g, '').replace(',', '.');
    amount = parseFloat(normalizedValue);

    // Remove the value part from the text to get the description
    description = text.replace(match[0], '').trim();
    // Clean up extra spaces
    description = description.replace(/\s+/g, ' ');
  }

  const lowerDesc = description.toLowerCase();
  
  // 1. Detect target card
  let targetCardId: string | undefined;
  for (const card of cards) {
    const cardName = card.name?.toLowerCase() || '';
    if (cardName && (lowerDesc.includes(`cartão ${cardName}`) || lowerDesc.includes(`cartao ${cardName}`) || lowerDesc.includes(`no ${cardName}`))) {
      targetCardId = card.id;
      // Optionally clean up the card mention from description
      const regex1 = new RegExp(`no cart[ãa]o ${cardName}`, 'i');
      const regex2 = new RegExp(`no ${cardName}`, 'i');
      const regex3 = new RegExp(`cart[ãa]o ${cardName}`, 'i');
      description = description.replace(regex1, '').replace(regex2, '').replace(regex3, '').trim();
      break;
    }
  }

  // 2. Detect period (pagamento vs adiantamento/vale)
  let period: 'pagamento' | 'vale' | undefined;
  
  if (lowerDesc.includes('pagamento') || lowerDesc.includes('pgto') || lowerDesc.includes('salário') || lowerDesc.includes('salario')) {
    period = 'pagamento';
    description = description.replace(/no pagamento/i, '').replace(/pagamento/i, '').replace(/no pgto/i, '').replace(/pgto/i, '').trim();
  } else if (lowerDesc.includes('vale') || lowerDesc.includes('adiantamento') || lowerDesc.includes('adto')) {
    period = 'vale';
    description = description.replace(/no adiantamento/i, '').replace(/adiantamento/i, '').replace(/no vale/i, '').replace(/vale/i, '').trim();
  } else {
    // Detect day
    const dayMatch = lowerDesc.match(/dia\s*(\d{1,2})/i);
    if (dayMatch) {
      const day = parseInt(dayMatch[1], 10);
      if (day <= 5) {
        period = 'pagamento';
      } else if (day > 5) {
        period = 'vale';
      }
      description = description.replace(dayMatch[0], '').replace(/no\s*$/i, '').trim();
    }
  }

  // Clean trailing "no", "do" etc.
  description = description.replace(/ (no|do|na|da)$/i, '').trim();
  description = description.replace(/^(no|do|na|da) /i, '').trim();

  // Capitalize first letter of description
  if (description) {
    description = description.charAt(0).toUpperCase() + description.slice(1);
  }

  return { amount, description, period, targetCardId };
}
