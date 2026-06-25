import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Trash2,
  DollarSign,
  Wallet,
  TrendingDown,
  TrendingUp,
  CreditCard,
  Loader2,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Edit2,
  Check,
  Lock,
  LayoutDashboard,
  Receipt,
  Repeat,
  Menu,
  X,
  PieChart as PieChartIcon,
  Bell,
  Share2,
  Settings,
  Users,
  UserPlus,
  CheckCircle,
  XCircle,
  Shield,
} from 'lucide-react';
import { supabase } from './lib/supabaseClient';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const PIE_COLORS = [
  '#10b981',
  '#3b82f6',
  '#f43f5e',
  '#8b5cf6',
  '#f59e0b',
  '#64748b',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#6366f1',
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
};

// Verifica se um item já foi compartilhado
const isShared = (itemId: string, sentShares: ExpenseShare[]) => {
  return sentShares.some(s => s.source_item_id === itemId && s.status !== 'rejected');
};

type ItemRecord = {
  id: string;
  name: string;
  pagamento: number;
  vale: number;
  type: string;
  is_recurring?: boolean;
  recurring_group_id?: string;
  linked_share_id?: string;
};

type CardExpense = {
  id: string;
  card_item_id: string;
  name: string;
  value: number;
  is_recurring?: boolean;
  recurring_group_id?: string;
};

type UserProfile = {
  id: string;
  email: string;
  display_name: string | null;
  role: 'admin' | 'user';
  created_at: string;
};

type ExpenseShare = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  from_user_email: string;
  target_email?: string;
  expense_name: string;
  expense_value: number;
  share_value: number;
  expense_type: string;
  source_item_id: string | null;
  source_month_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
};

type AnnualTotals = {
  income: number;
  expense: number;
  balance: number;
};

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

  const [income, setIncome] = useState({
    pagamento: 0,
    vale: 0,
    ferias: 0,
    decimoTerceiro: 0,
  });

  const [items, setItems] = useState<ItemRecord[]>([]);
  const [editingItems, setEditingItems] = useState<{ [key: string]: boolean }>({});
  const [editingIncome, setEditingIncome] = useState(false);
  const [expandedCards, setExpandedCards] = useState<{ [key: string]: boolean }>({});
  const [cardExpenses, setCardExpenses] = useState<{ [cardId: string]: CardExpense[] }>({});
  const [editingCardExpenses, setEditingCardExpenses] = useState<{ [expId: string]: boolean }>({});

  const [yearData, setYearData] = useState<any[]>([]);
  const [annualTotals, setAnnualTotals] = useState<AnnualTotals>({ income: 0, expense: 0, balance: 0 });
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeView, setActiveView] = useState<'dashboard' | 'lancamentos' | 'settings'>('dashboard');
  const [notifications, setNotifications] = useState<ExpenseShare[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [sentShares, setSentShares] = useState<ExpenseShare[]>([]);
  const [adminUsers, setAdminUsers] = useState<UserProfile[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [adminMsg, setAdminMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [shareModal, setShareModal] = useState<{ item: ItemRecord | CardExpense; isCardExp?: boolean } | null>(null);
  const [shareEmail, setShareEmail] = useState('');
  const [shareValue, setShareValue] = useState('');
  const [shareLoading, setShareLoading] = useState(false);
  const [shareMsg, setShareMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [recurrenceModal, setRecurrenceModal] = useState<{ item: ItemRecord | CardExpense; isCardExp?: boolean; cardId?: string } | null>(null);
  const [recType, setRecType] = useState<'continuous' | 'limited'>('continuous');
  const [recTargetMonth, setRecTargetMonth] = useState<number>(12);
  const [recTargetYear, setRecTargetYear] = useState<number>(currentYear);
  const [recLoading, setRecLoading] = useState(false);

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
      loadUserProfile();
      loadNotifications();

      const interval = setInterval(loadNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [currentMonthId, session?.user?.id]);

  const loadUserProfile = async () => {
    if (!session?.user?.id) return;

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (data) setUserProfile(data as UserProfile);
  };

  const loadNotifications = async () => {
    if (!session?.user?.id) return;

    const { data } = await supabase
      .from('expense_shares')
      .select('*')
      .eq('to_user_id', session.user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (data) setNotifications(data as ExpenseShare[]);

    const { data: sent } = await supabase
      .from('expense_shares')
      .select('*')
      .eq('from_user_id', session.user.id)
      .eq('source_month_id', currentMonthId);

    if (sent) setSentShares(sent as ExpenseShare[]);
  };

  const loadAdminUsers = async () => {
    setAdminLoading(true);

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true });

    if (data) setAdminUsers(data as UserProfile[]);
    setAdminLoading(false);
  };

  const createAdminUser = async () => {
    if (!newUserEmail || !newUserPassword) {
      setAdminMsg({ type: 'error', text: 'Preencha e-mail e senha.' });
      return;
    }

    setAdminLoading(true);
    setAdminMsg(null);

    try {
      const { data: { session: s } } = await supabase.auth.getSession();

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${s?.access_token}`,
        },
        body: JSON.stringify({
          email: newUserEmail,
          password: newUserPassword,
          display_name: newUserName,
        }),
      });

      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || 'Erro ao criar usuário');

      setAdminMsg({ type: 'success', text: `Usuário ${newUserEmail} criado com sucesso!` });
      setNewUserEmail('');
      setNewUserName('');
      setNewUserPassword('');
      await loadAdminUsers();
    } catch (err: any) {
      setAdminMsg({ type: 'error', text: err.message });
    }

    setAdminLoading(false);
  };

  const sendExpenseShare = async () => {
    if (!shareModal || !shareEmail || !shareValue) {
      setShareMsg({ type: 'error', text: 'Preencha o e-mail e o valor.' });
      return;
    }

    setShareLoading(true);
    setShareMsg(null);

    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', shareEmail.toLowerCase().trim())
      .single();

    if (!targetProfile) {
      setShareMsg({ type: 'error', text: 'Usuário não encontrado no sistema.' });
      setShareLoading(false);
      return;
    }

    if (targetProfile.id === session?.user?.id) {
      setShareMsg({ type: 'error', text: 'Você não pode compartilhar consigo mesmo.' });
      setShareLoading(false);
      return;
    }

    const item = shareModal.item;
    let totalValue = 0;
    let expenseType = '';
    
    if (shareModal.isCardExp) {
      const exp = item as CardExpense;
      totalValue = Number(exp.value) || 0;
      // Para itens individuais, tentamos descobrir se o cartão pai é pagamento ou vale
      const parentCard = items.find(i => i.id === exp.card_item_id);
      expenseType = parentCard?.type === 'card_pagamento' ? 'card_pagamento_item' : 'card_vale_item';
    } else {
      const rec = item as ItemRecord;
      expenseType = rec.type;
      if (rec.type.startsWith('card_')) {
        const isPagamento = rec.type === 'card_pagamento';
        const amountField = isPagamento ? 'pagamento' : 'vale';
        const baseVal = Number(rec[amountField as keyof ItemRecord] || 0);
        const exps = cardExpenses[rec.id] || [];
        const expsSum = exps.reduce((s, e) => s + Number(e.value || 0), 0);
        totalValue = baseVal + expsSum;
      } else {
        totalValue = (Number(rec.pagamento) || 0) + (Number(rec.vale) || 0);
      }
    }

    const sv = Number(shareValue);

    const { error } = await supabase.from('expense_shares').insert({
      id: Math.random().toString(36).substr(2, 9),
      from_user_id: session?.user?.id,
      to_user_id: targetProfile.id,
      from_user_email: session?.user?.email,
      expense_name: item.name || 'Despesa sem nome',
      expense_value: totalValue,
      share_value: sv,
      expense_type: expenseType,
      source_item_id: item.id,
      source_month_id: currentMonthId,
    });

    if (error) {
      setShareMsg({ type: 'error', text: 'Erro ao compartilhar. Tente novamente.' });
    } else {
      setShareMsg({ type: 'success', text: `Convite enviado para ${shareEmail}!` });
      await loadNotifications();
      // Fecha o modal automaticamente após 2 segundos
      setTimeout(() => {
        setShareModal(null);
        setShareEmail('');
        setShareValue('');
        setShareMsg(null);
      }, 2000);
    }

    setShareLoading(false);
  };

  const respondToShare = async (share: ExpenseShare, accept: boolean) => {
    await supabase
      .from('expense_shares')
      .update({
        status: accept ? 'accepted' : 'rejected',
        responded_at: new Date().toISOString(),
      })
      .eq('id', share.id);

    if (accept) {
      const { data: monthData } = await supabase
        .from('months')
        .select('id')
        .eq('id', share.source_month_id)
        .single();

      if (!monthData) {
        const [y, m] = share.source_month_id.split('-');
        await supabase.from('months').insert({
          id: share.source_month_id,
          year: parseInt(y, 10),
          month_name: MONTH_NAMES[parseInt(m, 10) - 1],
        });
      }

      const isPagamento = share.expense_type.includes('pagamento');

      await supabase.from('items').insert({
        id: Math.random().toString(36).substr(2, 9),
        month_id: share.source_month_id,
        type: share.expense_type.startsWith('card_')
          ? isPagamento
            ? 'expense_pagamento'
            : 'expense_vale'
          : share.expense_type,
        name: `${share.expense_name} (compartilhado)`,
        pagamento: isPagamento ? share.share_value : 0,
        vale: !isPagamento ? share.share_value : 0,
        linked_share_id: share.id,
      });
    }

    setNotifications(prev => prev.filter(n => n.id !== share.id));
    if (currentMonthId === share.source_month_id && accept) fetchData();
  };

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
    const { data: months } = await supabase
      .from('months')
      .select('*')
      .eq('year', currentYear);

    if (!months) return;

    const monthIds = months.map(m => m.id);

    const { data: allItems } = await supabase
      .from('items')
      .select('*')
      .in('month_id', monthIds);

    let totalInc = 0;
    let totalExp = 0;

    const chartData = MONTH_NAMES.map((name, idx) => {
      const mId = `${currentYear}-${String(idx + 1).padStart(2, '0')}`;
      const monthDb = months.find(m => m.id === mId);
      const mItems = allItems?.filter(i => i.month_id === mId) || [];

      const rec = monthDb
        ? Number(monthDb.income_pagamento || 0) +
          Number(monthDb.income_vale || 0) +
          Number(monthDb.income_ferias || 0) +
          Number(monthDb.income_decimo_terceiro || 0)
        : 0;

      const desp = mItems.reduce(
        (acc, curr) => acc + (Number(curr.pagamento) || 0) + (Number(curr.vale) || 0),
        0,
      );

      totalInc += rec;
      totalExp += desp;

      return {
        name: name.substring(0, 3),
        Receitas: rec,
        Despesas: desp,
        Saldo: rec - desp,
      };
    });

    setYearData(chartData);
    setAnnualTotals({ income: totalInc, expense: totalExp, balance: totalInc - totalExp });
  };

  const fetchData = async () => {
    setLoading(true);

    let { data: monthData, error: monthError } = await supabase
      .from('months')
      .select('*')
      .eq('id', currentMonthId)
      .single();

    if (!monthData && monthError?.code === 'PGRST116') {
      const { data: newMonth } = await supabase
        .from('months')
        .insert({
          id: currentMonthId,
          year: currentYear,
          month_name: MONTH_NAMES[currentMonthIndex],
        })
        .select()
        .single();

      monthData = newMonth;

      setIncome({ pagamento: 0, vale: 0, ferias: 0, decimoTerceiro: 0 });

      let prevMonthIdx = currentMonthIndex - 1;
      let prevYear = currentYear;

      if (prevMonthIdx < 0) {
        prevMonthIdx = 11;
        prevYear -= 1;
      }

      const prevMonthId = `${prevYear}-${String(prevMonthIdx + 1).padStart(2, '0')}`;

      const { data: recurringItems } = await supabase
        .from('items')
        .select('*')
        .eq('month_id', prevMonthId)
        .eq('is_recurring', true);

      if (recurringItems && recurringItems.length > 0) {
        for (const item of recurringItems) {
          const newItemId = Math.random().toString(36).substr(2, 9);

          await supabase
            .from('items')
            .insert({
              ...item,
              id: newItemId,
              month_id: currentMonthId,
            })
            .select()
            .single();

          if (item.type.startsWith('card_')) {
            const { data: recurringCardExps } = await supabase
              .from('card_expenses')
              .select('*')
              .eq('card_item_id', item.id)
              .eq('is_recurring', true);

            if (recurringCardExps && recurringCardExps.length > 0) {
              await supabase.from('card_expenses').insert(
                recurringCardExps.map(ce => ({
                  ...ce,
                  id: Math.random().toString(36).substr(2, 9),
                  card_item_id: newItemId,
                })),
              );
            }
          }
        }
      }
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
      .eq('month_id', currentMonthId)
      .order('created_at', { ascending: true });

    if (currentItems) {
      setItems(currentItems as ItemRecord[]);

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
            expMap[e.card_item_id].push(e as CardExpense);
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
    await supabase
      .from('months')
      .update({
        income_pagamento: income.pagamento,
        income_vale: income.vale,
        income_ferias: income.ferias,
        income_decimo_terceiro: income.decimoTerceiro,
      })
      .eq('id', currentMonthId);

    setEditingIncome(false);
    fetchYearData();
  };

  const saveItem = async (item: ItemRecord) => {
    await supabase
      .from('items')
      .update({
        name: item.name,
        pagamento: item.pagamento,
        vale: item.vale,
        type: item.type,
      })
      .eq('id', item.id);

    let updateFuture = false;
    if (item.is_recurring && item.recurring_group_id) {
      updateFuture = window.confirm(
        'Deseja alterar este item apenas deste mês ou de todos os meses futuros também?\n\n[OK] = Todos os meses futuros\n[Cancelar] = Apenas este mês',
      );
    }

    if (updateFuture && item.recurring_group_id) {
      await supabase
        .from('items')
        .update({
          name: item.name,
          pagamento: item.pagamento,
          vale: item.vale,
          type: item.type,
        })
        .eq('recurring_group_id', item.recurring_group_id)
        .gt('month_id', currentMonthId);
    }

    setEditingItems(prev => ({ ...prev, [item.id]: false }));
    fetchYearData();
  };

  const updateCardSource = async (item: ItemRecord, source: 'pagamento' | 'vale') => {
    const currentAmount = Math.max(Number(item.pagamento) || 0, Number(item.vale) || 0);

    const updated = {
      ...item,
      type: `card_${source}`,
      pagamento: source === 'pagamento' ? currentAmount : 0,
      vale: source === 'vale' ? currentAmount : 0,
    };

    setItems(prev => prev.map(i => (i.id === item.id ? updated : i)));

    await supabase
      .from('items')
      .update({
        type: updated.type,
        pagamento: updated.pagamento,
        vale: updated.vale,
      })
      .eq('id', item.id);

    if (item.is_recurring && item.recurring_group_id) {
      await supabase
        .from('items')
        .update({
          type: updated.type,
          pagamento: updated.pagamento,
          vale: updated.vale,
        })
        .eq('recurring_group_id', item.recurring_group_id)
        .gt('month_id', currentMonthId);
    }

    fetchYearData();
  };

  const ensureMonthExists = async (monthId: string) => {
    const { data: monthData } = await supabase
      .from('months')
      .select('id')
      .eq('id', monthId)
      .maybeSingle();

    if (!monthData) {
      const [y, m] = monthId.split('-');
      await supabase.from('months').insert({
        id: monthId,
        year: parseInt(y, 10),
        month_name: MONTH_NAMES[parseInt(m, 10) - 1],
      });
    }
  };

  const ensureCardExistsInMonth = async (cardItem: ItemRecord, targetMonthId: string): Promise<string | null> => {
    let query = supabase
      .from('items')
      .select('id')
      .eq('month_id', targetMonthId);
      
    if (cardItem.recurring_group_id) {
      query = query.eq('recurring_group_id', cardItem.recurring_group_id);
    } else {
      query = query.eq('name', cardItem.name);
    }
    
    const { data } = await query.maybeSingle();
    if (data) return data.id;

    const newCardId = Math.random().toString(36).substr(2, 9);
    const { error } = await supabase.from('items').insert({
      id: newCardId,
      month_id: targetMonthId,
      type: cardItem.type,
      name: cardItem.name,
      pagamento: cardItem.pagamento,
      vale: cardItem.vale,
      is_recurring: cardItem.is_recurring,
      recurring_group_id: cardItem.recurring_group_id,
    });
    
    if (error) {
      console.error("Error creating card in target month:", error);
      return null;
    }
    return newCardId;
  };

  const getMonthsRange = (startMonthId: string, endMonthId: string): string[] => {
    const months: string[] = [];
    let [currentY, currentM] = startMonthId.split('-').map(Number);
    const [endY, endM] = endMonthId.split('-').map(Number);
    
    while (currentY < endY || (currentY === endY && currentM < endM)) {
      currentM += 1;
      if (currentM > 12) {
        currentM = 1;
        currentY += 1;
      }
      months.push(`${currentY}-${String(currentM).padStart(2, '0')}`);
    }
    return months;
  };

  const toggleRecurring = async (item: ItemRecord) => {
    const isNowRecurring = !item.is_recurring;
    if (isNowRecurring) {
      setRecType('continuous');
      setRecTargetMonth(currentMonthIndex + 1);
      setRecTargetYear(currentYear);
      setRecurrenceModal({ item, isCardExp: false });
    } else {
      const removeFuture = window.confirm(
        "Deseja remover a recorrência deste item para todos os meses futuros também?\n\n[OK] = Sim, remover do futuro\n[Cancelar] = Não, apenas deste mês"
      );

      setItems(prev =>
        prev.map(i =>
          i.id === item.id ? { ...i, is_recurring: false } : i,
        ),
      );
      await supabase
        .from('items')
        .update({ is_recurring: false })
        .eq('id', item.id);

      if (removeFuture && item.recurring_group_id) {
        await supabase
          .from('items')
          .update({ is_recurring: false })
          .eq('recurring_group_id', item.recurring_group_id)
          .gt('month_id', currentMonthId);
      }
      
      fetchYearData();
    }
  };

  const addItem = async (type: string) => {
    const newItem = {
      id: Math.random().toString(36).substr(2, 9),
      month_id: currentMonthId,
      type,
      name: '',
      pagamento: 0,
      vale: 0,
    };

    setItems(prev => [...prev, newItem]);
    await supabase.from('items').insert(newItem);
    setEditingItems(prev => ({ ...prev, [newItem.id]: true }));
  };

  const removeItem = async (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    let deleteFuture = false;

    if (item.is_recurring && item.recurring_group_id) {
      deleteFuture = window.confirm(
        'Deseja excluir este item apenas deste mês ou de todos os meses futuros também?\n\n[OK] = Todos os meses futuros\n[Cancelar] = Apenas este mês',
      );
    }

    setItems(prev => prev.filter(i => i.id !== id));
    setCardExpenses(prev => {
      const n = { ...prev };
      delete n[id];
      return n;
    });

    // Primeiro exclui qualquer compartilhamento vinculado a este item e seus filhos (se for cartão)
    // O trigger no banco cuidará de excluir as cópias nas contas de outros usuários
    const childExpIds = (cardExpenses[id] || []).map(e => e.id);
    await supabase.from('expense_shares').delete().in('source_item_id', [id, ...childExpIds]);

    await supabase.from('items').delete().eq('id', id);

    if (deleteFuture && item.recurring_group_id) {
      await supabase
        .from('items')
        .delete()
        .eq('recurring_group_id', item.recurring_group_id)
        .gt('month_id', currentMonthId);
    }

    fetchYearData();
  };

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
      [cardItem.id]: [...(prev[cardItem.id] || []), newExp],
    }));

    setEditingCardExpenses(prev => ({ ...prev, [newExp.id]: true }));
    await supabase.from('card_expenses').insert(newExp);
  };

  const updateCardExpenseLocal = (
    cardId: string,
    expId: string,
    field: string,
    value: string | number,
  ) => {
    setCardExpenses(prev => ({
      ...prev,
      [cardId]: (prev[cardId] || []).map(e =>
        e.id === expId ? { ...e, [field]: value } : e,
      ),
    }));
  };

  const saveCardExpense = async (cardItem: ItemRecord, exp: CardExpense) => {
    await supabase
      .from('card_expenses')
      .update({ name: exp.name, value: Number(exp.value) || 0 })
      .eq('id', exp.id);

    let updateFuture = false;
    if (exp.is_recurring && exp.recurring_group_id) {
      updateFuture = window.confirm(
        'Deseja alterar esta compra apenas deste mês ou de todos os meses futuros também?\n\n[OK] = Todos os meses futuros\n[Cancelar] = Apenas este mês',
      );
    }

    if (updateFuture && exp.recurring_group_id) {
      const { data: relatedExps } = await supabase
        .from('card_expenses')
        .select('id, card_item_id')
        .eq('recurring_group_id', exp.recurring_group_id);
        
      if (relatedExps && relatedExps.length > 0) {
        const cardItemIds = relatedExps.map(e => e.card_item_id);
        const { data: relatedCards } = await supabase
          .from('items')
          .select('id, month_id')
          .in('id', cardItemIds);
          
        if (relatedCards && relatedCards.length > 0) {
          const futureCardIds = relatedCards
            .filter(c => c.month_id > currentMonthId)
            .map(c => c.id);
            
          const futureExpIds = relatedExps
            .filter(e => futureCardIds.includes(e.card_item_id))
            .map(e => e.id);
            
          if (futureExpIds.length > 0) {
            await supabase
              .from('card_expenses')
              .update({ name: exp.name, value: Number(exp.value) || 0 })
              .in('id', futureExpIds);
          }
        }
      }
    }

    setEditingCardExpenses(prev => ({ ...prev, [exp.id]: false }));
    setCardExpenses(prev => ({
      ...prev,
      [cardItem.id]: (prev[cardItem.id] || []).map(e => (e.id === exp.id ? exp : e)),
    }));

    fetchYearData();
  };

  const removeCardExpense = async (cardItem: ItemRecord, expId: string) => {
    const expenses = cardExpenses[cardItem.id] || [];
    const exp = expenses.find(e => e.id === expId);
    if (!exp) return;

    let deleteFuture = false;
    if (exp.is_recurring && exp.recurring_group_id) {
      deleteFuture = window.confirm(
        'Deseja excluir esta compra apenas deste mês ou de todos os meses futuros também?\n\n[OK] = Todos os meses futuros\n[Cancelar] = Apenas este mês',
      );
    }

    if (deleteFuture && exp.recurring_group_id) {
      const { data: relatedExps } = await supabase
        .from('card_expenses')
        .select('id, card_item_id')
        .eq('recurring_group_id', exp.recurring_group_id);
        
      if (relatedExps && relatedExps.length > 0) {
        const cardItemIds = relatedExps.map(e => e.card_item_id);
        const { data: relatedCards } = await supabase
          .from('items')
          .select('id, month_id')
          .in('id', cardItemIds);
          
        if (relatedCards && relatedCards.length > 0) {
          const futureCardIds = relatedCards
            .filter(c => c.month_id >= currentMonthId)
            .map(c => c.id);
            
          const futureExpIds = relatedExps
            .filter(e => futureCardIds.includes(e.card_item_id))
            .map(e => e.id);
            
          if (futureExpIds.length > 0) {
            await supabase.from('expense_shares').delete().in('source_item_id', futureExpIds);
            await supabase.from('card_expenses').delete().in('id', futureExpIds);
          }
        }
      }
    } else {
      const remaining = expenses.filter(e => e.id !== expId);
      setCardExpenses(prev => ({ ...prev, [cardItem.id]: remaining }));
      await supabase.from('expense_shares').delete().eq('source_item_id', expId);
      await supabase.from('card_expenses').delete().eq('id', expId);
    }

    fetchYearData();
  };

  const toggleRecurringCardExpense = async (cardId: string, exp: CardExpense) => {
    const isNowRecurring = !exp.is_recurring;
    if (isNowRecurring) {
      setRecType('continuous');
      setRecTargetMonth(currentMonthIndex + 1);
      setRecTargetYear(currentYear);
      setRecurrenceModal({ item: exp, isCardExp: true, cardId });
    } else {
      const removeFuture = window.confirm(
        "Deseja remover a recorrência desta despesa para todos os meses futuros também?\n\n[OK] = Sim, remover do futuro\n[Cancelar] = Não, apenas deste mês"
      );

      setCardExpenses(prev => ({
        ...prev,
        [cardId]: (prev[cardId] || []).map(e =>
          e.id === exp.id ? { ...e, is_recurring: false } : e,
        ),
      }));
      await supabase
        .from('card_expenses')
        .update({ is_recurring: false })
        .eq('id', exp.id);

      if (removeFuture && exp.recurring_group_id) {
        const { data: relatedExps } = await supabase
          .from('card_expenses')
          .select('id, card_item_id')
          .eq('recurring_group_id', exp.recurring_group_id);

        if (relatedExps && relatedExps.length > 0) {
          const cardItemIds = relatedExps.map(re => re.card_item_id);
          const { data: relatedCards } = await supabase
            .from('items')
            .select('id, month_id')
            .in('id', cardItemIds);

          if (relatedCards && relatedCards.length > 0) {
            const futureCardIds = relatedCards
              .filter(c => c.month_id > currentMonthId)
              .map(c => c.id);

            const futureExpIds = relatedExps
              .filter(re => futureCardIds.includes(re.card_item_id))
              .map(re => re.id);

            if (futureExpIds.length > 0) {
              await supabase
                .from('card_expenses')
                .update({ is_recurring: false })
                .in('id', futureExpIds);
            }
          }
        }
      }

      fetchYearData();
    }
  };

  const saveRecurrenceConfig = async () => {
    if (!recurrenceModal || recLoading) return;
    setRecLoading(true);

    try {
      const { item, isCardExp, cardId } = recurrenceModal;
      const groupId = item.recurring_group_id || Math.random().toString(36).substr(2, 9);
      
      let nextMonths: string[] = [];
      let endMonthId: string | null = null;
      
      if (recType === 'limited') {
        const targetMonthStr = String(recTargetMonth).padStart(2, '0');
        endMonthId = `${recTargetYear}-${targetMonthStr}`;
        
        if (endMonthId < currentMonthId) {
          alert("A data limite não pode ser no passado.");
          return;
        }
        
        nextMonths = getMonthsRange(currentMonthId, endMonthId);
      } else {
        // Continuous: propagate to all existing future months
        const { data: futureMonths } = await supabase
          .from('months')
          .select('id')
          .gt('id', currentMonthId);
        if (futureMonths) {
          nextMonths = futureMonths.map(m => m.id);
        }
      }

      if (isCardExp) {
        const exp = item as CardExpense;
        const cId = cardId || exp.card_item_id;
        const cardItem = items.find(i => i.id === cId);
        if (!cardItem) return;

        // Update current month expense
        setCardExpenses(prev => ({
          ...prev,
          [cId]: (prev[cId] || []).map(e =>
            e.id === exp.id ? { ...e, is_recurring: true, recurring_group_id: groupId } : e,
          ),
        }));
        await supabase
          .from('card_expenses')
          .update({ is_recurring: true, recurring_group_id: groupId })
          .eq('id', exp.id);

        // Copy to target months
        for (let idx = 0; idx < nextMonths.length; idx++) {
          const targetMonthId = nextMonths[idx];
          const isLastMonth = recType === 'limited' && targetMonthId === endMonthId;

          await ensureMonthExists(targetMonthId);
          const targetCardId = await ensureCardExistsInMonth(cardItem, targetMonthId);

          if (targetCardId) {
            const { data: existingExp } = await supabase
              .from('card_expenses')
              .select('id')
              .eq('card_item_id', targetCardId)
              .eq('recurring_group_id', groupId)
              .maybeSingle();

            if (!existingExp) {
              await supabase.from('card_expenses').insert({
                id: Math.random().toString(36).substr(2, 9),
                card_item_id: targetCardId,
                name: exp.name,
                value: exp.value,
                is_recurring: !isLastMonth,
                recurring_group_id: groupId,
              });
            } else {
              await supabase
                .from('card_expenses')
                .update({ is_recurring: !isLastMonth, name: exp.name, value: exp.value })
                .eq('id', existingExp.id);
            }
          }
        }
      } else {
        const rec = item as ItemRecord;
        
        // Update current month item
        setItems(prev =>
          prev.map(i =>
            i.id === rec.id ? { ...i, is_recurring: true, recurring_group_id: groupId } : i,
          ),
        );
        await supabase
          .from('items')
          .update({ is_recurring: true, recurring_group_id: groupId })
          .eq('id', rec.id);

        // Copy to target months
        for (let idx = 0; idx < nextMonths.length; idx++) {
          const targetMonthId = nextMonths[idx];
          const isLastMonth = recType === 'limited' && targetMonthId === endMonthId;

          await ensureMonthExists(targetMonthId);

          const { data: existingItem } = await supabase
            .from('items')
            .select('id')
            .eq('month_id', targetMonthId)
            .eq('recurring_group_id', groupId)
            .maybeSingle();

          if (!existingItem) {
            await supabase.from('items').insert({
              id: Math.random().toString(36).substr(2, 9),
              month_id: targetMonthId,
              type: rec.type,
              name: rec.name,
              pagamento: rec.pagamento,
              vale: rec.vale,
              is_recurring: !isLastMonth,
              recurring_group_id: groupId,
            });
          } else {
            await supabase
              .from('items')
              .update({
                is_recurring: !isLastMonth,
                name: rec.name,
                pagamento: rec.pagamento,
                vale: rec.vale,
              })
              .eq('id', existingItem.id);
          }
        }
      }

      setRecurrenceModal(null);
      fetchData();
    } finally {
      setRecLoading(false);
    }
  };

  const updateIncomeLocal = (field: string, value: number) => {
    setIncome(prev => ({ ...prev, [field]: value }));
  };

  const updateItemLocal = (id: string, field: string, value: string | number) => {
    setItems(prev => prev.map(item => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const totals = useMemo(() => {
    const expensesPagamento = items
      .filter(i => i.type === 'expense_pagamento')
      .reduce((a, c) => a + (Number(c.pagamento) || 0), 0);

    const expensesVale = items
      .filter(i => i.type === 'expense_vale')
      .reduce((a, c) => a + (Number(c.vale) || 0), 0);

    const cardsPagamento = items
      .filter(i => i.type === 'card_pagamento')
      .reduce((a, c) => {
        const base = Number(c.pagamento) || 0;
        const expsSum = (cardExpenses[c.id] || []).reduce((s, e) => s + Number(e.value || 0), 0);
        return a + base + expsSum;
      }, 0);

    const cardsVale = items
      .filter(i => i.type === 'card_vale')
      .reduce((a, c) => {
        const base = Number(c.vale) || 0;
        const expsSum = (cardExpenses[c.id] || []).reduce((s, e) => s + Number(e.value || 0), 0);
        return a + base + expsSum;
      }, 0);

    const totalPagamentoIncome =
      (Number(income.pagamento) || 0) +
      (Number(income.ferias) || 0) +
      (Number(income.decimoTerceiro) || 0);

    const totalValeIncome = Number(income.vale) || 0;
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
      remainingVale,
    };
  }, [income, items, cardExpenses]);

  const pieChartData = useMemo(() => {
    const expenses = items.filter(i => i.type.startsWith('expense_') || i.type.startsWith('card_'));

    const grouped = expenses.reduce((acc, curr) => {
      const name = curr.name?.trim() || 'Sem nome';
      const base = (Number(curr.pagamento) || 0) + (Number(curr.vale) || 0);
      const expsSum = curr.type.startsWith('card_')
        ? (cardExpenses[curr.id] || []).reduce((s, e) => s + Number(e.value || 0), 0)
        : 0;
      const totalVal = base + expsSum;

      if (totalVal > 0) {
        acc[name] = (acc[name] || 0) + totalVal;
      }

      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [items, cardExpenses]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0f1115] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#0f1115] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-600/20 blur-[120px] pointer-events-none" />

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl w-full max-w-md shadow-2xl relative z-10">
          <div className="flex flex-col items-center mb-8">
            <img src="/Logo.png" alt="ZimFinance" className="w-20 h-20 object-contain mb-4 drop-shadow-2xl" />
            <h1 className="text-3xl font-extrabold text-white tracking-tight">ZimFinance</h1>
            <p className="text-white/50 text-sm mt-2">Acesse seu controle financeiro</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {authError && (
              <div className="bg-rose-500/20 text-rose-400 p-3 rounded-xl text-sm text-center border border-rose-500/30">
                {authError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-black/20 border border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 p-3 rounded-xl text-white outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-black/20 border border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 p-3 rounded-xl text-white outline-none transition-all"
                required
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold py-3.5 rounded-xl hover:from-emerald-400 hover:to-emerald-500 transition-all shadow-lg shadow-emerald-500/25 active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {authLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Entrar
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#0f1115] text-white font-sans overflow-hidden selection:bg-emerald-500/30">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-[60] lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed lg:relative w-64 bg-[#0f1115]/95 backdrop-blur-2xl border-r border-white/10 flex flex-col z-[70] h-full transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="h-16 lg:h-24 flex items-center justify-between px-6 lg:px-8 border-b border-white/5">
          <div className="flex items-center">
            <img src="/Logo.png" alt="Logo" className="w-8 h-8 lg:w-10 lg:h-10 object-contain mr-3" />
            <h1 className="text-lg lg:text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
              ZimFinance
            </h1>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="p-1.5 text-white/40 hover:text-white lg:hidden rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 lg:py-8 space-y-2">
          <button
            onClick={() => {
              setActiveView('dashboard');
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center px-4 py-3.5 rounded-2xl font-bold transition-all ${activeView === 'dashboard' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-white/50 hover:text-white hover:bg-white/5 border border-transparent'}`}
          >
            <LayoutDashboard className="w-5 h-5 mr-3" />
            Dashboard
          </button>

          <button
            onClick={() => {
              setActiveView('lancamentos');
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center px-4 py-3.5 rounded-2xl font-bold transition-all ${activeView === 'lancamentos' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-white/50 hover:text-white hover:bg-white/5 border border-transparent'}`}
          >
            <Receipt className="w-5 h-5 mr-3" />
            Lançamentos
          </button>

          {userProfile?.role === 'admin' && (
            <button
              onClick={() => {
                setActiveView('settings');
                setSidebarOpen(false);
                loadAdminUsers();
              }}
              className={`w-full flex items-center px-4 py-3.5 rounded-2xl font-bold transition-all ${activeView === 'settings' ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' : 'text-white/50 hover:text-white hover:bg-white/5 border border-transparent'}`}
            >
              <Settings className="w-5 h-5 mr-3" />
              Configurações
            </button>
          )}
        </nav>

        <div className="p-4 border-t border-white/5">
          <div className="flex items-center justify-between bg-black/20 p-3 rounded-2xl border border-white/5">
            <div className="flex items-center overflow-hidden">
              <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2 flex-shrink-0" />
              <span className="text-xs text-white/50 truncate pr-2">{session.user.email}</span>
            </div>
            <button onClick={handleLogout} className="p-2 bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 rounded-xl text-white/70 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative overflow-hidden">
        <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-600/20 blur-[120px] pointer-events-none" />
        <div className="fixed bottom-[10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/20 blur-[120px] pointer-events-none" />

        <header className="h-14 lg:h-16 px-3 lg:px-8 border-b border-white/10 flex items-center justify-between bg-white/5 backdrop-blur-xl z-40">
          <div className="flex items-center gap-2">
            <button onClick={() => setSidebarOpen(true)} className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-all lg:hidden">
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-sm lg:text-lg font-bold text-white/90 truncate">
              {activeView === 'dashboard' ? 'Dashboard' : activeView === 'lancamentos' ? 'Lançamentos' : 'Configurações'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-black/40 px-1.5 py-1 rounded-xl border border-white/10 relative">
              <button onClick={() => setCurrentYear(y => y - 1)} className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="w-10 text-center font-bold text-emerald-400 font-mono text-xs">{currentYear}</span>
              <button onClick={() => setCurrentYear(y => y + 1)} className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <div className="w-px h-5 bg-white/10 mx-0.5" />

              <button
                onClick={() => {
                  if (currentMonthIndex === 0) {
                    setCurrentMonthIndex(11);
                    setCurrentYear(y => y - 1);
                  } else {
                    setCurrentMonthIndex(m => m - 1);
                  }
                }}
                className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setShowMonthPicker(p => !p)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${currentMonthIndex === realCurrentMonth && currentYear === realCurrentYear ? 'text-emerald-400 bg-emerald-500/15' : 'text-white/80 hover:bg-white/10'}`}
              >
                {MONTH_NAMES[currentMonthIndex].substring(0, 3)}
              </button>

              <button
                onClick={() => {
                  if (currentMonthIndex === 11) {
                    setCurrentMonthIndex(0);
                    setCurrentYear(y => y + 1);
                  } else {
                    setCurrentMonthIndex(m => m + 1);
                  }
                }}
                className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

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
                            onClick={() => {
                              setCurrentMonthIndex(idx);
                              setShowMonthPicker(false);
                            }}
                            className={`px-2 py-2 rounded-xl text-xs font-bold transition-all ${isActive ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25' : isCurrent ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}
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

            <div className="relative">
              <button
                onClick={() => setShowNotifications(p => !p)}
                className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-all relative"
              >
                <Bell className="w-5 h-5" />
                {notifications.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 rounded-full text-[9px] font-bold flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </button>

              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                  <div className="absolute right-0 top-full mt-2 z-50 w-80 bg-[#1a1d23] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
                      <Bell className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-sm">Notificações</span>
                    </div>

                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-white/30 text-sm">Nenhuma notificação pendente</div>
                    ) : (
                      <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
                        {notifications.map(n => (
                          <div key={n.id} className="p-4">
                            <p className="text-xs text-white/50 mb-1">{n.from_user_email}</p>
                            <p className="font-bold text-sm text-white mb-0.5">{n.expense_name}</p>
                            <div className="flex items-center gap-2 text-xs mb-3">
                              <span className="text-white/50">Sua parte:</span>
                              <span className="text-emerald-400 font-mono font-bold">{formatCurrency(n.share_value)}</span>
                              <span className="text-white/30">de {formatCurrency(n.expense_value)}</span>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => respondToShare(n, true)} className="flex-1 flex items-center justify-center gap-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-bold py-2 rounded-xl transition-all">
                                <CheckCircle className="w-3.5 h-3.5" /> Aceitar
                              </button>
                              <button onClick={() => respondToShare(n, false)} className="flex-1 flex items-center justify-center gap-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold py-2 rounded-xl transition-all">
                                <XCircle className="w-3.5 h-3.5" /> Recusar
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {activeView !== 'settings' && (
          <div className="flex-1 overflow-y-auto p-3 lg:p-6 pb-20 lg:pb-6 relative z-10 custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto">
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 lg:gap-3">
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
                      <div key={idx} className={`${idx === 4 ? 'col-span-2 lg:col-span-1' : ''} bg-white/5 backdrop-blur-xl rounded-xl lg:rounded-2xl border border-white/10 p-3 lg:p-4 hover:border-white/20 transition-all group`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{card.label}</span>
                          <div className={`p-1.5 rounded-lg border ${colors}`}>
                            <Icon className="w-3 h-3" />
                          </div>
                        </div>
                        <p className={`text-base lg:text-xl font-extrabold font-mono tracking-tight ${textColor}`}>{formatCurrency(card.value)}</p>
                        {card.sub && <p className="text-[10px] text-white/30 font-mono mt-1">{card.sub}</p>}
                      </div>
                    );
                  })}
                </div>

                {activeView === 'dashboard' ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 lg:gap-3">
                      <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl px-3 lg:px-4 py-2.5 lg:py-3 flex items-center justify-between">
                        <span className="text-[9px] lg:text-[10px] font-bold text-white/40 uppercase tracking-widest">Receita Anual</span>
                        <span className="text-xs lg:text-sm font-mono font-bold text-emerald-400">{formatCurrency(annualTotals.income)}</span>
                      </div>
                      <div className="bg-rose-500/5 border border-rose-500/15 rounded-xl px-3 lg:px-4 py-2.5 lg:py-3 flex items-center justify-between">
                        <span className="text-[9px] lg:text-[10px] font-bold text-white/40 uppercase tracking-widest">Gasto Anual</span>
                        <span className="text-xs lg:text-sm font-mono font-bold text-rose-400">{formatCurrency(annualTotals.expense)}</span>
                      </div>
                      <div className={`${annualTotals.balance >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'} border rounded-xl px-3 lg:px-4 py-2.5 lg:py-3 flex items-center justify-between`}>
                        <span className="text-[9px] lg:text-[10px] font-bold text-white/40 uppercase tracking-widest">Projeção Anual</span>
                        <span className={`text-xs lg:text-sm font-mono font-bold ${annualTotals.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(annualTotals.balance || 0)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                      <div className="xl:col-span-2 bg-white/5 backdrop-blur-xl p-5 rounded-2xl border border-white/10 flex flex-col shadow-xl">
                        <h3 className="text-sm font-bold text-white/70 mb-4 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-indigo-400" />
                          Visão Anual ({currentYear})
                        </h3>
                        <div className="flex-1 w-full min-h-[260px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={yearData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                              <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} />
                              <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickFormatter={(val) => `${Number(val) / 1000}k`} tickLine={false} axisLine={false} />
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
                                  {pieChartData.map((_entry, index) => (
                                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#0f1115', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '16px', color: '#fff' }} formatter={(val: any) => formatCurrency(Number(val))} />
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
                          { label: 'Pagamento', field: 'pagamento', color: 'emerald' },
                          { label: 'Adiantamento', field: 'vale', color: 'indigo' },
                          { label: 'Férias', field: 'ferias', color: 'emerald' },
                          ...(currentMonthIndex === 10 || currentMonthIndex === 11 ? [{ label: '13º Salário', field: 'decimoTerceiro', color: 'emerald' }] : []),
                        ].map(inputMap => (
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

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
                              <div key={item.id} className={`flex flex-col transition-all group ${isEdit ? 'bg-emerald-500/5' : 'hover:bg-white/3'} ${sentShares.some(s => s.source_item_id === item.id) ? 'border-l-2 border-indigo-500' : ''}`}>
                                {sentShares.filter(s => s.source_item_id === item.id).map(s => (
                                  <div key={s.id} className="flex items-center gap-2 px-3 pt-1.5 text-[9px] opacity-70">
                                    <span className={`px-1 rounded-sm font-bold border ${s.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : s.status === 'rejected' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}`}>
                                      {s.status === 'pending' ? 'AGUARDANDO' : s.status === 'accepted' ? 'ACEITO' : 'RECUSADO'}
                                    </span>
                                    <span className="text-white/40 italic">Dividido com {s.target_email || s.to_user_id}</span>
                                    <span className="text-white/40">Minha parte: <span className="text-emerald-400">{formatCurrency(Number(item.pagamento) - Number(s.share_value))}</span></span>
                                  </div>
                                ))}

                                <div className="flex items-center gap-2 px-3 py-2">
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

                                  <div className="flex gap-1 items-center bg-black/40 px-1.5 py-0.5 rounded-lg border border-white/5 shadow-xl shrink-0 opacity-0 group-hover:opacity-100 transition-all">
                                    <button onClick={() => toggleRecurring(item)} className={`p-1 rounded transition-all ${item.is_recurring ? 'text-emerald-400 bg-emerald-500/10' : 'text-white/20 hover:text-white'}`} title="Recorrente">
                                      <Repeat className="w-3 h-3" />
                                    </button>
                                    <button 
                                      onClick={() => { setShareModal({ item }); setShareValue(String((Number(item.pagamento) || 0) / 2)); }} 
                                      className={`p-1 transition-all rounded ${isShared(item.id, sentShares) ? 'text-emerald-400' : 'text-white/20 hover:text-indigo-400'}`}
                                      title={isShared(item.id, sentShares) ? "Já compartilhado" : "Compartilhar"}
                                    >
                                      <Share2 className="w-3 h-3" />
                                    </button>
                                    {isEdit ? (
                                      <button onClick={() => saveItem(item)} className="p-1 bg-emerald-500/20 text-emerald-400 rounded">
                                        <Check className="w-3 h-3" />
                                      </button>
                                    ) : (
                                      <button onClick={() => setEditingItems(p => ({ ...p, [item.id]: true }))} className="p-1 text-white/20 hover:text-white rounded transition-all">
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                    )}
                                    <button onClick={() => removeItem(item.id)} className="p-1 text-white/20 hover:text-rose-400 rounded transition-all">
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
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
                          <span className="text-sm font-mono font-bold text-emerald-400">{formatCurrency(items.filter(i => i.type === 'expense_pagamento').reduce((a, c) => a + (Number(c.pagamento) || 0), 0))}</span>
                        </div>
                      </div>

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
                              <div key={item.id} className={`flex flex-col transition-all group ${isEdit ? 'bg-indigo-500/5' : 'hover:bg-white/3'} ${sentShares.some(s => s.source_item_id === item.id) ? 'border-l-2 border-indigo-500' : ''}`}>
                                {sentShares.filter(s => s.source_item_id === item.id).map(s => (
                                  <div key={s.id} className="flex items-center gap-2 px-3 pt-1.5 text-[9px] opacity-70">
                                    <span className={`px-1 rounded-sm font-bold border ${s.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : s.status === 'rejected' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}`}>
                                      {s.status === 'pending' ? 'AGUARDANDO' : s.status === 'accepted' ? 'ACEITO' : 'RECUSADO'}
                                    </span>
                                    <span className="text-white/40 italic">Dividido com {s.target_email || s.to_user_id}</span>
                                    <span className="text-white/40">Minha parte: <span className="text-indigo-400">{formatCurrency(Number(item.vale) - Number(s.share_value))}</span></span>
                                  </div>
                                ))}

                                <div className="flex items-center gap-2 px-3 py-2">
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

                                  <div className="flex gap-1 items-center bg-black/40 px-1.5 py-0.5 rounded-lg border border-white/5 shadow-xl shrink-0 opacity-0 group-hover:opacity-100 transition-all">
                                    <button onClick={() => toggleRecurring(item)} className={`p-1 rounded transition-all ${item.is_recurring ? 'text-indigo-400 bg-indigo-500/10' : 'text-white/20 hover:text-white'}`} title="Recorrente">
                                      <Repeat className="w-3 h-3" />
                                    </button>
                                    <button 
                                      onClick={() => { setShareModal({ item }); setShareValue(String((Number(item.vale) || 0) / 2)); }} 
                                      className={`p-1 transition-all rounded ${isShared(item.id, sentShares) ? 'text-emerald-400' : 'text-white/20 hover:text-indigo-400'}`}
                                      title={isShared(item.id, sentShares) ? "Já compartilhado" : "Compartilhar"}
                                    >
                                      <Share2 className="w-3 h-3" />
                                    </button>
                                    {isEdit ? (
                                      <button onClick={() => saveItem(item)} className="p-1 bg-emerald-500/20 text-emerald-400 rounded">
                                        <Check className="w-3 h-3" />
                                      </button>
                                    ) : (
                                      <button onClick={() => setEditingItems(p => ({ ...p, [item.id]: true }))} className="p-1 text-white/20 hover:text-white rounded transition-all">
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                    )}
                                    <button onClick={() => removeItem(item.id)} className="p-1 text-white/20 hover:text-rose-400 rounded transition-all">
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
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
                          <span className="text-sm font-mono font-bold text-indigo-400">{formatCurrency(items.filter(i => i.type === 'expense_vale').reduce((a, c) => a + (Number(c.vale) || 0), 0))}</span>
                        </div>
                      </div>

                      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-xl flex flex-col">
                        <div className="px-4 py-3 border-b border-white/5 flex justify-between items-center bg-white/3">
                          <span className="text-xs font-bold text-white/60 flex items-center gap-1.5">
                            <CreditCard className="w-3.5 h-3.5" /> Cartões
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
                            const baseVal = Number(item[amountField as keyof ItemRecord] || 0);
                            const expsSum = expenses.reduce((s, e) => s + Number(e.value || 0), 0);
                            const displayTotal = baseVal + expsSum;

                            return (
                              <div key={item.id} className="border-b border-white/5 last:border-0">
                                <div className={`flex flex-col transition-all group ${isEdit ? 'bg-white/5' : 'hover:bg-white/3'} ${sentShares.some(s => s.source_item_id === item.id) ? 'border-l-2 border-indigo-500' : ''}`}>
                                  {sentShares.filter(s => s.source_item_id === item.id).map(s => (
                                    <div key={s.id} className="flex items-center gap-2 px-3 pt-1.5 text-[9px] opacity-70">
                                      <span className={`px-1 rounded-sm font-bold border ${s.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : s.status === 'rejected' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}`}>
                                        {s.status === 'pending' ? 'AGUARDANDO' : s.status === 'accepted' ? 'ACEITO' : 'RECUSADO'}
                                      </span>
                                      <span className="text-white/40 italic">Dividido com {s.target_email || s.to_user_id}</span>
                                      <span className="text-white/40">
                                        Minha parte:{' '}
                                        <span className={isPagamento ? 'text-emerald-400' : 'text-indigo-400'}>
                                          {formatCurrency(displayTotal - Number(s.share_value))}
                                        </span>
                                      </span>
                                    </div>
                                  ))}

                                  <div className="flex items-center gap-2 px-3 py-2.5 transition-all">
                                    <button onClick={() => toggleExpandCard(item.id)} className={`p-0.5 rounded transition-all shrink-0 ${isExpanded ? 'text-white/60' : 'text-white/20 hover:text-white/60'}`}>
                                      <ChevronRight className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                                    </button>

                                    <input
                                      type="text"
                                      value={item.name}
                                      onChange={(e) => updateItemLocal(item.id, 'name', e.target.value)}
                                      readOnly={!isEdit}
                                      className="flex-1 bg-transparent text-xs font-medium text-white/80 outline-none min-w-0"
                                      placeholder="Nome do cartão"
                                    />

                                    <select
                                      value={isPagamento ? 'pagamento' : 'vale'}
                                      onChange={(e) => updateCardSource(item, e.target.value as 'pagamento' | 'vale')}
                                      disabled={!isEdit}
                                      className={`text-[10px] font-bold outline-none appearance-none cursor-pointer rounded px-1.5 py-0.5 border transition-all ${isPagamento ? 'bg-emerald-500/15 border-emerald-500/20 text-emerald-400' : 'bg-indigo-500/15 border-indigo-500/20 text-indigo-400'}`}
                                    >
                                      <option value="pagamento" className="bg-[#0f1115]">Pgto</option>
                                      <option value="vale" className="bg-[#0f1115]">Adto</option>
                                    </select>

                                    <span className="text-white/30 text-[10px]">R$</span>

                                    {hasExpenses ? (
                                      <span className={`w-20 text-xs font-mono font-bold text-right ${isPagamento ? 'text-emerald-400' : 'text-indigo-400'}`}>
                                        {formatCurrency(displayTotal).replace('R$\u00a0', '')}
                                      </span>
                                    ) : (
                                      <input
                                        type="number"
                                        value={(item[amountField as keyof ItemRecord] as number) || ''}
                                        onChange={(e) => updateItemLocal(item.id, amountField, e.target.value)}
                                        readOnly={!isEdit}
                                        className={`w-16 bg-transparent text-xs font-mono text-right outline-none ${isPagamento ? 'text-emerald-400' : 'text-indigo-400'}`}
                                      />
                                    )}

                                    <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-all">
                                      <button onClick={() => toggleRecurring(item)} className={`p-1 rounded ${item.is_recurring ? 'text-emerald-400 bg-emerald-500/10' : 'text-white/20'}`} title="Recorrente">
                                        <Repeat className="w-3 h-3" />
                                      </button>
                                      <button 
                                        onClick={() => { setShareModal({ item }); setShareValue(String(displayTotal / 2)); }} 
                                        className={`p-1 transition-all rounded ${isShared(item.id, sentShares) ? 'text-emerald-400' : 'text-white/20 hover:text-indigo-400'}`}
                                        title={isShared(item.id, sentShares) ? "Já compartilhado" : "Compartilhar"}
                                      >
                                        <Share2 className="w-3 h-3" />
                                      </button>
                                      {isEdit ? (
                                        <button onClick={() => saveItem(item)} className="p-1 bg-emerald-500/20 text-emerald-400 rounded">
                                          <Check className="w-3 h-3" />
                                        </button>
                                      ) : (
                                        <button onClick={() => setEditingItems(p => ({ ...p, [item.id]: true }))} className="p-1 text-white/20 hover:text-white">
                                          <Edit2 className="w-3 h-3" />
                                        </button>
                                      )}
                                      <button onClick={() => removeItem(item.id)} className="p-1 text-white/20 hover:text-rose-400">
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>

                                  {isExpanded && (
                                    <div className="bg-black/30 border-t border-white/5 divide-y divide-white/5">
                                      {expenses.map(exp => {
                                        const isExpEdit = editingCardExpenses[exp.id];

                                        return (
                                          <div key={exp.id} className="flex items-center gap-2 pl-8 pr-3 py-2 group">
                                            <input
                                              type="text"
                                              value={exp.name}
                                              onChange={(e) => updateCardExpenseLocal(item.id, exp.id, 'name', e.target.value)}
                                              readOnly={!isExpEdit}
                                              className="flex-1 bg-transparent text-[11px] text-white/70 outline-none"
                                              placeholder="Compra"
                                            />
                                            <span className="text-white/20 text-[10px]">R$</span>
                                            <input
                                              type="number"
                                              value={exp.value || ''}
                                              onChange={(e) => updateCardExpenseLocal(item.id, exp.id, 'value', e.target.value)}
                                              readOnly={!isExpEdit}
                                              className="w-16 bg-transparent text-[11px] font-mono text-right outline-none text-white/90"
                                            />
                                            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                                              <button onClick={() => toggleRecurringCardExpense(item.id, exp)} className={`p-1 rounded ${exp.is_recurring ? 'text-emerald-400 bg-emerald-500/10' : 'text-white/20'}`} title="Recorrente">
                                                <Repeat className="w-2.5 h-2.5" />
                                              </button>
                                              <button 
                                                onClick={() => { setShareModal({ item: exp, isCardExp: true }); setShareValue(String((Number(exp.value) || 0) / 2)); }} 
                                                className={`p-1 transition-all rounded ${isShared(exp.id, sentShares) ? 'text-emerald-400' : 'text-white/20 hover:text-indigo-400'}`}
                                                title={isShared(exp.id, sentShares) ? "Já compartilhado" : "Compartilhar"}
                                              >
                                                <Share2 className="w-2.5 h-2.5" />
                                              </button>

                                              {isExpEdit ? (
                                                <button onClick={() => saveCardExpense(item, exp)} className="p-1 bg-emerald-500/20 text-emerald-400 rounded">
                                                  <Check className="w-2.5 h-2.5" />
                                                </button>
                                              ) : (
                                                <button onClick={() => setEditingCardExpenses(p => ({ ...p, [exp.id]: true }))} className="p-1 text-white/20">
                                                  <Edit2 className="w-2.5 h-2.5" />
                                                </button>
                                              )}

                                              <button onClick={() => removeCardExpense(item, exp.id)} className="p-1 text-white/20 hover:text-rose-400">
                                                <Trash2 className="w-2.5 h-2.5" />
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })}

                                      <button onClick={() => addCardExpense(item)} className="px-8 py-2 text-[10px] text-white/30 hover:text-white transition-all flex items-center gap-1">
                                        <Plus className="w-3 h-3" /> Adicionar compra
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}

                          {items.filter(i => i.type.startsWith('card_')).length === 0 && (
                            <div className="px-3 py-4 text-center text-white/20 text-xs">Nenhum cartão</div>
                          )}
                        </div>

                        <div className="px-4 py-2.5 border-t border-white/5 bg-black/20 flex justify-between items-center">
                          <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">Total</span>
                          <span className="text-sm font-mono font-bold text-white/70">
                            {formatCurrency(
                              items
                                .filter(i => i.type.startsWith('card_'))
                                .reduce((a, c) => {
                                  const base = (Number(c.pagamento) || 0) + (Number(c.vale) || 0);
                                  const expensesTotal = (cardExpenses[c.id] || []).reduce((s, e) => s + Number(e.value || 0), 0);
                                  return a + base + expensesTotal;
                                }, 0),
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeView === 'settings' && userProfile?.role === 'admin' && (
          <div className="flex-1 overflow-y-auto p-3 lg:p-6 pb-20 lg:pb-6 relative z-10 custom-scrollbar">
            <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-violet-500/10 border border-violet-500/20 rounded-xl">
                  <Shield className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <h2 className="font-extrabold text-lg">Painel Administrativo</h2>
                  <p className="text-white/40 text-xs">Gerencie usuários do ZimFinance</p>
                </div>
              </div>

              <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-white/5">
                  <UserPlus className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-sm">Criar Novo Usuário</span>
                </div>

                <div className="p-5 space-y-4">
                  {adminMsg && (
                    <div className={`p-3 rounded-xl text-sm font-medium border ${adminMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                      {adminMsg.text}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Nome</label>
                      <input
                        type="text"
                        value={newUserName}
                        onChange={e => setNewUserName(e.target.value)}
                        placeholder="Nome do usuário"
                        className="w-full bg-black/20 border border-white/10 focus:border-emerald-500 p-2.5 rounded-xl text-sm text-white outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">E-mail *</label>
                      <input
                        type="email"
                        value={newUserEmail}
                        onChange={e => setNewUserEmail(e.target.value)}
                        placeholder="email@exemplo.com"
                        className="w-full bg-black/20 border border-white/10 focus:border-emerald-500 p-2.5 rounded-xl text-sm text-white outline-none transition-all"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Senha *</label>
                      <input
                        type="password"
                        value={newUserPassword}
                        onChange={e => setNewUserPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="w-full bg-black/20 border border-white/10 focus:border-emerald-500 p-2.5 rounded-xl text-sm text-white outline-none transition-all"
                      />
                    </div>
                  </div>

                  <button
                    onClick={createAdminUser}
                    disabled={adminLoading}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold py-3 rounded-xl hover:from-emerald-400 hover:to-emerald-500 transition-all disabled:opacity-50"
                  >
                    {adminLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                    Criar Usuário
                  </button>
                </div>
              </div>

              <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-white/5">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <span className="font-bold text-sm">Usuários Cadastrados</span>
                  <span className="ml-auto text-xs text-white/30 font-mono">{adminUsers.length}</span>
                </div>

                {adminLoading && adminUsers.length === 0 ? (
                  <div className="p-8 flex justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {adminUsers.map(u => (
                      <div key={u.id} className="flex items-center px-5 py-3.5 gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500/30 to-indigo-500/30 border border-white/10 flex items-center justify-center text-xs font-bold text-white/70 flex-shrink-0">
                          {(u.display_name || u.email).charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white truncate">{u.display_name || u.email.split('@')[0]}</p>
                          <p className="text-xs text-white/40 truncate">{u.email}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${u.role === 'admin' ? 'bg-violet-500/20 text-violet-400 border border-violet-500/20' : 'bg-white/5 text-white/40 border border-white/10'}`}>
                          {u.role === 'admin' ? 'Admin' : 'User'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {shareModal && (() => {
          const isCardExp = shareModal.isCardExp;
          const item = shareModal.item;
          
          const modalTotal = isCardExp 
            ? (item as CardExpense).value || 0
            : (() => {
                const rec = item as ItemRecord;
                if (rec.type.startsWith('card_')) {
                  const isPagamento = rec.type === 'card_pagamento';
                  const baseVal = Number(rec[isPagamento ? 'pagamento' : 'vale'] || 0);
                  const exps = cardExpenses[rec.id] || [];
                  const expsSum = exps.reduce((s, e) => s + Number(e.value || 0), 0);
                  return baseVal + expsSum;
                }
                return (Number(rec.pagamento) || 0) + (Number(rec.vale) || 0);
              })();

          const modalType = isCardExp
            ? (items.find(i => i.id === (item as CardExpense).card_item_id)?.type.includes('pagamento') ? 'Pagamento' : 'Adiantamento')
            : ((item as ItemRecord).type?.includes('pagamento') ? 'Pagamento' : 'Adiantamento');

          return (
            <>
              <div
                className="fixed inset-0 bg-black/70 z-[80] backdrop-blur-sm"
                onClick={() => {
                  setShareModal(null);
                  setShareEmail('');
                  setShareValue('');
                  setShareMsg(null);
                }}
              />

              <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
                <div className="bg-[#1a1d23] border border-white/10 rounded-3xl w-full max-w-sm shadow-2xl">
                  <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10">
                    <div className="p-2 bg-indigo-500/10 rounded-xl">
                      <Share2 className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">Compartilhar Despesa</h3>
                      <p className="text-white/40 text-xs truncate max-w-[180px]">{item.name || 'Sem nome'}</p>
                    </div>
                    <button
                      onClick={() => {
                        setShareModal(null);
                        setShareEmail('');
                        setShareValue('');
                        setShareMsg(null);
                      }}
                      className="ml-auto p-1.5 text-white/40 hover:text-white rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-6 space-y-4">
                    {shareMsg && (
                      <div className={`p-3 rounded-xl text-xs font-medium ${shareMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {shareMsg.text}
                      </div>
                    )}

                    <div className="bg-white/3 border border-white/8 rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Valor total</p>
                        <p className="text-lg font-mono font-bold text-white">
                          {formatCurrency(modalTotal)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Conta</p>
                        <p className="text-xs font-bold text-indigo-400">
                          {modalType}
                        </p>
                      </div>
                    </div>

                  <div>
                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">E-mail do usuário</label>
                    <input
                      type="email"
                      value={shareEmail}
                      onChange={e => setShareEmail(e.target.value)}
                      placeholder="email@exemplo.com"
                      className="w-full bg-black/20 border border-white/10 focus:border-indigo-500 p-3 rounded-xl text-sm text-white outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Valor que ele(a) vai pagar</label>
                    <input
                      type="number"
                      value={shareValue}
                      onChange={e => setShareValue(e.target.value)}
                      placeholder="0,00"
                      min="0"
                      step="0.01"
                      className="w-full bg-black/20 border border-white/10 focus:border-indigo-500 p-3 rounded-xl text-sm text-white outline-none transition-all"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShareModal(null);
                        setShareEmail('');
                        setShareValue('');
                        setShareMsg(null);
                      }}
                      className="flex-1 py-3 rounded-xl border border-white/10 text-white/50 text-sm font-bold hover:bg-white/5 transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={sendExpenseShare}
                      disabled={shareLoading}
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white text-sm font-bold hover:from-indigo-400 hover:to-indigo-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {shareLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                      Compartilhar
                    </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          );
        })()}

        {recurrenceModal && (() => {
          const item = recurrenceModal.item;
          return (
            <>
              <div
                className="fixed inset-0 bg-black/70 z-[80] backdrop-blur-sm"
                onClick={() => setRecurrenceModal(null)}
              />

              <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
                <div className="bg-[#1a1d23] border border-white/10 rounded-3xl w-full max-w-sm shadow-2xl">
                  <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10">
                    <div className="p-2 bg-emerald-500/10 rounded-xl">
                      <Repeat className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">Configurar Recorrência</h3>
                      <p className="text-white/40 text-xs truncate max-w-[180px]">{item.name || 'Sem nome'}</p>
                    </div>
                    <button
                      onClick={() => setRecurrenceModal(null)}
                      className="ml-auto p-1.5 text-white/40 hover:text-white rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Tipo de Recorrência</label>
                      <div className="grid grid-cols-2 gap-2 bg-black/20 p-1 rounded-xl border border-white/5">
                        <button
                          type="button"
                          onClick={() => setRecType('continuous')}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                            recType === 'continuous'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'text-white/40 hover:text-white border border-transparent'
                          }`}
                        >
                          Indefinida
                        </button>
                        <button
                          type="button"
                          onClick={() => setRecType('limited')}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                            recType === 'limited'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'text-white/40 hover:text-white border border-transparent'
                          }`}
                        >
                          Prazo Limite
                        </button>
                      </div>
                    </div>

                    {recType === 'limited' && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Válido até o mês</label>
                          <select
                            value={recTargetMonth}
                            onChange={(e) => setRecTargetMonth(Number(e.target.value))}
                            className="w-full bg-black/20 border border-white/10 focus:border-emerald-500 p-3 rounded-xl text-sm text-white outline-none transition-all"
                          >
                            {MONTH_NAMES.map((name, idx) => (
                              <option key={idx} value={idx + 1} className="bg-[#1a1d23] text-white">
                                {name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Ano limite</label>
                          <select
                            value={recTargetYear}
                            onChange={(e) => setRecTargetYear(Number(e.target.value))}
                            className="w-full bg-black/20 border border-white/10 focus:border-emerald-500 p-3 rounded-xl text-sm text-white outline-none transition-all"
                          >
                            {Array.from({ length: 6 }, (_, i) => currentYear + i).map((year) => (
                              <option key={year} value={year} className="bg-[#1a1d23] text-white">
                                {year}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {recLoading && (
                      <div className="space-y-2 py-1">
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500/40 rounded-full animate-pulse" style={{ width: '100%' }} />
                        </div>
                        <p className="text-[10px] text-white/30 text-center">Aplicando recorrência nos meses...</p>
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => setRecurrenceModal(null)}
                        disabled={recLoading}
                        className="flex-1 py-3 rounded-xl border border-white/10 text-white/50 text-sm font-bold hover:bg-white/5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={saveRecurrenceConfig}
                        disabled={recLoading}
                        className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-bold hover:from-emerald-400 hover:to-emerald-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {recLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Repeat className="w-4 h-4" />}
                        {recLoading ? 'Salvando...' : 'Salvar'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          );
        })()}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 lg:hidden z-50 bg-[#0f1115]/95 backdrop-blur-2xl border-t border-white/10">
        <div className="flex items-center justify-around h-14">
          <button
            onClick={() => setActiveView('dashboard')}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-all ${activeView === 'dashboard' ? 'text-emerald-400' : 'text-white/40'}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-0.5">Dashboard</span>
          </button>

          <button
            onClick={() => setActiveView('lancamentos')}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-all ${activeView === 'lancamentos' ? 'text-emerald-400' : 'text-white/40'}`}
          >
            <Receipt className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-0.5">Lançamentos</span>
          </button>

          {userProfile?.role === 'admin' && (
            <button
              onClick={() => {
                setActiveView('settings');
                loadAdminUsers();
              }}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-all ${activeView === 'settings' ? 'text-violet-400' : 'text-white/40'}`}
            >
              <Settings className="w-5 h-5" />
              <span className="text-[10px] font-bold mt-0.5">Admin</span>
            </button>
          )}

          <button
            onClick={handleLogout}
            className="flex flex-col items-center justify-center flex-1 h-full text-white/40 hover:text-rose-400 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-0.5">Sair</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
