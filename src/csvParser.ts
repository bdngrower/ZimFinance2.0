import { MonthData } from './types';
import { csv2024, csv2025, csv2026 } from './rawData';

export const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const parseVal = (val: string) => {
  if (!val) return 0;
  let clean = val.replace(/[^0-9.,-]/g, '').replace(',', '.');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : Math.abs(num);
};

const parseYearCsv = (csv: string, year: number): MonthData[] => {
  const months: MonthData[] = MONTH_NAMES.map((m, i) => ({
    id: `${year}-${String(i + 1).padStart(2, '0')}`,
    monthName: m,
    year,
    income: { pagamento: 0, vale: 0, ferias: 0, decimoTerceiro: 0 },
    expenses: [],
    cards: []
  }));

  const lines = csv.split('\n').map(l => l.split(','));

  let currentBlock: { monthIndex: number, colStart: number }[] = [];
  let readingSection = '';

  for (let i = 0; i < lines.length; i++) {
    const cols = lines[i].map(c => c.trim().toUpperCase());

    const foundMonths = cols
      .map((c, idx) => {
         const normalizedC = c.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
         const mIndex = MONTH_NAMES.findIndex(mn => 
            mn.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === normalizedC
         );
         return mIndex !== -1 ? { monthIndex: mIndex, colStart: idx } : null;
      })
      .filter(Boolean) as { monthIndex: number, colStart: number }[];

    if (foundMonths.length > 0) {
      currentBlock = foundMonths;
      readingSection = 'expenses';
      continue;
    }

    if (currentBlock.length === 0) continue;

    const firstCol = cols[currentBlock[0].colStart] || '';
    if (firstCol.includes('TOTAL') || firstCol.includes('RESTOU')) {
       readingSection = 'summary';
    }

    for (const block of currentBlock) {
      const name = lines[i][block.colStart]?.trim() || '';
      const nameUpper = name.toUpperCase();
      const pagStr = lines[i][block.colStart + 1] || '';
      const valeStr = lines[i][block.colStart + 2] || '';

      const pag = parseVal(pagStr);
      const vale = parseVal(valeStr);

      if (!nameUpper) continue;
      if (nameUpper === 'VALOR') continue;

      if (nameUpper.includes('RECEBIDO') && !nameUpper.includes('TOTAL')) {
        months[block.monthIndex].income.pagamento += pag;
        months[block.monthIndex].income.vale += vale;
      } else if (nameUpper.includes('FÉRIAS') || nameUpper.includes('FERIAS')) {
        months[block.monthIndex].income.ferias += (pag || vale);
      } else if (nameUpper.includes('DÉCIMO') || nameUpper.includes('DECIMO')) {
         months[block.monthIndex].income.decimoTerceiro += (pag || vale);
      }
      else if (readingSection === 'expenses' && !nameUpper.includes('CONTAS') && !nameUpper.includes('TOTAL') && !nameUpper.includes('RESTOU')) {
          const isCard = nameUpper.includes('CARTAO') || nameUpper.includes('CARTÃO');
          const record = {
            id: Math.random().toString(36).substr(2, 9),
            name: name,
            pagamento: pag,
            vale: vale
          };
          if (isCard) {
            months[block.monthIndex].cards.push(record);
          } else {
            months[block.monthIndex].expenses.push(record);
          }
      }
    }
  }

  for (const month of months) {
     month.expenses = month.expenses.filter(e => e.name && e.name.toUpperCase() !== 'VALOR');
     month.cards = month.cards.filter(e => e.name && e.name.toUpperCase() !== 'VALOR');
  }

  return months;
};

export const getInitializedData = () => {
  return {
    2024: parseYearCsv(csv2024, 2024),
    2025: parseYearCsv(csv2025, 2025),
    2026: parseYearCsv(csv2026, 2026)
  };
};

export const generateYearData = (year: number): MonthData[] => {
  return MONTH_NAMES.map((monthName, index) => ({
    id: `${year}-${String(index + 1).padStart(2, '0')}`,
    monthName,
    year,
    income: { pagamento: 0, vale: 0, ferias: 0, decimoTerceiro: 0 },
    expenses: [],
    cards: []
  }));
};
