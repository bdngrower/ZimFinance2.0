import { useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, DollarSign, Wallet, TrendingDown, TrendingUp, Calendar, ChevronLeft, ChevronRight, CreditCard } from 'lucide-react';
import { MonthData, ExpenseRecord, IncomeRecord } from './types';
import { getInitializedData, MONTH_NAMES, generateYearData } from './csvParser';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export default function App() {
  const [appData, setAppData] = useState<{ [year: number]: MonthData[] }>(() => {
    const saved = localStorage.getItem('financas_pro_data_v3');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved data");
      }
    }
    return getInitializedData();
  });

  const [currentYear, setCurrentYear] = useState(() => {
    const saved = localStorage.getItem('financas_pro_year');
    return saved ? parseInt(saved, 10) : new Date().getFullYear();
  });

  const [currentMonthIndex, setCurrentMonthIndex] = useState(() => {
    const saved = localStorage.getItem('financas_pro_month');
    return saved ? parseInt(saved, 10) : new Date().getMonth();
  });

  useEffect(() => {
    localStorage.setItem('financas_pro_data_v3', JSON.stringify(appData));
  }, [appData]);

  useEffect(() => {
    localStorage.setItem('financas_pro_year', currentYear.toString());
  }, [currentYear]);

  useEffect(() => {
    localStorage.setItem('financas_pro_month', currentMonthIndex.toString());
  }, [currentMonthIndex]);

  // Ensure year exists
  if (!appData[currentYear]) {
    setAppData(prev => ({ ...prev, [currentYear]: generateYearData(currentYear) }));
    return null; // Will re-render
  }

  const currentMonthData = appData[currentYear][currentMonthIndex];

  const updateIncome = (field: keyof IncomeRecord, value: number) => {
    setAppData(prev => {
      const yearData = [...prev[currentYear]];
      yearData[currentMonthIndex].income[field] = value;
      return { ...prev, [currentYear]: yearData };
    });
  };

  const updateItem = (type: 'expenses' | 'cards', id: string, field: 'name' | 'pagamento' | 'vale', value: string | number) => {
    setAppData(prev => {
      const yearData = [...prev[currentYear]];
      const list = yearData[currentMonthIndex][type];
      const index = list.findIndex(e => e.id === id);
      if (index > -1) {
        if (field === 'name') {
          list[index].name = value as string;
        } else {
          list[index][field] = Number(value);
        }
      }
      return { ...prev, [currentYear]: yearData };
    });
  };

  const addItem = (type: 'expenses' | 'cards') => {
    setAppData(prev => {
      const yearData = [...prev[currentYear]];
      yearData[currentMonthIndex][type].push({
        id: Math.random().toString(36).substr(2, 9),
        name: '',
        pagamento: 0,
        vale: 0,
      });
      return { ...prev, [currentYear]: yearData };
    });
  };

  const removeItem = (type: 'expenses' | 'cards', id: string) => {
    setAppData(prev => {
      const yearData = [...prev[currentYear]];
      yearData[currentMonthIndex][type] = yearData[currentMonthIndex][type].filter(e => e.id !== id);
      return { ...prev, [currentYear]: yearData };
    });
  };

  const switchMonth = (index: number) => {
    setCurrentMonthIndex(index);
  };

  const totals = useMemo(() => {
    const expensesPagamento = currentMonthData.expenses.reduce((acc, curr) => acc + curr.pagamento, 0);
    const expensesVale = currentMonthData.expenses.reduce((acc, curr) => acc + curr.vale, 0);
    
    const cardsPagamento = currentMonthData.cards.reduce((acc, curr) => acc + curr.pagamento, 0);
    const cardsVale = currentMonthData.cards.reduce((acc, curr) => acc + curr.vale, 0);

    const totalIncome = currentMonthData.income.pagamento + currentMonthData.income.vale + currentMonthData.income.ferias + currentMonthData.income.decimoTerceiro;
    
    const totalDespesasPagamento = expensesPagamento + cardsPagamento;
    const totalDespesasVale = expensesVale + cardsVale;
    const totalExpenses = totalDespesasPagamento + totalDespesasVale;
    
    const remainingPagamento = currentMonthData.income.pagamento - totalDespesasPagamento;
    const remainingVale = currentMonthData.income.vale - totalDespesasVale;
    const totalRemaining = totalIncome - totalExpenses;

    return {
      totalDespesasPagamento,
      totalDespesasVale,
      totalIncome,
      totalExpenses,
      remainingPagamento,
      remainingVale,
      totalRemaining
    };
  }, [currentMonthData]);

  const ItemList = ({ title, icon: Icon, type, data, colorClass }: { title: string, icon: any, type: 'expenses' | 'cards', data: ExpenseRecord[], colorClass: string }) => (
    <div className="bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-neutral-100 overflow-hidden mb-8">
      <div className="p-5 sm:p-6 border-b border-neutral-100 flex justify-between items-center bg-white">
        <h2 className="text-lg font-semibold flex items-center text-neutral-800">
          <Icon className={`w-5 h-5 mr-3 ${colorClass}`} />
          {title}
        </h2>
        <button 
          onClick={() => addItem(type)}
          className="flex items-center space-x-1 text-neutral-600 bg-neutral-100 hover:bg-neutral-200 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Adicionar</span>
        </button>
      </div>
      
      <div className="p-3 sm:p-6 space-y-3 bg-neutral-50/50">
        {data.length === 0 && (
          <p className="text-center text-sm text-neutral-400 py-6">Nenhum item adicionado.</p>
        )}
        {data.map((item) => (
          <div key={item.id} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-white p-4 rounded-xl border border-neutral-100 shadow-sm transition-all hover:shadow-md hover:border-neutral-200">
            <div className="w-full sm:flex-1">
              <label className="block text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5 sm:hidden">Descrição</label>
              <input 
                type="text" 
                value={item.name}
                onChange={(e) => updateItem(type, item.id, 'name', e.target.value)}
                className="w-full bg-neutral-50/50 border border-neutral-200 focus:bg-white focus:ring-2 focus:ring-neutral-900 focus:border-transparent p-2.5 text-sm font-medium text-neutral-800 rounded-lg outline-none transition-all"
                placeholder={type === 'cards' ? 'Nome do Cartão' : 'Nome da Conta'}
              />
            </div>
            
            <div className="flex w-full sm:w-auto gap-3 items-end sm:items-center mt-1 sm:mt-0">
              <div className="flex-1 sm:w-32">
                <label className="block text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5 sm:hidden">Pagamento</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm font-medium">R$</span>
                  <input 
                    type="number" 
                    value={item.pagamento || ''}
                    onWheel={(e) => (e.target as HTMLElement).blur()}
                    onChange={(e) => updateItem(type, item.id, 'pagamento', e.target.value)}
                    className="w-full bg-neutral-50/50 border border-neutral-200 focus:bg-white focus:ring-2 focus:ring-neutral-900 focus:border-transparent py-2.5 pl-9 pr-3 text-sm text-right font-semibold text-neutral-800 rounded-lg outline-none transition-all placeholder:text-neutral-300"
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <div className="flex-1 sm:w-32">
                <label className="block text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5 sm:hidden">Vale</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm font-medium">R$</span>
                  <input 
                    type="number" 
                    value={item.vale || ''}
                    onWheel={(e) => (e.target as HTMLElement).blur()}
                    onChange={(e) => updateItem(type, item.id, 'vale', e.target.value)}
                    className="w-full bg-neutral-50/50 border border-neutral-200 focus:bg-white focus:ring-2 focus:ring-neutral-900 focus:border-transparent py-2.5 pl-9 pr-3 text-sm text-right font-semibold text-neutral-800 rounded-lg outline-none transition-all placeholder:text-neutral-300"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="pt-2 sm:pt-0 shrink-0">
                <button 
                  onClick={() => removeItem(type, item.id)}
                  className="p-2.5 text-neutral-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors bg-neutral-50 sm:bg-transparent"
                  title="Remover"
                >
                  <Trash2 className="w-5 h-5 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Totals Row */}
        {data.length > 0 && (
          <div className="mt-4 pt-4 border-t border-neutral-100 flex flex-col sm:flex-row justify-between sm:items-center bg-white p-5 rounded-xl shadow-sm border border-neutral-50">
            <span className="uppercase text-xs font-bold tracking-wider text-neutral-500 mb-3 sm:mb-0">
              Subtotal {type === 'cards' ? 'Cartões' : 'Contas'}
            </span>
            <div className="flex gap-6 sm:gap-8 font-semibold text-sm">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <span className="text-[10px] uppercase text-neutral-400">Pagamento</span>
                <span className="text-neutral-800 font-bold font-mono">{formatCurrency(data.reduce((a,c)=>a+c.pagamento,0))}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <span className="text-[10px] uppercase text-neutral-400">Vale</span>
                <span className="text-neutral-800 font-bold font-mono">{formatCurrency(data.reduce((a,c)=>a+c.vale,0))}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans pb-32">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 shadow-sm sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-neutral-900 p-2 rounded-lg text-white">
              <Wallet className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-900">Zim Finance</h1>
          </div>
          <div className="text-sm font-medium text-neutral-500 bg-neutral-100 px-3 py-1.5 rounded-full flex items-center">
            <Calendar className="w-4 h-4 mr-2" />
            {MONTH_NAMES[currentMonthIndex]} {currentYear}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        {/* Summary Dashboard */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-white p-5 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-neutral-100">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-emerald-100/50 p-2 rounded-full text-emerald-600">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h3 className="text-neutral-500 font-semibold text-xs uppercase tracking-wider">Recebido</h3>
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 font-mono tracking-tight">{formatCurrency(totals.totalIncome)}</p>
              <div className="flex items-center gap-3 mt-3 text-xs font-medium text-neutral-500">
                <div className="flex items-center"><div className="w-1.5 h-1.5 rounded-full bg-neutral-300 mr-1.5"></div> Pag: <span className="text-neutral-700 ml-1 font-mono">{formatCurrency(currentMonthData.income.pagamento)}</span></div>
                <div className="flex items-center"><div className="w-1.5 h-1.5 rounded-full bg-neutral-300 mr-1.5"></div> Vale: <span className="text-neutral-700 ml-1 font-mono">{formatCurrency(currentMonthData.income.vale)}</span></div>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-neutral-100">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-rose-100/50 p-2 rounded-full text-rose-600">
                <TrendingDown className="w-4 h-4" />
              </div>
              <h3 className="text-neutral-500 font-semibold text-xs uppercase tracking-wider">Gastos</h3>
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 font-mono tracking-tight">{formatCurrency(totals.totalExpenses)}</p>
              <div className="flex items-center gap-3 mt-3 text-xs font-medium text-neutral-500">
                <div className="flex items-center"><div className="w-1.5 h-1.5 rounded-full bg-neutral-300 mr-1.5"></div> Pag: <span className="text-neutral-700 ml-1 font-mono">{formatCurrency(totals.totalDespesasPagamento)}</span></div>
                <div className="flex items-center"><div className="w-1.5 h-1.5 rounded-full bg-neutral-300 mr-1.5"></div> Vale: <span className="text-neutral-700 ml-1 font-mono">{formatCurrency(totals.totalDespesasVale)}</span></div>
              </div>
            </div>
          </div>

          <div className={`p-5 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border transition-all ${Math.round(totals.totalRemaining) >= 0 ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-rose-600 border-rose-700 text-white'}`}>
            <div className="flex items-center space-x-3 mb-4">
              <div className={`p-2 rounded-full ${Math.round(totals.totalRemaining) >= 0 ? 'bg-neutral-800' : 'bg-rose-500'}`}>
                <DollarSign className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-xs uppercase tracking-wider text-white/80">Saldo Final</h3>
            </div>
            <div>
              <p className="text-2xl font-bold font-mono tracking-tight">
                {formatCurrency(totals.totalRemaining)}
              </p>
              <div className="flex items-center gap-3 mt-3 text-xs font-medium text-white/70">
                <div className="flex items-center"><div className="w-1.5 h-1.5 rounded-full bg-white/30 mr-1.5"></div> Pag: <span className="text-white ml-1 font-mono">{formatCurrency(totals.remainingPagamento)}</span></div>
                <div className="flex items-center"><div className="w-1.5 h-1.5 rounded-full bg-white/30 mr-1.5"></div> Vale: <span className="text-white ml-1 font-mono">{formatCurrency(totals.remainingVale)}</span></div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-8 order-2 lg:order-1 space-y-8">
            <ItemList 
              title="Contas Fixas e Variáveis"
              icon={TrendingDown}
              type="expenses"
              data={currentMonthData.expenses}
              colorClass="text-rose-500"
            />

            <ItemList 
              title="Faturas de Cartões"
              icon={CreditCard}
              type="cards"
              data={currentMonthData.cards}
              colorClass="text-indigo-500"
            />
          </div>

          {/* Income Settings Sidebar */}
          <div className="lg:col-span-4 order-1 lg:order-2">
            <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-neutral-100 lg:sticky lg:top-24">
              <h2 className="text-lg font-semibold text-neutral-800 mb-6 flex items-center">
                <TrendingUp className="w-5 h-5 mr-3 text-emerald-500" />
                Receitas do Mês
              </h2>
              
              <div className="space-y-4">
                {[
                  { label: "Pagamento", field: "pagamento", color: "emerald" },
                  { label: "Vale", field: "vale", color: "emerald" },
                  { label: "Férias", field: "ferias", color: "amber" },
                  { label: "13º Salário", field: "decimoTerceiro", color: "amber" },
                ].map((inputMap) => (
                  <div key={inputMap.field}>
                    <label className="block text-xs font-semibold text-neutral-500 mb-1.5 tracking-wide">{inputMap.label}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-medium text-sm">R$</span>
                      <input 
                        type="number" 
                        className={`w-full bg-neutral-50/50 border border-neutral-200 focus:bg-white focus:ring-2 focus:ring-${inputMap.color}-500 focus:border-transparent py-2.5 pl-9 pr-3 text-neutral-900 font-semibold rounded-xl outline-none transition-all placeholder:text-neutral-300 font-mono`}
                        value={currentMonthData.income[inputMap.field as keyof IncomeRecord] || ''}
                        onChange={(e) => updateIncome(inputMap.field as keyof IncomeRecord, Number(e.target.value))}
                        onWheel={(e) => (e.target as HTMLElement).blur()}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Navigation for Mobile / Fixed Footer for Desktop */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-neutral-200 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] z-30 pb-safe">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            
            <div className="w-full sm:w-auto flex items-center">
              <select 
                value={currentYear}
                onChange={(e) => setCurrentYear(Number(e.target.value))}
                className="w-full sm:w-32 bg-neutral-100 border border-neutral-200 hover:border-neutral-300 text-neutral-900 font-bold rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-neutral-900 transition-all cursor-pointer text-center"
              >
                {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div className="w-full sm:w-auto flex overflow-x-auto hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 space-x-2">
              {MONTH_NAMES.map((m, i) => (
                <button
                  key={m}
                  onClick={() => switchMonth(i)}
                  className={`whitespace-nowrap px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex-shrink-0 ${
                    currentMonthIndex === i 
                      ? 'bg-neutral-900 text-white shadow-md' 
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
     </div>

      {/* Bottom Navigation for Month/Year */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] pb-safe">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex-1 w-full overflow-x-auto hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
              <div className="flex space-x-2 pb-1">
                {MONTH_NAMES.map((m, i) => (
                  <button
                    key={m}
                    onClick={() => switchMonth(i)}
                    className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                      currentMonthIndex === i 
                        ? 'bg-neutral-800 text-white shadow-md' 
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div className="shrink-0">
              <div className="relative inline-flex">
                <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                <select 
                  value={currentYear}
                  onChange={(e) => setCurrentYear(Number(e.target.value))}
                  className="appearance-none bg-neutral-100 border border-neutral-200 text-neutral-800 font-semibold rounded-full pl-9 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                >
                  {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
                  <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-t-[5px] border-l-transparent border-r-transparent border-t-current"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

