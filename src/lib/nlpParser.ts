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
  
  // 1. Detect target card - sort by name length descending to match longest names first
  let targetCardId: string | undefined;
  const sortedCards = [...cards].sort((a, b) => (b.name?.length || 0) - (a.name?.length || 0));
  
  for (const card of sortedCards) {
    const cardName = (card.name || '').toLowerCase().trim();
    if (!cardName) continue;
    
    // Strip "cartão" / "cartao" prefix from the stored card name for matching
    const cleanCardName = cardName.replace(/^cart[ãa]o\s+/i, '').trim();
    
    // Try multiple match patterns:
    // 1. "cartão <cleanName>" or "cartao <cleanName>"
    // 2. "no <fullName>" or "no <cleanName>"
    // 3. Just "<fullName>" or "<cleanName>" as a standalone word group at end of text
    const patterns = [
      `cart[ãa]o\\s+${escapeRegex(cleanCardName)}`,
      `no\\s+${escapeRegex(cardName)}`,
      `no\\s+${escapeRegex(cleanCardName)}`,
      `${escapeRegex(cardName)}`,
      `${escapeRegex(cleanCardName)}`,
    ];
    
    let matched = false;
    for (const pattern of patterns) {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(lowerDesc)) {
        targetCardId = card.id;
        // Clean up: remove the card reference and surrounding prepositions
        const cleanupPatterns = [
          new RegExp(`\\s*(no\\s+)?cart[ãa]o\\s+${escapeRegex(cleanCardName)}`, 'ig'),
          new RegExp(`\\s*(no\\s+)?${escapeRegex(cardName)}`, 'ig'),
          new RegExp(`\\s*(no\\s+)?${escapeRegex(cleanCardName)}`, 'ig'),
        ];
        for (const cp of cleanupPatterns) {
          description = description.replace(cp, '');
        }
        description = description.trim();
        matched = true;
        break;
      }
    }
    if (matched) break;
  }

  // Re-evaluate lowerDesc after card cleanup
  const lowerDescAfterCard = description.toLowerCase();

  // 2. Detect period (pagamento vs adiantamento/vale)
  let period: 'pagamento' | 'vale' | undefined;
  
  if (lowerDescAfterCard.includes('pagamento') || lowerDescAfterCard.includes('pgto') || lowerDescAfterCard.includes('salário') || lowerDescAfterCard.includes('salario')) {
    period = 'pagamento';
    description = description.replace(/\s*(no\s+)?pagamento/gi, '').replace(/\s*(no\s+)?pgto/gi, '').replace(/\s*sal[aá]rio/gi, '').trim();
  } else if (lowerDescAfterCard.includes('adiantamento') || lowerDescAfterCard.includes('adto') || lowerDescAfterCard.includes('vale')) {
    period = 'vale';
    description = description.replace(/\s*(no\s+)?adiantamento/gi, '').replace(/\s*(no\s+)?adto/gi, '').replace(/\s*(no\s+)?vale/gi, '').trim();
  } else {
    // Detect day
    const dayMatch = lowerDescAfterCard.match(/dia\s*(\d{1,2})/i);
    if (dayMatch) {
      const day = parseInt(dayMatch[1], 10);
      if (day <= 5) {
        period = 'pagamento';
      } else if (day > 5) {
        period = 'vale';
      }
      description = description.replace(/\s*(no\s+)?dia\s*\d{1,2}/gi, '').trim();
    }
  }

  // Clean trailing/leading prepositions
  description = description.replace(/\s+(no|do|na|da)$/i, '').trim();
  description = description.replace(/^(no|do|na|da)\s+/i, '').trim();

  // Capitalize first letter of description
  if (description) {
    description = description.charAt(0).toUpperCase() + description.slice(1);
  }

  return { amount, description, period, targetCardId };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
