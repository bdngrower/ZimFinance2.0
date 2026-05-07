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

  const [yearData, setYearData] = useState<any[]>([]);
  const [annualTotals, setAnnualTotals] = useState({ income: 0, expense: 0 });

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
    setAnnualTotals({ income: totalInc, expense: totalExp });
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
    
    const totalRemaining = totalIncome - totalExpenses;

    return { totalDespesasPagamento, totalDespesasVale, totalIncome, totalExpenses, totalRemaining, totalPagamentoIncome, totalValeIncome };
  }, [income, items]);

  const pieChartData = useMemo(() => {
    const expenses = items.filter(i => i.type.startsWith('expense_') || i.type.startsWith('card_'));
    
    // Agrupar gastos com o mesmo nome (ex: "CARRO RENATO" no pagamento e no vale)
    const grouped = expenses.reduce((acc, curr) => {
      const name = curr.name?.trim() || 'Sem nome';
      const totalVal = (Number(curr.pagamento)||0) + (Number(curr.vale)||0);
      if (totalVal > 0) {
        acc[name] = (acc[name] || 0) + totalVal;
      }
      return acc;
    }, {} as Record<string, number>);

    const sorted = Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Pegar os 7 maiores, o resto agrupa em "Outros"
    const topN = sorted.slice(0, 7);
    const others = sorted.slice(7);

    const data = [...topN];

    if (others.length > 0) {
      const othersTotal = others.reduce((acc, curr) => acc + curr.value, 0);
      if (othersTotal > 0) {
        data.push({ name: 'Outros', value: othersTotal });
      }
    }

    return data;
  }, [items]);

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

        {/* Top Header - Month Selector */}
        <header className="h-24 px-8 border-b border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white/5 backdrop-blur-xl z-40">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {activeView === 'dashboard' ? 'Dashboard Financeiro' : 'Controle de Lançamentos'}
            </h2>
            <p className="text-white/50 text-sm mt-1">Gerencie seu patrimônio e despesas</p>
          </div>
          
          <div className="flex items-center gap-2 mt-4 sm:mt-0 bg-black/40 p-2 rounded-2xl border border-white/10">
            <button onClick={() => setCurrentYear(y => y - 1)} className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-colors"><ChevronLeft className="w-4 h-4"/></button>
            <span className="w-12 text-center font-bold text-emerald-400 font-mono text-sm">{currentYear}</span>
            <button onClick={() => setCurrentYear(y => y + 1)} className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-colors"><ChevronRight className="w-4 h-4"/></button>
            
            <div className="w-[1px] h-6 bg-white/10 mx-1"></div>
            
            <button onClick={() => {
              if (currentMonthIndex === 0) { setCurrentMonthIndex(11); setCurrentYear(y => y - 1); }
              else { setCurrentMonthIndex(m => m - 1); }
            }} className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-colors"><ChevronLeft className="w-4 h-4"/></button>
            <span className="w-24 text-center font-bold text-white text-sm">{MONTH_NAMES[currentMonthIndex]}</span>
            <button onClick={() => {
              if (currentMonthIndex === 11) { setCurrentMonthIndex(0); setCurrentYear(y => y + 1); }
              else { setCurrentMonthIndex(m => m + 1); }
            }} className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-colors"><ChevronRight className="w-4 h-4"/></button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 relative z-10 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mb-4" />
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto">
              
              {/* Top Monthly Stats - Always Visible */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-2xl hover:-translate-y-1 hover:border-emerald-500/30 transition-all duration-300 group">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-white/60 font-bold text-xs uppercase tracking-widest group-hover:text-white/80 transition-colors">Receitas do Mês</h3>
                    <TrendingUp className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <p className="text-3xl font-extrabold text-white font-mono tracking-tight">{formatCurrency(totals.totalIncome)}</p>
                </div>
                <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-2xl hover:-translate-y-1 hover:border-rose-500/30 transition-all duration-300 group">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-white/60 font-bold text-xs uppercase tracking-widest group-hover:text-white/80 transition-colors">Gastos do Mês</h3>
                    <TrendingDown className="w-5 h-5 text-rose-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <p className="text-3xl font-extrabold text-white font-mono tracking-tight">{formatCurrency(totals.totalExpenses)}</p>
                </div>
                <div className={`p-6 rounded-3xl border shadow-2xl transition-all duration-300 hover:-translate-y-1 group ${totals.totalRemaining >= 0 ? 'bg-emerald-500/10 border-emerald-500/30 hover:shadow-emerald-500/20' : 'bg-rose-500/10 border-rose-500/30 hover:shadow-rose-500/20'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-white/80 font-bold text-xs uppercase tracking-widest group-hover:text-white transition-colors">Saldo do Mês</h3>
                    <DollarSign className={`w-5 h-5 group-hover:scale-110 transition-transform ${totals.totalRemaining >= 0 ? 'text-emerald-400' : 'text-rose-400'}`} />
                  </div>
                  <p className={`text-3xl font-extrabold font-mono tracking-tight ${totals.totalRemaining >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatCurrency(totals.totalRemaining)}
                  </p>
                </div>
              </div>

              {activeView === 'dashboard' ? (
                /* Annual Stats & Charts */
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                  <div className="xl:col-span-2 bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 flex flex-col shadow-2xl">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-bold text-white flex items-center">
                        <TrendingUp className="w-5 h-5 mr-3 text-indigo-400" />
                        Visão Anual ({currentYear})
                      </h3>
                      <div className="flex gap-4 text-xs font-bold text-white/50 uppercase tracking-widest bg-black/20 px-4 py-2 rounded-xl">
                        <span>Total Receita: <span className="text-emerald-400">{formatCurrency(annualTotals.income)}</span></span>
                        <span>Total Gasto: <span className="text-rose-400">{formatCurrency(annualTotals.expense)}</span></span>
                      </div>
                    </div>
                    <div className="flex-1 w-full min-h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={yearData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                          <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} tickFormatter={(val) => `R$${val/1000}k`} tickLine={false} axisLine={false} />
                          <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#0f1115', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '16px', color: '#fff' }} />
                          <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                          <Bar dataKey="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                          <Bar dataKey="Despesas" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="xl:col-span-1 bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 flex flex-col shadow-2xl">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center">
                      <PieChartIcon className="w-5 h-5 mr-3 text-emerald-400" />
                      Maiores Gastos do Mês
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
              ) : (
                <div className="space-y-8">
                  {/* Receitas Master Card */}
                  <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
                    <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                      <h2 className="text-xl font-bold text-white flex items-center">
                        <div className="bg-emerald-500/20 p-2 rounded-xl mr-3 border border-emerald-500/30">
                          <TrendingUp className="w-5 h-5 text-emerald-400" />
                        </div>
                        Receitas do Mês
                      </h2>
                      {editingIncome ? (
                        <button onClick={saveIncome} className="flex items-center space-x-2 text-emerald-400 bg-emerald-500/20 hover:bg-emerald-500/30 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg">
                          <Check className="w-4 h-4" /><span>Salvar</span>
                        </button>
                      ) : (
                        <button onClick={() => setEditingIncome(true)} className="flex items-center space-x-2 text-white/50 bg-white/5 hover:text-white hover:bg-white/10 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all">
                          <Edit2 className="w-4 h-4" /><span>Editar Receitas</span>
                        </button>
                      )}
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {[
                        { label: "Pagamento Base", field: "pagamento", source: "pagamento", show: true },
                        { label: "Vale Alimentação", field: "vale", source: "vale", show: true },
                        { label: "Férias", field: "ferias", source: "pagamento", show: true },
                        { label: "13º Salário", field: "decimoTerceiro", source: "pagamento", show: currentMonthIndex === 10 || currentMonthIndex === 11 },
                      ].filter(i => i.show).map((inputMap) => (
                        <div key={inputMap.field} className={`bg-black/20 p-5 rounded-2xl border transition-all ${editingIncome ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/5 hover:border-white/10'}`}>
                          <label className="flex items-center justify-between text-[11px] font-bold text-white/40 uppercase tracking-widest mb-3">
                            <span className="flex items-center gap-2">
                              {inputMap.label}
                              <span className={`px-2 py-0.5 rounded-full text-[9px] ${inputMap.source === 'pagamento' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-500/20 text-indigo-400'}`}>{inputMap.source}</span>
                            </span>
                            {!editingIncome && <Lock className="w-3 h-3 text-white/20" />}
                          </label>
                          <div className="relative flex items-center">
                            <span className="text-white/40 font-bold mr-2 text-lg">R$</span>
                            <input 
                              type="number" 
                              className={`w-full bg-transparent border-none focus:ring-0 p-0 text-2xl text-white font-mono font-bold outline-none placeholder-white/10 ${!editingIncome && 'opacity-80 cursor-default'}`}
                              value={income[inputMap.field as keyof typeof income] || ''}
                              onChange={(e) => updateIncomeLocal(inputMap.field, Number(e.target.value))}
                              readOnly={!editingIncome}
                              onWheel={(e) => (e.target as HTMLElement).blur()}
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Side-by-side Contas */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    {/* Pagamento Contas */}
                    <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl flex flex-col h-full">
                      <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                        <h2 className="text-lg font-bold flex items-center text-white">
                          <div className="p-2 rounded-xl mr-3 bg-emerald-500/10 border border-emerald-500/20">
                            <TrendingDown className="w-5 h-5 text-emerald-400" />
                          </div>
                          Contas (Pagamento)
                        </h2>
                        <button onClick={() => addItem('expense_pagamento')} className="flex items-center text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-sm font-semibold transition-all">
                          <Plus className="w-4 h-4 mr-2" /> Adicionar
                        </button>
                      </div>
                      <div className="p-6 space-y-4 flex-1">
                        {items.filter(i => i.type === 'expense_pagamento').map(item => {
                          const isEdit = editingItems[item.id];
                          return (
                            <div key={item.id} className={`flex flex-col sm:flex-row gap-4 items-center p-4 rounded-2xl border transition-all ${isEdit ? 'bg-black/40 border-emerald-500/50' : 'bg-black/20 border-white/5'} group`}>
                              <input 
                                type="text" 
                                value={item.name}
                                onChange={(e) => updateItemLocal(item.id, 'name', e.target.value)}
                                readOnly={!isEdit}
                                className="flex-1 bg-transparent text-sm font-semibold text-white outline-none"
                                placeholder="Descrição"
                              />
                              <div className="flex items-center gap-3">
                                <div className="flex items-center">
                                  <span className="text-white/40 text-xs mr-1">R$</span>
                                  <input 
                                    type="number" 
                                    value={item.pagamento || ''}
                                    onChange={(e) => updateItemLocal(item.id, 'pagamento', e.target.value)}
                                    readOnly={!isEdit}
                                    className="w-24 bg-transparent text-sm font-mono text-white text-right outline-none"
                                    placeholder="0.00"
                                  />
                                </div>
                                <div className="flex gap-1">
                                  {isEdit ? (
                                    <button onClick={() => saveItem(item)} className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg"><Check className="w-4 h-4" /></button>
                                  ) : (
                                    <button onClick={() => setEditingItems(p => ({...p, [item.id]: true}))} className="p-2 text-white/30 hover:text-white opacity-0 group-hover:opacity-100"><Edit2 className="w-4 h-4" /></button>
                                  )}
                                  <button onClick={() => removeItem(item.id)} className="p-2 text-white/30 hover:text-rose-400 opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <div className="p-6 border-t border-white/5 bg-black/20 flex justify-between items-center">
                        <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Total Pagamento</span>
                        <span className="text-lg font-mono font-bold text-emerald-400">{formatCurrency(totals.totalDespesasPagamento - items.filter(i => i.type === 'card_pagamento').reduce((a, c) => a + (Number(c.pagamento)||0), 0))}</span>
                      </div>
                    </div>

                    {/* Vale Contas */}
                    <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl flex flex-col h-full">
                      <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                        <h2 className="text-lg font-bold flex items-center text-white">
                          <div className="p-2 rounded-xl mr-3 bg-indigo-500/10 border border-indigo-500/20">
                            <TrendingDown className="w-5 h-5 text-indigo-400" />
                          </div>
                          Contas (Vale)
                        </h2>
                        <button onClick={() => addItem('expense_vale')} className="flex items-center text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-sm font-semibold transition-all">
                          <Plus className="w-4 h-4 mr-2" /> Adicionar
                        </button>
                      </div>
                      <div className="p-6 space-y-4 flex-1">
                        {items.filter(i => i.type === 'expense_vale').map(item => {
                          const isEdit = editingItems[item.id];
                          return (
                            <div key={item.id} className={`flex flex-col sm:flex-row gap-4 items-center p-4 rounded-2xl border transition-all ${isEdit ? 'bg-black/40 border-indigo-500/50' : 'bg-black/20 border-white/5'} group`}>
                              <input 
                                type="text" 
                                value={item.name}
                                onChange={(e) => updateItemLocal(item.id, 'name', e.target.value)}
                                readOnly={!isEdit}
                                className="flex-1 bg-transparent text-sm font-semibold text-white outline-none"
                                placeholder="Descrição"
                              />
                              <div className="flex items-center gap-3">
                                <div className="flex items-center">
                                  <span className="text-white/40 text-xs mr-1">R$</span>
                                  <input 
                                    type="number" 
                                    value={item.vale || ''}
                                    onChange={(e) => updateItemLocal(item.id, 'vale', e.target.value)}
                                    readOnly={!isEdit}
                                    className="w-24 bg-transparent text-sm font-mono text-white text-right outline-none"
                                    placeholder="0.00"
                                  />
                                </div>
                                <div className="flex gap-1">
                                  {isEdit ? (
                                    <button onClick={() => saveItem(item)} className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg"><Check className="w-4 h-4" /></button>
                                  ) : (
                                    <button onClick={() => setEditingItems(p => ({...p, [item.id]: true}))} className="p-2 text-white/30 hover:text-white opacity-0 group-hover:opacity-100"><Edit2 className="w-4 h-4" /></button>
                                  )}
                                  <button onClick={() => removeItem(item.id)} className="p-2 text-white/30 hover:text-rose-400 opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <div className="p-6 border-t border-white/5 bg-black/20 flex justify-between items-center">
                        <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Total Vale</span>
                        <span className="text-lg font-mono font-bold text-indigo-400">{formatCurrency(totals.totalDespesasVale - items.filter(i => i.type === 'card_vale').reduce((a, c) => a + (Number(c.vale)||0), 0))}</span>
                      </div>
                    </div>
                  </div>

                  {/* Faturas de Cartões */}
                  <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
                    <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                      <h2 className="text-lg font-bold flex items-center text-white">
                        <div className="p-2 rounded-xl mr-3 bg-white/5 border border-white/10">
                          <CreditCard className="w-5 h-5 text-white/80" />
                        </div>
                        Faturas de Cartões
                      </h2>
                      <button onClick={() => addItem('card_pagamento')} className="flex items-center text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-sm font-semibold transition-all">
                        <Plus className="w-4 h-4 mr-2" /> Adicionar Cartão
                      </button>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                      {items.filter(i => i.type.startsWith('card_')).map(item => {
                        const isEdit = editingItems[item.id];
                        const isPagamento = item.type === 'card_pagamento';
                        const amountField = isPagamento ? 'pagamento' : 'vale';
                        
                        return (
                          <div key={item.id} className={`flex flex-col gap-4 p-5 rounded-2xl border transition-all ${isEdit ? 'bg-black/40 border-white/30' : 'bg-black/20 border-white/5 hover:border-white/10'} group`}>
                            <div className="flex justify-between items-center">
                              <input 
                                type="text" 
                                value={item.name}
                                onChange={(e) => updateItemLocal(item.id, 'name', e.target.value)}
                                readOnly={!isEdit}
                                className="bg-transparent text-base font-bold text-white outline-none w-full"
                                placeholder="Nome do Cartão"
                              />
                              <div className="flex gap-1 ml-4">
                                {isEdit ? (
                                  <button onClick={() => saveItem(item)} className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg"><Check className="w-4 h-4" /></button>
                                ) : (
                                  <button onClick={() => setEditingItems(p => ({...p, [item.id]: true}))} className="p-2 text-white/30 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"><Edit2 className="w-4 h-4" /></button>
                                )}
                                <button onClick={() => removeItem(item.id)} className="p-2 text-white/30 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            </div>

                            <div className="flex gap-4">
                              <div className="flex-1 bg-white/5 rounded-xl p-3 border border-white/5">
                                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Fonte</label>
                                <select 
                                  value={isPagamento ? 'pagamento' : 'vale'} 
                                  onChange={(e) => updateCardSource(item, e.target.value as 'pagamento' | 'vale')}
                                  disabled={!isEdit}
                                  className={`w-full bg-transparent text-sm font-semibold outline-none appearance-none cursor-pointer ${isPagamento ? 'text-emerald-400' : 'text-indigo-400'}`}
                                >
                                  <option value="pagamento" className="bg-[#0f1115] text-emerald-400">Pagamento</option>
                                  <option value="vale" className="bg-[#0f1115] text-indigo-400">Vale</option>
                                </select>
                              </div>
                              <div className="flex-1 bg-white/5 rounded-xl p-3 border border-white/5">
                                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Valor</label>
                                <div className="flex items-center">
                                  <span className="text-white/40 text-xs mr-1">R$</span>
                                  <input 
                                    type="number" 
                                    value={item[amountField] || ''}
                                    onChange={(e) => updateItemLocal(item.id, amountField, e.target.value)}
                                    readOnly={!isEdit}
                                    className="w-full bg-transparent text-sm font-mono text-white outline-none"
                                    placeholder="0.00"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
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
