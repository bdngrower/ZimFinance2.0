import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, DollarSign, Wallet, TrendingDown, TrendingUp, Calendar, CreditCard, Loader2, ChevronLeft, ChevronRight, LogOut, Edit2, Check, Lock, LayoutDashboard, Receipt } from 'lucide-react';
import { supabase } from './lib/supabaseClient';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

type ItemRecord = { id: string, name: string, pagamento: number, vale: number, type: string };

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
  
  const [activeTab, setActiveTab] = useState<'resumo' | 'pagamento' | 'vale'>('resumo');

  // Data for the currently selected month
  const [income, setIncome] = useState({ pagamento: 0, vale: 0, ferias: 0, decimoTerceiro: 0 });
  const [items, setItems] = useState<ItemRecord[]>([]);

  // Editing state for locking/unlocking inputs
  const [editingItems, setEditingItems] = useState<{ [key: string]: boolean }>({});
  const [editingIncome, setEditingIncome] = useState(false);

  // Data for the whole year (for charts)
  const [yearData, setYearData] = useState<any[]>([]);

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
    if (session) {
      fetchData();
      fetchYearData();
    }
  }, [currentMonthId, session]);

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

    const chartData = MONTH_NAMES.map((name, idx) => {
      const mId = `${currentYear}-${String(idx + 1).padStart(2, '0')}`;
      const monthDb = months.find(m => m.id === mId);
      const mItems = allItems?.filter(i => i.month_id === mId) || [];
      
      const rec = monthDb ? (Number(monthDb.income_pagamento||0) + Number(monthDb.income_vale||0) + Number(monthDb.income_ferias||0) + Number(monthDb.income_decimo_terceiro||0)) : 0;
      const desp = mItems.reduce((acc, curr) => acc + (Number(curr.pagamento)||0) + (Number(curr.vale)||0), 0);
      
      return {
        name: name.substring(0, 3),
        Receitas: rec,
        Despesas: desp,
        Saldo: rec - desp
      };
    });

    setYearData(chartData);
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
    } else {
      setItems([]);
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
      vale: item.vale
    }).eq('id', item.id);
    setEditingItems(prev => ({ ...prev, [item.id]: false }));
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
    await supabase.from('items').delete().eq('id', id);
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
    const cardsPagamento = items.filter(i => i.type === 'card_pagamento').reduce((a, c) => a + (Number(c.pagamento)||0), 0);
    const cardsVale = items.filter(i => i.type === 'card_vale').reduce((a, c) => a + (Number(c.vale)||0), 0);

    const totalPagamentoIncome = (Number(income.pagamento)||0) + (Number(income.ferias)||0) + (Number(income.decimoTerceiro)||0);
    const totalValeIncome = (Number(income.vale)||0);

    const totalIncome = totalPagamentoIncome + totalValeIncome;
    
    const totalDespesasPagamento = expensesPagamento + cardsPagamento;
    const totalDespesasVale = expensesVale + cardsVale;
    const totalExpenses = totalDespesasPagamento + totalDespesasVale;
    
    const remainingPagamento = totalPagamentoIncome - totalDespesasPagamento;
    const remainingVale = totalValeIncome - totalDespesasVale;
    const totalRemaining = totalIncome - totalExpenses;

    return { totalDespesasPagamento, totalDespesasVale, totalIncome, totalExpenses, remainingPagamento, remainingVale, totalRemaining, totalPagamentoIncome, totalValeIncome };
  }, [income, items]);

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

  const ItemList = ({ title, icon: Icon, type, data, colorClass, source }: any) => {
    const valueField = source === 'pagamento' ? 'pagamento' : 'vale';
    
    return (
      <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
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
          {data.map((item: any) => {
            const isEdit = editingItems[item.id];
            return (
              <div key={item.id} className={`flex flex-col sm:flex-row gap-4 items-start sm:items-center p-4 rounded-2xl border transition-all ${isEdit ? 'bg-white/10 border-emerald-500/50 shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]' : 'bg-black/20 border-white/5 hover:bg-white/5'} group`}>
                <div className="w-full sm:flex-1">
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2 sm:hidden">Descrição</label>
                  <input 
                    type="text" 
                    value={item.name}
                    onChange={(e) => updateItemLocal(item.id, 'name', e.target.value)}
                    readOnly={!isEdit}
                    className={`w-full bg-transparent border-none focus:ring-0 p-1 text-base font-semibold text-white placeholder-white/20 outline-none ${!isEdit && 'opacity-80'}`}
                    placeholder="Nome da Conta"
                  />
                </div>
                
                <div className="flex w-full sm:w-auto gap-4 items-end sm:items-center">
                  <div className={`flex-1 sm:w-48 rounded-xl p-1 px-3 border transition-colors ${isEdit ? 'bg-black/40 border-emerald-500/30' : 'bg-transparent border-transparent'}`}>
                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1 mt-1">Valor</label>
                    <div className="relative flex items-center pb-1">
                      <span className="text-white/40 text-sm font-medium mr-1">R$</span>
                      <input 
                        type="number" 
                        value={item[valueField] || ''}
                        onWheel={(e) => (e.target as HTMLElement).blur()}
                        onChange={(e) => updateItemLocal(item.id, valueField, e.target.value)}
                        readOnly={!isEdit}
                        className={`w-full bg-transparent border-none focus:ring-0 p-0 text-sm font-mono text-white text-right outline-none ${!isEdit && 'opacity-80'}`}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {isEdit ? (
                      <button onClick={() => saveItem(item)} className="p-2.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/40 rounded-xl transition-all" title="Salvar"><Check className="w-4 h-4" /></button>
                    ) : (
                      <button onClick={() => setEditingItems(p => ({...p, [item.id]: true}))} className="p-2.5 text-white/30 hover:text-white hover:bg-white/10 rounded-xl transition-all sm:opacity-0 group-hover:opacity-100" title="Editar"><Edit2 className="w-4 h-4" /></button>
                    )}
                    <button onClick={() => removeItem(item.id)} className="p-2.5 text-white/30 hover:text-rose-400 hover:bg-rose-400/10 rounded-xl transition-all sm:opacity-0 group-hover:opacity-100" title="Remover"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            );
          })}

          {data.length > 0 && (
            <div className="mt-6 pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between sm:items-center">
              <span className="uppercase text-xs font-bold tracking-widest text-white/40 mb-3 sm:mb-0">
                Subtotal
              </span>
              <div className="flex bg-black/20 py-2 px-6 rounded-2xl border border-white/5">
                <div className="flex flex-col items-end">
                  <span className="text-[9px] uppercase tracking-widest text-white/40">Total</span>
                  <span className="text-white font-bold font-mono text-sm">{formatCurrency(data.reduce((a:any,c:any)=>a+Number(c[valueField]||0),0))}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0f1115] text-white font-sans pb-40 selection:bg-emerald-500/30 relative overflow-hidden">
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-600/20 blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/20 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-white/10 bg-[#0f1115]/80 backdrop-blur-2xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 p-2.5 rounded-2xl shadow-lg shadow-emerald-500/20">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 hidden sm:block">
              ZimFinance
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center text-sm text-white/50 mr-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></div>
              {session.user.email}
            </div>
            <button onClick={handleLogout} className="flex items-center p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-white/70 transition-colors border border-white/10">
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline text-sm font-semibold">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Top Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 relative z-10">
        <div className="flex space-x-2 p-1 bg-black/40 border border-white/10 rounded-2xl w-fit">
          <button 
            onClick={() => setActiveTab('resumo')}
            className={`flex items-center px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'resumo' ? 'bg-white/10 text-white shadow-lg' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
          >
            <LayoutDashboard className="w-4 h-4 mr-2" />
            Resumo Financeiro
          </button>
          <button 
            onClick={() => setActiveTab('pagamento')}
            className={`flex items-center px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'pagamento' ? 'bg-emerald-500/20 text-emerald-400 shadow-lg' : 'text-white/50 hover:text-emerald-400 hover:bg-white/5'}`}
          >
            <Receipt className="w-4 h-4 mr-2" />
            Pagamento
          </button>
          <button 
            onClick={() => setActiveTab('vale')}
            className={`flex items-center px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'vale' ? 'bg-indigo-500/20 text-indigo-400 shadow-lg' : 'text-white/50 hover:text-indigo-400 hover:bg-white/5'}`}
          >
            <Receipt className="w-4 h-4 mr-2" />
            Vale
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-[50vh]">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mb-4" />
          <p className="text-white/50 font-medium animate-pulse">Carregando dados...</p>
        </div>
      ) : (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-8 relative z-10">
          
          {/* Dashboard Header / Selection Info */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/5 p-6 rounded-3xl border border-white/10 backdrop-blur-xl">
            <div>
              <h2 className="text-2xl font-bold text-white">
                {activeTab === 'resumo' && 'Dashboard Geral'}
                {activeTab === 'pagamento' && 'Lançamentos: Pagamento'}
                {activeTab === 'vale' && 'Lançamentos: Vale'}
              </h2>
              <p className="text-white/50 mt-1 flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                {MONTH_NAMES[currentMonthIndex]} de {currentYear}
              </p>
            </div>
            <div className="flex items-center bg-black/40 p-1.5 rounded-2xl border border-white/5">
              <button onClick={() => setCurrentYear(y => y - 1)} className="p-2.5 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-colors"><ChevronLeft className="w-5 h-5"/></button>
              <span className="w-20 text-center font-bold text-emerald-400 font-mono text-lg">{currentYear}</span>
              <button onClick={() => setCurrentYear(y => y + 1)} className="p-2.5 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-colors"><ChevronRight className="w-5 h-5"/></button>
            </div>
          </div>

          {activeTab === 'resumo' && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Quick Stats */}
              <div className="xl:col-span-1 space-y-6">
                <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 relative overflow-hidden group hover:bg-white/10 transition-all duration-500">
                  <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="bg-emerald-500/20 p-2.5 rounded-xl border border-emerald-500/30">
                      <TrendingUp className="w-5 h-5 text-emerald-400" />
                    </div>
                    <h3 className="text-white/60 font-bold text-xs uppercase tracking-widest">Receitas do Mês</h3>
                  </div>
                  <p className="text-3xl font-extrabold text-white font-mono tracking-tight">{formatCurrency(totals.totalIncome)}</p>
                  <div className="mt-4 flex gap-4 text-xs font-bold text-white/40 uppercase tracking-widest">
                    <span>Pag: <span className="text-emerald-400">{formatCurrency(totals.totalPagamentoIncome)}</span></span>
                    <span>Vale: <span className="text-indigo-400">{formatCurrency(totals.totalValeIncome)}</span></span>
                  </div>
                </div>

                <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 relative overflow-hidden group hover:bg-white/10 transition-all duration-500">
                  <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="bg-rose-500/20 p-2.5 rounded-xl border border-rose-500/30">
                      <TrendingDown className="w-5 h-5 text-rose-400" />
                    </div>
                    <h3 className="text-white/60 font-bold text-xs uppercase tracking-widest">Gastos do Mês</h3>
                  </div>
                  <p className="text-3xl font-extrabold text-white font-mono tracking-tight">{formatCurrency(totals.totalExpenses)}</p>
                  <div className="mt-4 flex gap-4 text-xs font-bold text-white/40 uppercase tracking-widest">
                    <span>Pag: <span className="text-rose-400">{formatCurrency(totals.totalDespesasPagamento)}</span></span>
                    <span>Vale: <span className="text-rose-400">{formatCurrency(totals.totalDespesasVale)}</span></span>
                  </div>
                </div>

                <div className={`p-6 rounded-3xl border relative overflow-hidden transition-all duration-500 ${totals.totalRemaining >= 0 ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_30px_-5px_rgba(16,185,129,0.15)]' : 'bg-rose-500/10 border-rose-500/30 shadow-[0_0_30px_-5px_rgba(244,63,94,0.15)]'}`}>
                  <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className={`p-2.5 rounded-xl border ${totals.totalRemaining >= 0 ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-rose-500/20 border-rose-500/30'}`}>
                      <DollarSign className={`w-5 h-5 ${totals.totalRemaining >= 0 ? 'text-emerald-400' : 'text-rose-400'}`} />
                    </div>
                    <h3 className="text-white/80 font-bold text-xs uppercase tracking-widest">Saldo Final</h3>
                  </div>
                  <p className={`text-4xl font-extrabold font-mono tracking-tight ${totals.totalRemaining >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatCurrency(totals.totalRemaining)}
                  </p>
                  <div className="mt-4 flex gap-4 text-xs font-bold text-white/50 uppercase tracking-widest">
                    <span>Sobra Pag: <span className={totals.remainingPagamento >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{formatCurrency(totals.remainingPagamento)}</span></span>
                    <span>Sobra Vale: <span className={totals.remainingVale >= 0 ? 'text-indigo-400' : 'text-rose-400'}>{formatCurrency(totals.remainingVale)}</span></span>
                  </div>
                </div>
              </div>

              {/* Annual Chart */}
              <div className="xl:col-span-2 bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-2xl flex flex-col">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-3 text-indigo-400" />
                  Visão Geral do Ano ({currentYear})
                </h3>
                <div className="flex-1 w-full min-h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={yearData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} tickFormatter={(val) => `R$${val/1000}k`} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#0f1115', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '16px', color: '#fff' }} itemStyle={{ fontWeight: 'bold' }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      <Bar dataKey="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      <Bar dataKey="Despesas" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeTab !== 'resumo' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="lg:col-span-8 order-2 lg:order-1 space-y-8">
                <ItemList 
                  title={`Contas Fixas e Variáveis (${activeTab === 'pagamento' ? 'Pagamento' : 'Vale'})`}
                  icon={TrendingDown}
                  type={`expense_${activeTab}`}
                  source={activeTab}
                  data={items.filter(i => i.type === `expense_${activeTab}`)}
                  colorClass="text-rose-400"
                />

                <ItemList 
                  title={`Faturas de Cartões (${activeTab === 'pagamento' ? 'Pagamento' : 'Vale'})`}
                  icon={CreditCard}
                  type={`card_${activeTab}`}
                  source={activeTab}
                  data={items.filter(i => i.type === `card_${activeTab}`)}
                  colorClass="text-indigo-400"
                />
              </div>

              <div className="lg:col-span-4 order-1 lg:order-2">
                <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 lg:sticky lg:top-28 shadow-2xl overflow-hidden transition-all">
                  <div className="p-6 border-b border-white/5 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-white flex items-center">
                      <div className="bg-emerald-500/20 p-2 rounded-xl mr-3 border border-emerald-500/30">
                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                      </div>
                      Receitas: {activeTab === 'pagamento' ? 'Pagamento' : 'Vale'}
                    </h2>
                    {editingIncome ? (
                      <button onClick={saveIncome} className="flex items-center space-x-2 text-emerald-400 bg-emerald-500/20 hover:bg-emerald-500/30 px-4 py-2 rounded-xl text-sm font-semibold transition-all">
                        <Check className="w-4 h-4" /><span>Salvar</span>
                      </button>
                    ) : (
                      <button onClick={() => setEditingIncome(true)} className="flex items-center space-x-2 text-white/50 bg-white/5 hover:text-white hover:bg-white/10 px-4 py-2 rounded-xl text-sm font-semibold transition-all">
                        <Edit2 className="w-4 h-4" /><span>Editar</span>
                      </button>
                    )}
                  </div>
                  
                  <div className="p-6 space-y-5">
                    {activeTab === 'pagamento' && [
                      { label: "Pagamento Base", field: "pagamento", show: true },
                      { label: "Férias", field: "ferias", show: true },
                      { label: "13º Salário", field: "decimoTerceiro", show: currentMonthIndex === 10 || currentMonthIndex === 11 }, // Only Nov/Dec
                    ].filter(i => i.show).map((inputMap) => (
                      <div key={inputMap.field} className={`bg-black/20 p-4 rounded-2xl border transition-colors ${editingIncome ? 'border-white/10 focus-within:border-emerald-500/50' : 'border-transparent'}`}>
                        <label className="flex items-center justify-between text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">
                          {inputMap.label}
                          {!editingIncome && <Lock className="w-3 h-3 text-white/20" />}
                        </label>
                        <div className="relative flex items-center">
                          <span className="text-white/40 font-medium mr-2">R$</span>
                          <input 
                            type="number" 
                            className={`w-full bg-transparent border-none focus:ring-0 p-0 text-xl text-white font-mono font-semibold outline-none placeholder-white/10 ${!editingIncome && 'opacity-80 cursor-default'}`}
                            value={income[inputMap.field as keyof typeof income] || ''}
                            onChange={(e) => updateIncomeLocal(inputMap.field, Number(e.target.value))}
                            readOnly={!editingIncome}
                            onWheel={(e) => (e.target as HTMLElement).blur()}
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    ))}

                    {activeTab === 'vale' && (
                      <div className={`bg-black/20 p-4 rounded-2xl border transition-colors ${editingIncome ? 'border-white/10 focus-within:border-emerald-500/50' : 'border-transparent'}`}>
                        <label className="flex items-center justify-between text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">
                          Vale Alimentação/Refeição
                          {!editingIncome && <Lock className="w-3 h-3 text-white/20" />}
                        </label>
                        <div className="relative flex items-center">
                          <span className="text-white/40 font-medium mr-2">R$</span>
                          <input 
                            type="number" 
                            className={`w-full bg-transparent border-none focus:ring-0 p-0 text-xl text-white font-mono font-semibold outline-none placeholder-white/10 ${!editingIncome && 'opacity-80 cursor-default'}`}
                            value={income.vale || ''}
                            onChange={(e) => updateIncomeLocal('vale', Number(e.target.value))}
                            readOnly={!editingIncome}
                            onWheel={(e) => (e.target as HTMLElement).blur()}
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      )}

      {/* Improved Bottom Navigation for Months */}
      {session && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#0f1115]/90 backdrop-blur-3xl border-t border-white/10 z-50 pb-safe shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.5)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              {MONTH_NAMES.map((m, i) => {
                const isSelected = currentMonthIndex === i;
                const isCurrentCalendarMonth = realCurrentMonth === i && realCurrentYear === currentYear;
                return (
                  <button
                    key={m}
                    onClick={() => setCurrentMonthIndex(i)}
                    className={`px-4 py-2 sm:px-5 sm:py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-300 flex-1 sm:flex-none min-w-[70px] sm:min-w-0 ${
                      isSelected 
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25 scale-105' 
                        : isCurrentCalendarMonth
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30'
                        : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-transparent'
                    }`}
                  >
                    {m.substring(0,3)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
