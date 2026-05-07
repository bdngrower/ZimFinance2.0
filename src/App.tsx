import { useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, DollarSign, Wallet, TrendingDown, TrendingUp, Calendar, CreditCard, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from './lib/supabaseClient';

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

type ItemRecord = { id: string, name: string, pagamento: number, vale: number };

export default function App() {
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [currentMonthIndex, setCurrentMonthIndex] = useState(() => new Date().getMonth());
  
  const [loading, setLoading] = useState(true);
  const [income, setIncome] = useState({ pagamento: 0, vale: 0, ferias: 0, decimoTerceiro: 0 });
  const [expenses, setExpenses] = useState<ItemRecord[]>([]);
  const [cards, setCards] = useState<ItemRecord[]>([]);

  const currentMonthId = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}`;

  useEffect(() => {
    fetchData();
  }, [currentMonthId]);

  const fetchData = async () => {
    setLoading(true);
    
    // Check if month exists, if not create it
    const { data: monthData, error: monthError } = await supabase
      .from('months')
      .select('*')
      .eq('id', currentMonthId)
      .single();

    if (!monthData && monthError?.code === 'PGRST116') {
      // Month doesn't exist, initialize
      await supabase.from('months').insert({
        id: currentMonthId,
        year: currentYear,
        month_name: MONTH_NAMES[currentMonthIndex],
      });
      setIncome({ pagamento: 0, vale: 0, ferias: 0, decimoTerceiro: 0 });
    } else if (monthData) {
      setIncome({
        pagamento: monthData.income_pagamento || 0,
        vale: monthData.income_vale || 0,
        ferias: monthData.income_ferias || 0,
        decimoTerceiro: monthData.income_decimo_terceiro || 0,
      });
    }

    // Fetch items
    const { data: items } = await supabase
      .from('items')
      .select('*')
      .eq('month_id', currentMonthId);

    if (items) {
      setExpenses(items.filter(i => i.type === 'expense'));
      setCards(items.filter(i => i.type === 'card'));
    } else {
      setExpenses([]);
      setCards([]);
    }

    setLoading(false);
  };

  const updateIncome = async (field: string, value: number) => {
    setIncome(prev => ({ ...prev, [field]: value }));
    const dbField = field === 'decimoTerceiro' ? 'income_decimo_terceiro' : `income_${field}`;
    await supabase.from('months').update({ [dbField]: value }).eq('id', currentMonthId);
  };

  const updateItem = async (type: 'expense' | 'card', id: string, field: string, value: string | number) => {
    const listUpdater = type === 'expense' ? setExpenses : setCards;
    listUpdater(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    await supabase.from('items').update({ [field]: value }).eq('id', id);
  };

  const addItem = async (type: 'expense' | 'card') => {
    const newItem = {
      id: Math.random().toString(36).substr(2, 9),
      month_id: currentMonthId,
      type,
      name: '',
      pagamento: 0,
      vale: 0
    };
    const listUpdater = type === 'expense' ? setExpenses : setCards;
    listUpdater(prev => [...prev, newItem]);
    await supabase.from('items').insert(newItem);
  };

  const removeItem = async (type: 'expense' | 'card', id: string) => {
    const listUpdater = type === 'expense' ? setExpenses : setCards;
    listUpdater(prev => prev.filter(item => item.id !== id));
    await supabase.from('items').delete().eq('id', id);
  };

  const totals = useMemo(() => {
    const expensesPagamento = expenses.reduce((acc, curr) => acc + (Number(curr.pagamento) || 0), 0);
    const expensesVale = expenses.reduce((acc, curr) => acc + (Number(curr.vale) || 0), 0);
    
    const cardsPagamento = cards.reduce((acc, curr) => acc + (Number(curr.pagamento) || 0), 0);
    const cardsVale = cards.reduce((acc, curr) => acc + (Number(curr.vale) || 0), 0);

    const totalIncome = (Number(income.pagamento)||0) + (Number(income.vale)||0) + (Number(income.ferias)||0) + (Number(income.decimoTerceiro)||0);
    
    const totalDespesasPagamento = expensesPagamento + cardsPagamento;
    const totalDespesasVale = expensesVale + cardsVale;
    const totalExpenses = totalDespesasPagamento + totalDespesasVale;
    
    const remainingPagamento = (Number(income.pagamento)||0) - totalDespesasPagamento;
    const remainingVale = (Number(income.vale)||0) - totalDespesasVale;
    const totalRemaining = totalIncome - totalExpenses;

    return { totalDespesasPagamento, totalDespesasVale, totalIncome, totalExpenses, remainingPagamento, remainingVale, totalRemaining };
  }, [income, expenses, cards]);

  const ItemList = ({ title, icon: Icon, type, data, colorClass }: any) => (
    <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden mb-8 shadow-2xl transition-all duration-300 hover:border-white/20">
      <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
        <h2 className="text-xl font-bold flex items-center text-white">
          <div className={`p-2 rounded-xl mr-4 bg-white/5`}>
            <Icon className={`w-6 h-6 ${colorClass}`} />
          </div>
          {title}
        </h2>
        <button 
          onClick={() => addItem(type)}
          className="flex items-center space-x-2 text-white bg-white/10 hover:bg-white/20 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Adicionar</span>
        </button>
      </div>
      
      <div className="p-6 space-y-4">
        {data.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-white/40">
            <Icon className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm font-medium">Nenhum item adicionado.</p>
          </div>
        )}
        {data.map((item: any) => (
          <div key={item.id} className="flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-white/5 p-4 rounded-2xl border border-white/5 transition-all hover:bg-white/10 group">
            <div className="w-full sm:flex-1">
              <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2 sm:hidden">Descrição</label>
              <input 
                type="text" 
                value={item.name}
                onChange={(e) => updateItem(type, item.id, 'name', e.target.value)}
                className="w-full bg-transparent border-none focus:ring-0 p-1 text-base font-semibold text-white placeholder-white/20 outline-none"
                placeholder={type === 'card' ? 'Nome do Cartão' : 'Nome da Conta'}
              />
            </div>
            
            <div className="flex w-full sm:w-auto gap-4 items-end sm:items-center">
              <div className="flex-1 sm:w-36 bg-black/20 rounded-xl p-1 px-3 border border-white/5 focus-within:border-emerald-500/50 transition-colors">
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1 mt-1">Pagamento</label>
                <div className="relative flex items-center pb-1">
                  <span className="text-white/40 text-sm font-medium mr-1">R$</span>
                  <input 
                    type="number" 
                    value={item.pagamento || ''}
                    onWheel={(e) => (e.target as HTMLElement).blur()}
                    onChange={(e) => updateItem(type, item.id, 'pagamento', e.target.value)}
                    className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm font-mono text-white text-right outline-none"
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <div className="flex-1 sm:w-36 bg-black/20 rounded-xl p-1 px-3 border border-white/5 focus-within:border-emerald-500/50 transition-colors">
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1 mt-1">Vale</label>
                <div className="relative flex items-center pb-1">
                  <span className="text-white/40 text-sm font-medium mr-1">R$</span>
                  <input 
                    type="number" 
                    value={item.vale || ''}
                    onWheel={(e) => (e.target as HTMLElement).blur()}
                    onChange={(e) => updateItem(type, item.id, 'vale', e.target.value)}
                    className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm font-mono text-white text-right outline-none"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <button 
                onClick={() => removeItem(type, item.id)}
                className="p-3 text-white/20 hover:text-rose-400 hover:bg-rose-400/10 rounded-xl transition-all sm:opacity-0 group-hover:opacity-100"
                title="Remover"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}

        {data.length > 0 && (
          <div className="mt-6 pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between sm:items-center">
            <span className="uppercase text-xs font-bold tracking-widest text-white/40 mb-3 sm:mb-0">
              Subtotal {type === 'card' ? 'Cartões' : 'Contas'}
            </span>
            <div className="flex gap-6 sm:gap-8 bg-black/20 py-2 px-6 rounded-2xl border border-white/5">
              <div className="flex flex-col items-end">
                <span className="text-[9px] uppercase tracking-widest text-white/40">Pagamento</span>
                <span className="text-white font-bold font-mono text-sm">{formatCurrency(data.reduce((a:any,c:any)=>a+Number(c.pagamento||0),0))}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[9px] uppercase tracking-widest text-white/40">Vale</span>
                <span className="text-white font-bold font-mono text-sm">{formatCurrency(data.reduce((a:any,c:any)=>a+Number(c.vale||0),0))}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f1115] text-white font-sans pb-32 selection:bg-emerald-500/30 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-600/20 blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/20 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-white/10 bg-[#0f1115]/50 backdrop-blur-2xl sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 p-2.5 rounded-2xl shadow-lg shadow-emerald-500/20">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
              ZimFinance
            </h1>
          </div>
          <div className="flex items-center bg-white/5 border border-white/10 px-5 py-2.5 rounded-2xl backdrop-blur-md">
            <Calendar className="w-4 h-4 mr-3 text-emerald-400" />
            <span className="text-sm font-semibold tracking-wide text-white/90">
              {MONTH_NAMES[currentMonthIndex]} {currentYear}
            </span>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mb-4" />
          <p className="text-white/50 font-medium animate-pulse">Sincronizando com Supabase...</p>
        </div>
      ) : (
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 space-y-10 relative z-10">
          
          {/* Summary Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 relative overflow-hidden group hover:bg-white/10 transition-all duration-500">
              <div className="absolute top-0 right-0 p-6 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500">
                <TrendingUp className="w-24 h-24" />
              </div>
              <div className="flex items-center space-x-3 mb-6 relative z-10">
                <div className="bg-emerald-500/20 p-2.5 rounded-xl border border-emerald-500/30">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="text-white/60 font-bold text-xs uppercase tracking-widest">Receitas</h3>
              </div>
              <div className="relative z-10">
                <p className="text-4xl font-extrabold text-white font-mono tracking-tight">{formatCurrency(totals.totalIncome)}</p>
                <div className="flex items-center gap-4 mt-6 bg-black/20 p-3 rounded-2xl border border-white/5">
                  <div className="flex-1 flex flex-col"><span className="text-[9px] uppercase tracking-widest text-white/40 mb-1">Pagamento</span><span className="text-white/90 font-mono text-sm font-semibold">{formatCurrency(income.pagamento)}</span></div>
                  <div className="w-px h-8 bg-white/10"></div>
                  <div className="flex-1 flex flex-col"><span className="text-[9px] uppercase tracking-widest text-white/40 mb-1">Vale</span><span className="text-white/90 font-mono text-sm font-semibold">{formatCurrency(income.vale)}</span></div>
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 relative overflow-hidden group hover:bg-white/10 transition-all duration-500">
              <div className="absolute top-0 right-0 p-6 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500">
                <TrendingDown className="w-24 h-24" />
              </div>
              <div className="flex items-center space-x-3 mb-6 relative z-10">
                <div className="bg-rose-500/20 p-2.5 rounded-xl border border-rose-500/30">
                  <TrendingDown className="w-5 h-5 text-rose-400" />
                </div>
                <h3 className="text-white/60 font-bold text-xs uppercase tracking-widest">Gastos</h3>
              </div>
              <div className="relative z-10">
                <p className="text-4xl font-extrabold text-white font-mono tracking-tight">{formatCurrency(totals.totalExpenses)}</p>
                <div className="flex items-center gap-4 mt-6 bg-black/20 p-3 rounded-2xl border border-white/5">
                  <div className="flex-1 flex flex-col"><span className="text-[9px] uppercase tracking-widest text-white/40 mb-1">Pagamento</span><span className="text-white/90 font-mono text-sm font-semibold">{formatCurrency(totals.totalDespesasPagamento)}</span></div>
                  <div className="w-px h-8 bg-white/10"></div>
                  <div className="flex-1 flex flex-col"><span className="text-[9px] uppercase tracking-widest text-white/40 mb-1">Vale</span><span className="text-white/90 font-mono text-sm font-semibold">{formatCurrency(totals.totalDespesasVale)}</span></div>
                </div>
              </div>
            </div>

            <div className={`p-6 rounded-3xl border relative overflow-hidden transition-all duration-500 ${totals.totalRemaining >= 0 ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_30px_-5px_rgba(16,185,129,0.2)]' : 'bg-rose-500/10 border-rose-500/30 shadow-[0_0_30px_-5px_rgba(244,63,94,0.2)]'}`}>
              <div className="absolute top-0 right-0 p-6 opacity-10 transform translate-x-4 -translate-y-4">
                <DollarSign className="w-24 h-24" />
              </div>
              <div className="flex items-center space-x-3 mb-6 relative z-10">
                <div className={`p-2.5 rounded-xl border ${totals.totalRemaining >= 0 ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-rose-500/20 border-rose-500/30'}`}>
                  <DollarSign className={`w-5 h-5 ${totals.totalRemaining >= 0 ? 'text-emerald-400' : 'text-rose-400'}`} />
                </div>
                <h3 className="text-white/80 font-bold text-xs uppercase tracking-widest">Saldo Final</h3>
              </div>
              <div className="relative z-10">
                <p className={`text-4xl font-extrabold font-mono tracking-tight ${totals.totalRemaining >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatCurrency(totals.totalRemaining)}
                </p>
                <div className="flex items-center gap-4 mt-6 bg-black/20 p-3 rounded-2xl border border-white/5">
                  <div className="flex-1 flex flex-col"><span className="text-[9px] uppercase tracking-widest text-white/50 mb-1">Sobra Pag.</span><span className="text-white font-mono text-sm font-semibold">{formatCurrency(totals.remainingPagamento)}</span></div>
                  <div className="w-px h-8 bg-white/10"></div>
                  <div className="flex-1 flex flex-col"><span className="text-[9px] uppercase tracking-widest text-white/50 mb-1">Sobra Vale</span><span className="text-white font-mono text-sm font-semibold">{formatCurrency(totals.remainingVale)}</span></div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 order-2 lg:order-1 space-y-8">
              <ItemList 
                title="Contas Fixas e Variáveis"
                icon={TrendingDown}
                type="expense"
                data={expenses}
                colorClass="text-rose-400"
              />

              <ItemList 
                title="Faturas de Cartões"
                icon={CreditCard}
                type="card"
                data={cards}
                colorClass="text-indigo-400"
              />
            </div>

            <div className="lg:col-span-4 order-1 lg:order-2">
              <div className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 lg:sticky lg:top-28 shadow-2xl">
                <h2 className="text-xl font-bold text-white mb-8 flex items-center">
                  <div className="bg-emerald-500/20 p-2 rounded-xl mr-4 border border-emerald-500/30">
                    <TrendingUp className="w-6 h-6 text-emerald-400" />
                  </div>
                  Receitas do Mês
                </h2>
                
                <div className="space-y-6">
                  {[
                    { label: "Pagamento", field: "pagamento", color: "emerald" },
                    { label: "Vale", field: "vale", color: "emerald" },
                    { label: "Férias", field: "ferias", color: "amber" },
                    { label: "13º Salário", field: "decimoTerceiro", color: "amber" },
                  ].map((inputMap) => (
                    <div key={inputMap.field} className="bg-black/20 p-4 rounded-2xl border border-white/5 focus-within:border-emerald-500/50 transition-colors group">
                      <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">{inputMap.label}</label>
                      <div className="relative flex items-center">
                        <span className="text-white/40 font-medium mr-2">R$</span>
                        <input 
                          type="number" 
                          className="w-full bg-transparent border-none focus:ring-0 p-0 text-xl text-white font-mono font-semibold outline-none placeholder-white/10"
                          value={income[inputMap.field as keyof typeof income] || ''}
                          onChange={(e) => updateIncome(inputMap.field, Number(e.target.value))}
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
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0f1115]/80 backdrop-blur-2xl border-t border-white/10 z-50 pb-safe shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.5)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex-1 w-full overflow-x-auto hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth">
              <div className="flex space-x-3 pb-2 sm:pb-0">
                {MONTH_NAMES.map((m, i) => (
                  <button
                    key={m}
                    onClick={() => setCurrentMonthIndex(i)}
                    className={`whitespace-nowrap px-5 py-2.5 rounded-2xl text-sm font-bold transition-all duration-300 ${
                      currentMonthIndex === i 
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25 scale-105' 
                        : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div className="shrink-0 flex items-center bg-white/5 p-1 rounded-2xl border border-white/10">
              <button onClick={() => setCurrentYear(y => y - 1)} className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-colors"><ChevronLeft className="w-5 h-5"/></button>
              <span className="w-16 text-center font-bold text-white font-mono">{currentYear}</span>
              <button onClick={() => setCurrentYear(y => y + 1)} className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-colors"><ChevronRight className="w-5 h-5"/></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
