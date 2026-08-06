const wordsToNumbers: Record<string, number> = {
  'um': 1, 'dois': 2, 'três': 3, 'tres': 3, 'quatro': 4, 'cinco': 5,
  'seis': 6, 'sete': 7, 'oito': 8, 'nove': 9, 'dez': 10,
  'onze': 11, 'doze': 12, 'treze': 13, 'catorze': 14, 'quatorze': 14, 'quinze': 15,
  'dezesseis': 16, 'dezessete': 17, 'dezoito': 18, 'dezenove': 19,
  'vinte': 20, 'trinta': 30, 'quarenta': 40, 'cinquenta': 50,
  'sessenta': 60, 'setenta': 70, 'oitenta': 80, 'noventa': 90,
  'cem': 100
};

export function convertWordsToNumbers(text: string): string {
  let result = text.toLowerCase();
  
  // Replace simple word numbers
  for (const [word, num] of Object.entries(wordsToNumbers)) {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    result = result.replace(regex, num.toString());
  }
  
  return result;
}
