const units: Record<string, number> = {
  'um': 1, 'uma': 1, 'dois': 2, 'duas': 2, 'três': 3, 'tres': 3, 'quatro': 4, 'cinco': 5,
  'seis': 6, 'sete': 7, 'oito': 8, 'nove': 9, 'dez': 10,
  'onze': 11, 'doze': 12, 'treze': 13, 'catorze': 14, 'quatorze': 14, 'quinze': 15,
  'dezesseis': 16, 'dezessete': 17, 'dezoito': 18, 'dezenove': 19,
  'vinte': 20, 'trinta': 30, 'quarenta': 40, 'cinquenta': 50,
  'sessenta': 60, 'setenta': 70, 'oitenta': 80, 'noventa': 90,
  'cem': 100, 'cento': 100, 'duzentos': 200, 'trezentos': 300, 'quatrocentos': 400,
  'quinhentos': 500, 'seiscentos': 600, 'setecentos': 700, 'oitocentos': 800, 'novecentos': 900,
};

const isNumberWord = (word: string | undefined) => word !== undefined && (word in units || word === 'mil');

export function convertWordsToNumbers(text: string): string {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  const result: string[] = [];

  let i = 0;
  while (i < words.length) {
    if (!isNumberWord(words[i])) {
      result.push(words[i]);
      i += 1;
      continue;
    }

    // "um café" e "uma pizza" são artigos, não valores
    if ((words[i] === 'um' || words[i] === 'uma') && !/^(mil|real)$/.test(words[i + 1] ?? '')) {
      result.push(words[i]);
      i += 1;
      continue;
    }

    let total = 0;
    let current = 0;
    while (i < words.length) {
      const word = words[i];
      if (word === 'mil') {
        total += (current || 1) * 1000;
        current = 0;
        i += 1;
      } else if (word in units) {
        current += units[word];
        i += 1;
      } else if (word === 'e' && isNumberWord(words[i + 1])) {
        i += 1;
      } else {
        break;
      }
    }
    result.push(String(total + current));
  }

  return result.join(' ');
}
