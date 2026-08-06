/**
 * A simple NLP parser for quick expense entry.
 * It tries to extract the value and description from a natural language string.
 */

export interface ParsedExpense {
  amount: number | null;
  description: string;
}

export function parseExpenseText(text: string): ParsedExpense {
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

  // Capitalize first letter of description
  if (description) {
    description = description.charAt(0).toUpperCase() + description.slice(1);
  }

  return { amount, description };
}
