import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, DollarSign, Wallet, TrendingDown, TrendingUp, Calendar, CreditCard, Loader2, ChevronLeft, ChevronRight, LogOut, Edit2, Check, Lock, LayoutDashboard, Receipt, PieChart as PieChartIcon } from 'lucide-react';
import { supabase } from './lib/supabaseClient';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const PIE_COLORS = ['#10b981', '#3b82f6', '#f43f5e', '#8b5cf6', '#f59e0b', '#64748b', '#ec4899', '#14b8a6', '#f97316', '#6366f1'];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

type ItemRecord = { id: string, name: string, pagamento: number, vale: number, type: string };
type CardExpense = { id: string, card_item_id: string, name: string, value: number };

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  const dateNow = new Date();
  const realCurrentYear = dateNow.getFullYear();
  const realCurrentMonth = dateNow.getMonth();

  const [currentYear, setCurrentYear] = useState(realCurrentYear);
  const [currentMonthIndex, setCurrentMonthIndex] = useState(realCurrentMonth);
  
  const [loading, setLoading] = useState(true);
  
  const [activeView, setActiveView] = useState<'dashboard' | 'lancamentos'>('dashboard');

  const [income, setIncome] = useState({ pagamento: 0, vale: 0, ferias: 0, decimoTerceiro: 0 });
  const [items, setItems] = useState<ItemRecord[]>([]);

  const [editingItems, setEditingItems] = useState<{ [key: string]: boolean }>({});
  const [editingIncome, setEditingIncome] = useState(false);
  const [expandedCards, setExpandedCards] = useState<{ [key: string]: boolean }>({});
  const [cardExpenses, setCardExpenses] = useState<{ [cardId: string]: CardExpense[] }>({});
  const [editingCardExpenses, setEditingCardExpenses] = useState<{ [expId: string]: boolean }>({});

  const [yearData, setYearData] = useState<any[]>([]);
  const [annualTotals, setAnnualTotals] = useState({ income: 0, expense: 0 });
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const currentMonthId = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}`;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      fetchData();
      fetchYearData();
    }
  }, [currentMonthId, session?.user?.id]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthError(error.message);
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const fetchYearData = async () => {
    const { data: months } = await supabase.from('months').select('*').eq('year', currentYear);
    if (!months) return;

    const monthIds = months.map(m => m.id);
    const { data: allItems } = await supabase.from('items').select('*').in('month_id', monthIds);

    let totalInc = 0;
    let totalExp = 0;

    const chartData = MONTH_NAMES.map((name, idx) => {
      const mId = `${currentYear}-${String(idx + 1).padStart(2, '0')}`;
      const monthDb = months.find(m => m.id === mId);
      const mItems = allItems?.filter(i => i.month_id === mId) || [];
      
      const rec = monthDb ? (Number(monthDb.income_pagamento||0) + Number(monthDb.income_vale||0) + Number(monthDb.income_ferias||0) + Number(monthDb.income_decimo_terceiro||0)) : 0;
      const desp = mItems.reduce((acc, curr) => acc + (Number(curr.pagamento)||0) + (Number(curr.vale)||0), 0);
      
      totalInc += rec;
      totalExp += desp;

      return {
        name: name.substring(0, 3),
        Receitas: rec,
        Despesas: desp,
        Saldo: rec - desp
      };
    });

    setYearData(chartData);
    setAnnualTotals({ income: totalInc, expense: totalExp, balance: totalInc - totalExp } as any);
  };

  const fetchData = async () => {
    setLoading(true);
    
    let { data: monthData, error: monthError } = await supabase
      .from('months')
      .select('*')
      .eq('id', currentMonthId)
      .single();

    if (!monthData && monthError?.code === 'PGRST116') {
      const { data: newMonth } = await supabase.from('months').insert({
        id: currentMonthId,
        year: currentYear,
        month_name: MONTH_NAMES[currentMonthIndex],
      }).select().single();
      monthData = newMonth;
      setIncome({ pagamento: 0, vale: 0, ferias: 0, decimoTerceiro: 0 });
    } else if (monthData) {
      setIncome({
        pagamento: monthData.income_pagamento || 0,
        vale: monthData.income_vale || 0,
        ferias: monthData.income_ferias || 0,
        decimoTerceiro: monthData.income_decimo_terceiro || 0,
      });
    }

    const { data: currentItems } = await supabase
      .from('items')
      .select('*')
      .eq('month_id', currentMonthId);

    if (currentItems) {
      setItems(currentItems);
      // Buscar despesas de todos os cartões do mês
      const cardIds = currentItems.filter(i => i.type.startsWith('card_')).map(i => i.id);
      if (cardIds.length > 0) {
        const { data: expenses } = await supabase
          .from('card_expenses')
          .select('*')
          .in('card_item_id', cardIds);
        if (expenses) {
          const expMap: { [cardId: string]: CardExpense[] } = {};
          expenses.forEach(e => {
            if (!expMap[e.card_item_id]) expMap[e.card_item_id] = [];
            expMap[e.card_item_id].push(e);
          });
          setCardExpenses(expMap);
        }
      } else {
        setCardExpenses({});
      }
    } else {
      setItems([]);
      setCardExpenses({});
    }

    setEditingItems({});
    setEditingIncome(false);
    setLoading(false);
  };

  const saveIncome = async () => {
    await supabase.from('months').update({
      income_pagamento: income.pagamento,
      income_vale: income.vale,
      income_ferias: income.ferias,
      income_decimo_terceiro: income.decimoTerceiro
    }).eq('id', currentMonthId);
    setEditingIncome(false);
    fetchYearData();
  };

  const saveItem = async (item: ItemRecord) => {
    await supabase.from('items').update({
      name: item.name,
      pagamento: item.pagamento,
      vale: item.vale,
      type: item.type
    }).eq('id', item.id);
    setEditingItems(prev => ({ ...prev, [item.id]: false }));
    fetchYearData();
  };

  const updateCardSource = async (item: ItemRecord, source: 'pagamento' | 'vale') => {
    const currentAmount = Math.max(Number(item.pagamento)||0, Number(item.vale)||0);
    const updated = {
      ...item,
      type: `card_${source}`,
      pagamento: source === 'pagamento' ? currentAmount : 0,
      vale: source === 'vale' ? currentAmount : 0
    };
    
    setItems(prev => prev.map(i => i.id === item.id ? updated : i));
    
    await supabase.from('items').update({
      type: updated.type,
      pagamento: updated.pagamento,
      vale: updated.vale
    }).eq('id', item.id);
    
    fetchYearData();
  };

  const addItem = async (type: string) => {
    const newItem = {
      id: Math.random().toString(36).substr(2, 9),
      month_id: currentMonthId,
      type,
      name: '',
      pagamento: 0,
      vale: 0
    };
    setItems(prev => [...prev, newItem]);
    await supabase.from('items').insert(newItem);
    setEditingItems(prev => ({ ...prev, [newItem.id]: true }));
  };

  const removeItem = async (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
    setCardExpenses(prev => { const n = {...prev}; delete n[id]; return n; });
    await supabase.from('items').delete().eq('id', id);
    fetchYearData();
  };

  // ---- Card Expenses ----
  const toggleExpandCard = (cardId: string) => {
    setExpandedCards(prev => ({ ...prev, [cardId]: !prev[cardId] }));
  };

  const addCardExpense = async (cardItem: ItemRecord) => {
    const newExp: CardExpense = {
      id: Math.random().toString(36).substr(2, 9),
      card_item_id: cardItem.id,
      name: '',
      value: 0,
    };
    setCardExpenses(prev => ({
      ...prev,
      [cardItem.id]: [...(prev[cardItem.id] || []), newExp]
    }));
    setEditingCardExpenses(prev => ({ ...prev, [newExp.id]: true }));
    await supabase.from('card_expenses').insert(newExp);
  };

  const updateCardExpenseLocal = (cardId: string, expId: string, field: string, value: string | number) => {
    setCardExpenses(prev => ({
      ...prev,
      [cardId]: (prev[cardId] || []).map(e => e.id === expId ? { ...e, [field]: value } : e)
    }));
  };

  const saveCardExpense = async (cardItem: ItemRecord, exp: CardExpense) => {
    await supabase.from('card_expenses').update({ name: exp.name, value: exp.value }).eq('id', exp.id);
    setEditingCardExpenses(prev => ({ ...prev, [exp.id]: false }));
    // Apenas atualiza o estado local das despesas - o base (pagamento/vale) não muda
    setCardExpenses(prev => ({
      ...prev,
      [cardItem.id]: (prev[cardItem.id] || []).map(e => e.id === exp.id ? exp : e)
    }));
    fetchYearData();
  };

  const removeCardExpense = async (cardItem: ItemRecord, expId: string) => {
    const remaining = (cardExpenses[cardItem.id] || []).filter(e => e.id !== expId);
    setCardExpenses(prev => ({ ...prev, [cardItem.id]: remaining }));
    await supabase.from('card_expenses').delete().eq('id', expId);
    fetchYearData();
  };

  const updateIncomeLocal = (field: string, value: number) => {
    setIncome(prev => ({ ...prev, [field]: value }));
  };

  const updateItemLocal = (id: string, field: string, value: string | number) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const totals = useMemo(() => {
    const expensesPagamento = items.filter(i => i.type === 'expense_pagamento').reduce((a, c) => a + (Number(c.pagamento)||0), 0);
    const expensesVale = items.filter(i => i.type === 'expense_vale').reduce((a, c) => a + (Number(c.vale)||0), 0);
    // Base manual do cartão (items.pagamento/vale) + despesas individuais
    const cardsPagamento = items.filter(i => i.type === 'card_pagamento').reduce((a, c) => {
      const base = Number(c.pagamento)||0;
      const expsSum = (cardExpenses[c.id] || []).reduce((s, e) => s + Number(e.value||0), 0);
      return a + base + expsSum;
    }, 0);
    const cardsVale = items.filter(i => i.type === 'card_vale').reduce((a, c) => {
      const base = Number(c.vale)||0;
      const expsSum = (cardExpenses[c.id] || []).reduce((s, e) => s + Number(e.value||0), 0);
      return a + base + expsSum;
    }, 0);

    const totalPagamentoIncome = (Number(income.pagamento)||0) + (Number(income.ferias)||0) + (Number(income.decimoTerceiro)||0);
    const totalValeIncome = (Number(income.vale)||0);

    const totalIncome = totalPagamentoIncome + totalValeIncome;
    
    const totalDespesasPagamento = expensesPagamento + cardsPagamento;
    const totalDespesasVale = expensesVale + cardsVale;
    const totalExpenses = totalDespesasPagamento + totalDespesasVale;
    
    const totalRemaining = totalIncome - totalExpenses;

    const remainingPagamento = totalPagamentoIncome - totalDespesasPagamento;
    const remainingVale = totalValeIncome - totalDespesasVale;

    return { 
      totalDespesasPagamento, 
      totalDespesasVale, 
      totalIncome, 
      totalExpenses, 
      totalRemaining, 
      totalPagamentoIncome, 
      totalValeIncome,
      remainingPagamento,
      remainingVale
    };
  }, [income, items, cardExpenses]);

  const pieChartData = useMemo(() => {
    const expenses = items.filter(i => i.type.startsWith('expense_') || i.type.startsWith('card_'));
    
    // Agrupar gastos com o mesmo nome; para cartões, soma base + despesas individuais
    const grouped = expenses.reduce((acc, curr) => {
      const name = curr.name?.trim() || 'Sem nome';
      const base = (Number(curr.pagamento)||0) + (Number(curr.vale)||0);
      const expsSum = curr.type.startsWith('card_')
        ? (cardExpenses[curr.id] || []).reduce((s, e) => s + Number(e.value||0), 0)
        : 0;
      const totalVal = base + expsSum;
      if (totalVal > 0) {
        acc[name] = (acc[name] || 0) + totalVal;
      }
      return acc;
    }, {} as Record<string, number>);

    // Mostrar TODOS os itens ordenados por valor (sem "Outros")
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value: value as number }))
      .sort((a, b) => b.value - a.value);
  }, [items, cardExpenses]);

  if (authLoading) {
    return <div className="min-h-screen bg-[#0f1115] flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-emerald-500" /></div>;
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#0f1115] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-600/20 blur-[120px] pointer-events-none" />
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl w-full max-w-md shadow-2xl relative z-10">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 p-4 rounded-2xl shadow-lg shadow-emerald-500/20 mb-4">
              <Wallet className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">ZimFinance</h1>
            <p className="text-white/50 text-sm mt-2">Acesse seu controle financeiro</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-5">
            {authError && <div className="bg-rose-500/20 text-rose-400 p-3 rounded-xl text-sm text-center border border-rose-500/30">{authError}</div>}
            <div>
              <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">E-mail</label>
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-black/20 border border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 p-3 rounded-xl text-white outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Senha</label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-black/20 border border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 p-3 rounded-xl text-white outline-none transition-all"
                required
              />
            </div>
            <button type="submit" className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold py-3.5 rounded-xl hover:from-emerald-400 hover:to-emerald-500 transition-all shadow-lg shadow-emerald-500/25 active:scale-95">
              Entrar
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#0f1115] text-white font-sans overflow-hidden selection:bg-emerald-500/30">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0f1115]/90 backdrop-blur-2xl border-r border-white/10 flex flex-col z-50">
        <div className="h-24 flex items-center px-8 border-b border-white/5">
          <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 p-2.5 rounded-2xl shadow-lg shadow-emerald-500/20 mr-4">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
            ZimFinance
          </h1>
        </div>
        
        <nav className="flex-1 px-4 py-8 space-y-2">
          <button 
            onClick={() => setActiveView('dashboard')}
            className={`w-full flex items-center px-4 py-3.5 rounded-2xl font-bold transition-all ${activeView === 'dashboard' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-white/50 hover:text-white hover:bg-white/5 border border-transparent'}`}
          >
            <LayoutDashboard className="w-5 h-5 mr-3" />
            Dashboard
          </button>
          <button 
            onClick={() => setActiveView('lancamentos')}
            className={`w-full flex items-center px-4 py-3.5 rounded-2xl font-bold transition-all ${activeView === 'lancamentos' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-white/50 hover:text-white hover:bg-white/5 border border-transparent'}`}
          >
            <Receipt className="w-5 h-5 mr-3" />
            Lançamentos
          </button>
        </nav>

        <div className="p-4 border-t border-white/5">
          <div className="flex items-center justify-between bg-black/20 p-3 rounded-2xl border border-white/5">
            <div className="flex items-center overflow-hidden">
              <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2 flex-shrink-0"></div>
              <span className="text-xs text-white/50 truncate pr-2">{session.user.email}</span>
            </div>
            <button onClick={handleLogout} className="p-2 bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 rounded-xl text-white/70 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-600/20 blur-[120px] pointer-events-none" />
        <div className="fixed bottom-[10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/20 blur-[120px] pointer-events-none" />

        {/* Top Header */}
        <header className="h-16 px-8 border-b border-white/10 flex items-center justify-between bg-white/5 backdrop-blur-xl z-40">
          <h2 className="text-lg font-bold text-white/90">
            {activeView === 'dashboard' ? 'Dashboard Financeiro' : 'Controle de Lan\u00e7amentos'}
          </h2>
          
          <div className="flex items-center gap-1 bg-black/40 px-1.5 py-1 rounded-xl border border-white/10 relative">
            <button onClick={() => setCurrentYear(y => y - 1)} className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"><ChevronLeft className="w-3.5 h-3.5"/></button>
            <span className="w-10 text-center font-bold text-emerald-400 font-mono text-xs">{currentYear}</span>
            <button onClick={() => setCurrentYear(y => y + 1)} className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"><ChevronRight className="w-3.5 h-3.5"/></button>
            
            <div className="w-px h-5 bg-white/10 mx-0.5"></div>
            
            <button onClick={() => {
              if (currentMonthIndex === 0) { setCurrentMonthIndex(11); setCurrentYear(y => y - 1); }
              else { setCurrentMonthIndex(m => m - 1); }
            }} className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"><ChevronLeft className="w-3.5 h-3.5"/></button>
            <button
              onClick={() => setShowMonthPicker(p => !p)}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                currentMonthIndex === realCurrentMonth && currentYear === realCurrentYear
                  ? 'text-emerald-400 bg-emerald-500/15'
                  : 'text-white/80 hover:bg-white/10'
              }`}
            >
              {MONTH_NAMES[currentMonthIndex].substring(0, 3)}
            </button>
            <button onClick={() => {
              if (currentMonthIndex === 11) { setCurrentMonthIndex(0); setCurrentYear(y => y + 1); }
              else { setCurrentMonthIndex(m => m + 1); }
            }} className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"><ChevronRight className="w-3.5 h-3.5"/></button>

            {/* Month Picker Grid */}
            {showMonthPicker && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMonthPicker(false)} />
                <div className="absolute top-full right-0 mt-2 z-50 bg-[#1a1d23] border border-white/10 rounded-2xl p-3 shadow-2xl backdrop-blur-xl w-64 animate-in fade-in zoom-in-95 duration-150">
                  <div className="grid grid-cols-3 gap-1.5">
                    {MONTH_NAMES.map((m, idx) => {
                      const isActive = idx === currentMonthIndex;
                      const isCurrent = idx === realCurrentMonth && currentYear === realCurrentYear;
                      return (
                        <button
                          key={m}
                          onClick={() => { setCurrentMonthIndex(idx); setShowMonthPicker(false); }}
                          className={`px-2 py-2 rounded-xl text-xs font-bold transition-all ${
                            isActive
                              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                              : isCurrent
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'text-white/60 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          {m.substring(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 relative z-10 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto">
              
              {/* Top Monthly Stats - Compact */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                {[
                  { label: 'Receita Mensal', value: totals.totalIncome, icon: TrendingUp, color: 'emerald', sub: null },
                  { label: 'Gastos Mensal', value: totals.totalExpenses, icon: TrendingDown, color: 'rose', sub: null },
                  { label: 'Saldo Pgto', value: totals.remainingPagamento, icon: DollarSign, color: totals.remainingPagamento >= 0 ? 'emerald' : 'rose', sub: `Rec: ${formatCurrency(totals.totalPagamentoIncome)}` },
                  { label: 'Saldo Adto', value: totals.remainingVale, icon: Wallet, color: totals.remainingVale >= 0 ? 'indigo' : 'rose', sub: `Rec: ${formatCurrency(totals.totalValeIncome)}` },
                  { label: 'Saldo Total', value: totals.totalRemaining, icon: DollarSign, color: totals.totalRemaining >= 0 ? 'emerald' : 'rose', sub: null },
                ].map((card, idx) => {
                  const Icon = card.icon;
                  const colorMap: Record<string, string> = {
                    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
                    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
                    indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
                  };
                  const colors = colorMap[card.color] || colorMap.emerald;
                  const textColor = card.color === 'rose' ? 'text-rose-400' : card.color === 'indigo' ? 'text-indigo-400' : 'text-emerald-400';
                  return (
                    <div key={idx} className={`${idx === 4 ? 'col-span-2 lg:col-span-1' : ''} bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4 hover:border-white/20 transition-all group`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{card.label}</span>
                        <div className={`p-1.5 rounded-lg border ${colors}`}>
                          <Icon className="w-3 h-3" />
                        </div>
                      </div>
                      <p className={`text-xl font-extrabold font-mono tracking-tight ${textColor}`}>{formatCurrency(card.value)}</p>
                      {card.sub && <p className="text-[10px] text-white/30 font-mono mt-1">{card.sub}</p>}
                    </div>
                  );
                })}
              </div>

              {activeView === 'dashboard' ? (
                /* Annual Stats & Charts */
                <div className="space-y-4">
                  {/* Annual summary strip */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl px-4 py-3 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Receita Anual</span>
                      <span className="text-sm font-mono font-bold text-emerald-400">{formatCurrency(annualTotals.income)}</span>
                    </div>
                    <div className="bg-rose-500/5 border border-rose-500/15 rounded-xl px-4 py-3 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Gasto Anual</span>
                      <span className="text-sm font-mono font-bold text-rose-400">{formatCurrency(annualTotals.expense)}</span>
                    </div>
                    <div className={`${(annualTotals as any).balance >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'} border rounded-xl px-4 py-3 flex items-center justify-between`}>
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Proje\u00e7\u00e3o Anual</span>
                      <span className={`text-sm font-mono font-bold ${(annualTotals as any).balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency((annualTotals as any).balance || 0)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                    <div className="xl:col-span-2 bg-white/5 backdrop-blur-xl p-5 rounded-2xl border border-white/10 flex flex-col shadow-xl">
                      <h3 className="text-sm font-bold text-white/70 mb-4 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-indigo-400" />
                        Vis\u00e3o Anual ({currentYear})
                      </h3>
                      <div className="flex-1 w-full min-h-[260px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={yearData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} />
                            <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickFormatter={(val) => `${val/1000}k`} tickLine={false} axisLine={false} />
                            <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#0f1115', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: '12px' }} />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                            <Bar dataKey="Receitas" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={32} />
                            <Bar dataKey="Despesas" fill="#f43f5e" radius={[3, 3, 0, 0]} maxBarSize={32} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="xl:col-span-1 bg-white/5 backdrop-blur-xl p-5 rounded-2xl border border-white/10 flex flex-col shadow-xl">
                      <h3 className="text-sm font-bold text-white/70 mb-4 flex items-center gap-2">
                        <PieChartIcon className="w-4 h-4 text-emerald-400" />
                        Maiores Gastos
                    </h3>
                    {pieChartData.length > 0 ? (
                      <div className="flex-1 w-full min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={pieChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" stroke="none">
                              {pieChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#0f1115', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '16px', color: '#fff' }} formatter={(val: number) => formatCurrency(val)} />
                            <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '11px', color: 'white' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-white/40">
                        <PieChartIcon className="w-12 h-12 mb-3 opacity-20" />
                        <p className="text-sm">Nenhum gasto registrado.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              ) : (
                <div className="space-y-4">
                  {/* Receitas - Inline strip */}
                  <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-1.5">
                        <TrendingUp className="w-3 h-3 text-emerald-400" /> Receitas
                      </span>
                      {editingIncome ? (
                        <button onClick={saveIncome} className="flex items-center gap-1 text-emerald-400 bg-emerald-500/20 hover:bg-emerald-500/30 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all">
                          <Check className="w-3 h-3" /> Salvar
                        </button>
                      ) : (
                        <button onClick={() => setEditingIncome(true)} className="flex items-center gap-1 text-white/30 hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all">
                          <Edit2 className="w-3 h-3" /> Editar
                        </button>
                      )}
                    </div>
                    <div className="px-4 py-2.5 flex flex-wrap gap-2">
                      {[
                        { label: "Pagamento", field: "pagamento", color: "emerald" },
                        { label: "Adiantamento", field: "vale", color: "indigo" },
                        { label: "F\u00e9rias", field: "ferias", color: "emerald" },
                        ...(currentMonthIndex === 10 || currentMonthIndex === 11 ? [{ label: "13\u00ba Sal\u00e1rio", field: "decimoTerceiro", color: "emerald" }] : []),
                      ].map((inputMap) => (
                        <div key={inputMap.field} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all text-xs ${editingIncome ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/5 bg-black/20'}`}>
                          <span className={`text-[9px] font-bold uppercase tracking-wider ${inputMap.color === 'indigo' ? 'text-indigo-400' : 'text-emerald-400'}`}>{inputMap.label}</span>
                          <span className="text-white/20">R$</span>
                          <input
                            type="number"
                            className="bg-transparent text-xs text-white font-mono font-bold outline-none w-20 placeholder-white/10"
                            value={income[inputMap.field as keyof typeof income] || ''}
                            onChange={(e) => updateIncomeLocal(inputMap.field, Number(e.target.value))}
                            readOnly={!editingIncome}
                            onWheel={(e) => (e.target as HTMLElement).blur()}
                            placeholder="0"
                          />
                          {!editingIncome && <Lock className="w-2.5 h-2.5 text-white/15" />}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 3 Colunas: Pagamento | Adiantamento | Cartões */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                    {/* Contas Pagamento */}
                    <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-xl flex flex-col">
                      <div className="px-4 py-3 border-b border-white/5 flex justify-between items-center bg-emerald-500/5">
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                          <TrendingDown className="w-3.5 h-3.5" /> Pagamento
                        </span>
                        <button onClick={() => addItem('expense_pagamento')} className="p-1 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="divide-y divide-white/5 flex-1">
                        {items.filter(i => i.type === 'expense_pagamento').map(item => {
                          const isEdit = editingItems[item.id];
                          return (
                            <div key={item.id} className={`flex items-center gap-2 px-3 py-2.5 transition-all group ${isEdit ? 'bg-emerald-500/5' : 'hover:bg-white/3'}`}>
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => updateItemLocal(item.id, 'name', e.target.value)}
                                readOnly={!isEdit}
                                className="flex-1 bg-transparent text-xs font-medium text-white/80 outline-none min-w-0"
                                placeholder="Descrição"
                              />
                              <span className="text-white/30 text-[10px]">R$</span>
                              <input
                                type="number"
                                value={item.pagamento || ''}
                                onChange={(e) => updateItemLocal(item.id, 'pagamento', e.target.value)}
                                readOnly={!isEdit}
                                className="w-16 bg-transparent text-xs font-mono text-emerald-400 text-right outline-none"
                                placeholder="0"
                              />
                              <div className="flex gap-0.5 shrink-0">
                                {isEdit ? (
                                  <button onClick={() => saveItem(item)} className="p-1 bg-emerald-500/20 text-emerald-400 rounded">
                                    <Check className="w-3 h-3" />
                                  </button>
                                ) : (
                                  <button onClick={() => setEditingItems(p => ({...p, [item.id]: true}))} className="p-1 text-white/20 hover:text-white opacity-0 group-hover:opacity-100 rounded transition-all">
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                )}
                                <button onClick={() => removeItem(item.id)} className="p-1 text-white/20 hover:text-rose-400 opacity-0 group-hover:opacity-100 rounded transition-all">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        {items.filter(i => i.type === 'expense_pagamento').length === 0 && (
                          <div className="px-3 py-4 text-center text-white/20 text-xs">Nenhuma conta</div>
                        )}
                      </div>
                      <div className="px-4 py-2.5 border-t border-white/5 bg-black/20 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">Total</span>
                        <span className="text-sm font-mono font-bold text-emerald-400">{formatCurrency(items.filter(i => i.type === 'expense_pagamento').reduce((a, c) => a + (Number(c.pagamento)||0), 0))}</span>
                      </div>
                    </div>

                    {/* Contas Adiantamento */}
                    <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-xl flex flex-col">
                      <div className="px-4 py-3 border-b border-white/5 flex justify-between items-center bg-indigo-500/5">
                        <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                          <TrendingDown className="w-3.5 h-3.5" /> Adiantamento
                        </span>
                        <button onClick={() => addItem('expense_vale')} className="p-1 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="divide-y divide-white/5 flex-1">
                        {items.filter(i => i.type === 'expense_vale').map(item => {
                          const isEdit = editingItems[item.id];
                          return (
                            <div key={item.id} className={`flex items-center gap-2 px-3 py-2.5 transition-all group ${isEdit ? 'bg-indigo-500/5' : 'hover:bg-white/3'}`}>
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => updateItemLocal(item.id, 'name', e.target.value)}
                                readOnly={!isEdit}
                                className="flex-1 bg-transparent text-xs font-medium text-white/80 outline-none min-w-0"
                                placeholder="Descrição"
                              />
                              <span className="text-white/30 text-[10px]">R$</span>
                              <input
                                type="number"
                                value={item.vale || ''}
                                onChange={(e) => updateItemLocal(item.id, 'vale', e.target.value)}
                                readOnly={!isEdit}
                                className="w-16 bg-transparent text-xs font-mono text-indigo-400 text-right outline-none"
                                placeholder="0"
                              />
                              <div className="flex gap-0.5 shrink-0">
                                {isEdit ? (
                                  <button onClick={() => saveItem(item)} className="p-1 bg-indigo-500/20 text-indigo-400 rounded">
                                    <Check className="w-3 h-3" />
                                  </button>
                                ) : (
                                  <button onClick={() => setEditingItems(p => ({...p, [item.id]: true}))} className="p-1 text-white/20 hover:text-white opacity-0 group-hover:opacity-100 rounded transition-all">
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                )}
                                <button onClick={() => removeItem(item.id)} className="p-1 text-white/20 hover:text-rose-400 opacity-0 group-hover:opacity-100 rounded transition-all">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        {items.filter(i => i.type === 'expense_vale').length === 0 && (
                          <div className="px-3 py-4 text-center text-white/20 text-xs">Nenhuma conta</div>
                        )}
                      </div>
                      <div className="px-4 py-2.5 border-t border-white/5 bg-black/20 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">Total</span>
                        <span className="text-sm font-mono font-bold text-indigo-400">{formatCurrency(items.filter(i => i.type === 'expense_vale').reduce((a, c) => a + (Number(c.vale)||0), 0))}</span>
                      </div>
                    </div>

                    {/* Cart\u00f5es */}
                    <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-xl flex flex-col">
                      <div className="px-4 py-3 border-b border-white/5 flex justify-between items-center bg-white/3">
                        <span className="text-xs font-bold text-white/60 flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5" /> Cart\u00f5es
                        </span>
                        <button onClick={() => addItem('card_pagamento')} className="p-1 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex-1">
                        {items.filter(i => i.type.startsWith('card_')).map(item => {
                          const isEdit = editingItems[item.id];
                          const isPagamento = item.type === 'card_pagamento';
                          const amountField = isPagamento ? 'pagamento' : 'vale';
                          const isExpanded = expandedCards[item.id];
                          const expenses = cardExpenses[item.id] || [];
                          const hasExpenses = expenses.length > 0;
                          const baseVal = Number(item[amountField] || 0);
                          const expsSum = expenses.reduce((s, e) => s + Number(e.value || 0), 0);
                          const displayTotal = baseVal + expsSum;
                          return (
                            <div key={item.id} className="border-b border-white/5 last:border-0">
                              {/* Cart\u00e3o header row */}
                              <div className={`flex items-center gap-2 px-3 py-2.5 transition-all group ${isEdit ? 'bg-white/5' : 'hover:bg-white/3'}`}>
                                {/* Expand button */}
                                <button
                                  onClick={() => toggleExpandCard(item.id)}
                                  className={`p-0.5 rounded transition-all shrink-0 ${isExpanded ? 'text-white/60' : 'text-white/20 hover:text-white/60'}`}
                                  title="Ver despesas do cart\u00e3o"
                                >
                                  <ChevronRight className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                                </button>
                                <input
                                  type="text"
                                  value={item.name}
                                  onChange={(e) => updateItemLocal(item.id, 'name', e.target.value)}
                                  readOnly={!isEdit}
                                  className="flex-1 bg-transparent text-xs font-medium text-white/80 outline-none min-w-0"
                                  placeholder="Nome do cart\u00e3o"
                                />
                                <select
                                  value={isPagamento ? 'pagamento' : 'vale'}
                                  onChange={(e) => updateCardSource(item, e.target.value as 'pagamento' | 'vale')}
                                  disabled={!isEdit}
                                  className={`text-[10px] font-bold outline-none appearance-none cursor-pointer rounded px-1.5 py-0.5 border transition-all ${
                                    isPagamento
                                      ? 'bg-emerald-500/15 border-emerald-500/20 text-emerald-400'
                                      : 'bg-indigo-500/15 border-indigo-500/20 text-indigo-400'
                                  } ${!isEdit ? 'pointer-events-none' : ''}`}
                                >
                                  <option value="pagamento" className="bg-[#0f1115] text-emerald-400">Pgto</option>
                                  <option value="vale" className="bg-[#0f1115] text-indigo-400">Adto</option>
                                </select>
                                <span className="text-white/30 text-[10px]">R$</span>
                                {/* Total = base + despesas individuais */}
                                {hasExpenses ? (
                                  <span className={`w-20 text-xs font-mono font-bold text-right ${isPagamento ? 'text-emerald-400' : 'text-indigo-400'}`}>
                                    {formatCurrency(displayTotal).replace('R$\u00a0', '')}
                                  </span>
                                ) : (
                                  <input
                                    type="number"
                                    value={item[amountField] || ''}
                                    onChange={(e) => updateItemLocal(item.id, amountField, e.target.value)}
                                    readOnly={!isEdit}
                                    className={`w-16 bg-transparent text-xs font-mono text-right outline-none ${isPagamento ? 'text-emerald-400' : 'text-indigo-400'}`}
                                    placeholder="0"
                                  />
                                )}
                                <div className="flex gap-0.5 shrink-0">
                                  {isEdit ? (
                                    <button onClick={() => saveItem(item)} className="p-1 bg-emerald-500/20 text-emerald-400 rounded">
                                      <Check className="w-3 h-3" />
                                    </button>
                                  ) : (
                                    <button onClick={() => setEditingItems(p => ({...p, [item.id]: true}))} className="p-1 text-white/20 hover:text-white opacity-0 group-hover:opacity-100 rounded transition-all">
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                  )}
                                  <button onClick={() => removeItem(item.id)} className="p-1 text-white/20 hover:text-rose-400 opacity-0 group-hover:opacity-100 rounded transition-all">
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                              {/* Expandido: lista de despesas individuais */}
                              {isExpanded && (
                                <div className="bg-black/30 border-t border-white/5">
                                  <div className="divide-y divide-white/5">
                                    {expenses.map(exp => {
                                      const isExpEdit = editingCardExpenses[exp.id];
                                      return (
                                        <div key={exp.id} className={`flex items-center gap-2 pl-8 pr-3 py-2 group transition-all ${isExpEdit ? 'bg-white/5' : 'hover:bg-white/3'}`}>
                                          <span className="text-white/15 text-[10px] shrink-0">└</span>
                                          <input
                                            type="text"
                                            value={exp.name}
                                            onChange={(e) => updateCardExpenseLocal(item.id, exp.id, 'name', e.target.value)}
                                            readOnly={!isExpEdit}
                                            className="flex-1 bg-transparent text-[11px] text-white/70 outline-none min-w-0"
                                            placeholder="Descri\u00e7\u00e3o da compra"
                                          />
                                          <span className="text-white/20 text-[10px]">R$</span>
                                          <input
                                            type="number"
                                            value={exp.value || ''}
                                            onChange={(e) => updateCardExpenseLocal(item.id, exp.id, 'value', e.target.value)}
                                            readOnly={!isExpEdit}
                                            className={`w-16 bg-transparent text-[11px] font-mono text-right outline-none ${isPagamento ? 'text-emerald-300' : 'text-indigo-300'}`}
                                            placeholder="0"
                                          />
                                          <div className="flex gap-0.5 shrink-0">
                                            {isExpEdit ? (
                                              <button onClick={() => saveCardExpense(item, exp)} className="p-1 bg-emerald-500/20 text-emerald-400 rounded">
                                                <Check className="w-2.5 h-2.5" />
                                              </button>
                                            ) : (
                                              <button onClick={() => setEditingCardExpenses(p => ({...p, [exp.id]: true}))} className="p-1 text-white/20 hover:text-white opacity-0 group-hover:opacity-100 rounded transition-all">
                                                <Edit2 className="w-2.5 h-2.5" />
                                              </button>
                                            )}
                                            <button onClick={() => removeCardExpense(item, exp.id)} className="p-1 text-white/20 hover:text-rose-400 opacity-0 group-hover:opacity-100 rounded transition-all">
                                              <Trash2 className="w-2.5 h-2.5" />
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  {/* Linha de adicionar despesa + total */}
                                  <div className="flex items-center justify-between px-4 py-2 border-t border-white/5">
                                    <button
                                      onClick={() => addCardExpense(item)}
                                      className="flex items-center gap-1 text-[11px] text-white/40 hover:text-white/70 transition-colors"
                                    >
                                      <Plus className="w-3 h-3" /> Adicionar compra
                                    </button>
                                    {hasExpenses && (
                                      <span className={`text-xs font-mono font-bold ${isPagamento ? 'text-emerald-400' : 'text-indigo-400'}`}>
                                        = {formatCurrency(autoTotal)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {items.filter(i => i.type.startsWith('card_')).length === 0 && (
                          <div className="px-3 py-4 text-center text-white/20 text-xs">Nenhum cart\u00e3o</div>
                        )}
                      </div>
                      <div className="px-4 py-2.5 border-t border-white/5 bg-black/20 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">Total</span>
                        <span className="text-sm font-mono font-bold text-white/70">{formatCurrency(items.filter(i => i.type.startsWith('card_')).reduce((a, c) => a + (Number(c.pagamento)||0) + (Number(c.vale)||0), 0))}</span>
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
