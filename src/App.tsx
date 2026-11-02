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
  Download,
  Smartphone,
  Landmark,
} from 'lucide-react';
import { supabase } from './lib/supabaseClient';
import { QuickEntryInput } from './components/QuickEntryInput';
import { CardFormValues, CardManagementModal } from './components/CardManagementModal';
import { AccountingSource, addMonths, Card, getInvoiceMonth, isCardActiveInMonth, moveBaseAmount, splitInstallments } from './lib/cards';
import { ParsedExpense } from './lib/nlpParser';
import { SAVE_ERROR_EVENT } from './lib/saveErrors';
import { Category, DEFAULT_CATEGORIES, findCategory, groupByCategory, OTHER_CATEGORY, suggestCategory } from './lib/categories';
import { CategoryIcon, CategoryManagerModal, CategorySelect } from './components/CategoryControls';
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
  '#00D09E',
  '#0068FF',
  '#6DB6FE',
  '#093030',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
  '#F97316',
  '#64748B',
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
  is_paid?: boolean;
  closing_day?: number | null;
  due_day?: number | null;
  card_id?: string | null;
  category?: string | null;
};

type CardExpense = {
  id: string;
  card_item_id: string;
  name: string;
  value: number;
  is_recurring?: boolean;
  recurring_group_id?: string;
  is_paid?: boolean;
  purchase_date?: string | null;
  category?: string | null;
  installment_group_id?: string | null;
  installment_number?: number | null;
  installment_total?: number | null;
  // Campo do formulário: quantidade de parcelas ainda não gravada
  installments_input?: string | number;
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
  const [yearItems, setYearItems] = useState<ItemRecord[]>([]);
  const [yearCardExpenses, setYearCardExpenses] = useState<{ [cardId: string]: CardExpense[] }>({});
  const [expensePieMode, setExpensePieMode] = useState<'month' | 'ytd' | 'year'>('month');
  const [annualTotals, setAnnualTotals] = useState<AnnualTotals>({ income: 0, expense: 0, balance: 0 });
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeView, setActiveView] = useState<'dashboard' | 'lancamentos' | 'settings'>('dashboard');
  const [isCardModalOpen, setCardModalOpen] = useState(false);
  const [cards, setCards] = useState<Card[]>([]);
  const [saveFailed, setSaveFailed] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [customCategories, setCustomCategories] = useState<Category[]>([]);
  const [isCategoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryTarget, setCategoryTarget] = useState<((categoryId: string) => void) | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [lancamentosTab, setLancamentosTab] = useState<'pagamento' | 'vale' | 'cartoes'>('pagamento');
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

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);


  const currentMonthId = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}`;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // PWA Install Prompt Listener
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Check iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const triggerInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else if (isIOS) {
      setShowIOSModal(true);
    } else {
      alert("Para instalar o ZimFinance no seu dispositivo, acesse pelo navegador do seu celular e selecione 'Adicionar à Tela de Início' no menu do navegador.");
    }
  };

  useEffect(() => {
    const handleSaveError = () => setSaveFailed(true);
    window.addEventListener(SAVE_ERROR_EVENT, handleSaveError);
    return () => window.removeEventListener(SAVE_ERROR_EVENT, handleSaveError);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchData();
      fetchYearData();
      loadUserProfile();
      loadNotifications();
      loadCategories();

      const interval = setInterval(loadNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [currentMonthId, session?.user?.id]);

  const loadCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('id, name, icon')
      .order('created_at', { ascending: true });

    if (data) setCustomCategories(data as Category[]);
  };

  const openCategoryManager = (target?: (categoryId: string) => void) => {
    setCategoryTarget(() => target ?? null);
    setCategoryModalOpen(true);
  };

  const createCategory = async (name: string, icon: string) => {
    const category: Category = { id: Math.random().toString(36).substr(2, 9), name, icon };
    setCustomCategories(prev => [...prev, category]);
    await supabase.from('categories').insert(category);

    if (categoryTarget) {
      categoryTarget(category.id);
      setCategoryTarget(null);
      setCategoryModalOpen(false);
    }
  };

  const deleteCategory = async (id: string) => {
    const category = customCategories.find(c => c.id === id);
    if (!category || !window.confirm(`Excluir a categoria ${category.name}? Os lançamentos dela passam para Outros.`)) return;

    setCustomCategories(prev => prev.filter(c => c.id !== id));
    await supabase.from('items').update({ category: null }).eq('category', id);
    await supabase.from('card_expenses').update({ category: null }).eq('category', id);
    await supabase.from('categories').delete().eq('id', id);
    fetchData();
    fetchYearData();
  };

  // Recorrentes mudam deste mês em diante; os anteriores ficam como estão
  const changeItemCategory = async (item: ItemRecord, category: string | null) => {
    setItems(prev => prev.map(i => (i.id === item.id ? { ...i, category } : i)));
    await supabase.from('items').update({ category }).eq('id', item.id);

    if (item.is_recurring && item.recurring_group_id) {
      await supabase
        .from('items')
        .update({ category })
        .eq('recurring_group_id', item.recurring_group_id)
        .gt('month_id', currentMonthId);
    }

    fetchYearData();
  };

  // Compras recorrentes mudam nos próximos meses, e parcelas nas próximas parcelas
  const changeExpenseCategory = async (cardId: string, exp: CardExpense, category: string | null) => {
    setCardExpenses(prev => ({
      ...prev,
      [cardId]: (prev[cardId] || []).map(e => (e.id === exp.id ? { ...e, category } : e)),
    }));
    await supabase.from('card_expenses').update({ category }).eq('id', exp.id);

    if (exp.installment_group_id) {
      await supabase
        .from('card_expenses')
        .update({ category })
        .eq('installment_group_id', exp.installment_group_id)
        .gt('installment_number', exp.installment_number ?? 1);
    } else if (exp.is_recurring && exp.recurring_group_id) {
      const { data: related } = await supabase
        .from('card_expenses')
        .select('id, card_item_id')
        .eq('recurring_group_id', exp.recurring_group_id);
      const { data: relatedCards } = await supabase
        .from('items')
        .select('id')
        .in('id', (related || []).map(e => e.card_item_id))
        .gt('month_id', currentMonthId);
      const futureCardIds = (relatedCards || []).map(c => c.id);
      const futureIds = (related || []).filter(e => futureCardIds.includes(e.card_item_id)).map(e => e.id);

      if (futureIds.length > 0) {
        await supabase.from('card_expenses').update({ category }).in('id', futureIds);
      }
    }

    fetchYearData();
  };

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
        await supabase.from('months').upsert(
          {
            id: share.source_month_id,
            user_id: session.user.id,
            year: parseInt(y, 10),
            month_name: MONTH_NAMES[parseInt(m, 10) - 1],
          },
          { ignoreDuplicates: true },
        );
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
        category: suggestCategory(share.expense_name),
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

    let yearExpenses: { [cardId: string]: CardExpense[] } = {};

    if (allItems) {
      setYearItems(allItems as ItemRecord[]);
      const cardIds = allItems.filter(i => i.type.startsWith('card_')).map(i => i.id);
      if (cardIds.length > 0) {
        const { data: allCardExps } = await supabase
          .from('card_expenses')
          .select('*')
          .in('card_item_id', cardIds);

        if (allCardExps) {
          const expMap: { [cardId: string]: CardExpense[] } = {};
          allCardExps.forEach(e => {
            if (!expMap[e.card_item_id]) expMap[e.card_item_id] = [];
            expMap[e.card_item_id].push(e as CardExpense);
          });
          yearExpenses = expMap;
          setYearCardExpenses(expMap);
        }
      } else {
        setYearCardExpenses({});
      }
    }

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
        (acc, curr) =>
          acc +
          (Number(curr.pagamento) || 0) +
          (Number(curr.vale) || 0) +
          (yearExpenses[curr.id] || []).reduce((sum, e) => sum + (Number(e.value) || 0), 0),
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

  // Copia os recorrentes do último mês existente; cartões cadastrados são tratados em syncCardsIntoMonth
  const copyRecurringItems = async () => {
    const { data: previousMonth } = await supabase
      .from('months')
      .select('id')
      .lt('id', currentMonthId)
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (previousMonth) {
      const { data: recurringItems } = await supabase
        .from('items')
        .select('*')
        .eq('month_id', previousMonth.id)
        .eq('is_recurring', true)
        .is('card_id', null);

      const { data: existingItems } = await supabase
        .from('items')
        .select('recurring_group_id')
        .eq('month_id', currentMonthId);
      const existingGroups = new Set((existingItems || []).map(i => i.recurring_group_id).filter(Boolean));

      for (const { created_at, ...item } of recurringItems || []) {
        if (item.recurring_group_id && existingGroups.has(item.recurring_group_id)) continue;

        const newItemId = Math.random().toString(36).substr(2, 9);

        await supabase.from('items').insert({
          ...item,
          id: newItemId,
          month_id: currentMonthId,
          is_paid: false,
        });

        if (item.type.startsWith('card_')) {
          await copyRecurringCardExpenses(item.id, newItemId);
        }
      }
    }

    await supabase.from('months').update({ recurring_synced: true }).eq('id', currentMonthId);
  };

  const copyRecurringCardExpenses = async (fromItemId: string, toItemId: string) => {
    const { data: recurringCardExps } = await supabase
      .from('card_expenses')
      .select('*')
      .eq('card_item_id', fromItemId)
      .eq('is_recurring', true);

    if (recurringCardExps && recurringCardExps.length > 0) {
      await supabase.from('card_expenses').insert(
        recurringCardExps.map(({ created_at, ...ce }) => ({
          ...ce,
          id: Math.random().toString(36).substr(2, 9),
          card_item_id: toItemId,
          is_paid: false,
          purchase_date: null,
        })),
      );
    }
  };

  // Garante que cada cartão ativo tenha sua linha no mês aberto
  const syncCardsIntoMonth = async () => {
    const { data: allCards, error } = await supabase
      .from('cards')
      .select('*')
      .order('created_at', { ascending: true });

    if (error || !allCards) return;
    setCards(allCards as Card[]);

    const activeCards = (allCards as Card[]).filter(card => isCardActiveInMonth(card, currentMonthId));
    if (activeCards.length === 0) return;

    const { data: existing } = await supabase
      .from('items')
      .select('card_id')
      .eq('month_id', currentMonthId)
      .not('card_id', 'is', null);
    const existingCardIds = new Set((existing || []).map(i => i.card_id));

    for (const card of activeCards) {
      if (!existingCardIds.has(card.id)) {
        await createCardInstance(card, currentMonthId);
      }
    }
  };

  const createCardInstance = async (card: Card, monthId: string): Promise<string | null> => {
    const { data: previous } = await supabase
      .from('items')
      .select('*')
      .eq('card_id', card.id)
      .lt('month_id', monthId)
      .order('month_id', { ascending: false })
      .limit(1)
      .maybeSingle();

    // O valor base só se repete quando o usuário marcou o cartão como recorrente
    const base = previous?.is_recurring ? Math.max(Number(previous.pagamento) || 0, Number(previous.vale) || 0) : 0;
    const newItemId = Math.random().toString(36).substr(2, 9);

    const { data: inserted, error } = await supabase
      .from('items')
      .upsert(
        {
          id: newItemId,
          month_id: monthId,
          card_id: card.id,
          type: `card_${card.accounting_source}`,
          name: card.name,
          pagamento: card.accounting_source === 'pagamento' ? base : 0,
          vale: card.accounting_source === 'vale' ? base : 0,
          closing_day: card.closing_day,
          due_day: card.due_day,
          is_recurring: previous?.is_recurring ?? false,
          recurring_group_id: previous?.recurring_group_id ?? null,
        },
        { onConflict: 'card_id,month_id', ignoreDuplicates: true },
      )
      .select('id');

    if (error) {
      console.error('Error creating card in month:', error);
      return null;
    }

    // Sem linha retornada, outra aba já criou o cartão neste mês
    if (!inserted || inserted.length === 0) {
      const { data: current } = await supabase
        .from('items')
        .select('id')
        .eq('card_id', card.id)
        .eq('month_id', monthId)
        .maybeSingle();
      return current?.id ?? null;
    }

    if (previous) {
      await copyRecurringCardExpenses(previous.id, newItemId);
    }

    return newItemId;
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
        .upsert(
          {
            id: currentMonthId,
            user_id: session.user.id,
            year: currentYear,
            month_name: MONTH_NAMES[currentMonthIndex],
          },
          { ignoreDuplicates: true },
        )
        .select();

      monthData = newMonth?.[0] ?? null;

      setIncome({ pagamento: 0, vale: 0, ferias: 0, decimoTerceiro: 0 });
      await copyRecurringItems();
    } else if (monthData) {
      setIncome({
        pagamento: monthData.income_pagamento || 0,
        vale: monthData.income_vale || 0,
        ferias: monthData.income_ferias || 0,
        decimoTerceiro: monthData.income_decimo_terceiro || 0,
      });

      if (monthData.recurring_synced === false) {
        await copyRecurringItems();
      }
    }

    await syncCardsIntoMonth();

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

  const saveItem = async (original: ItemRecord) => {
    // O nome só é conhecido ao salvar, então a sugestão de categoria entra aqui
    const item = original.type.startsWith('expense_') && !original.category
      ? { ...original, category: suggestCategory(original.name) }
      : original;
    if (item !== original) {
      setItems(prev => prev.map(i => (i.id === item.id ? { ...i, category: item.category } : i)));
    }

    if (item.card_id) {
      setCards(prev => prev.map(c => (c.id === item.card_id ? { ...c, name: item.name } : c)));
      await supabase.from('cards').update({ name: item.name }).eq('id', item.card_id);
      await supabase
        .from('items')
        .update({ name: item.name })
        .eq('card_id', item.card_id)
        .gt('month_id', currentMonthId);
    }

    await supabase
      .from('items')
      .update({
        name: item.name,
        pagamento: item.pagamento,
        vale: item.vale,
        type: item.type,
        closing_day: item.closing_day,
        due_day: item.due_day,
        category: item.category,
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
          closing_day: item.closing_day,
          due_day: item.due_day,
          category: item.category,
        })
        .eq('recurring_group_id', item.recurring_group_id)
        .gt('month_id', currentMonthId);
    }

    setEditingItems(prev => ({ ...prev, [item.id]: false }));
    fetchYearData();
  };

  const changeCardSource = async (cardId: string, source: AccountingSource) => {
    setCards(prev => prev.map(c => (c.id === cardId ? { ...c, accounting_source: source } : c)));
    setItems(prev => prev.map(i => (i.card_id === cardId ? { ...i, ...moveBaseAmount(i, source) } : i)));

    await supabase.from('cards').update({ accounting_source: source }).eq('id', cardId);

    const { data: instances } = await supabase
      .from('items')
      .select('id, pagamento, vale')
      .eq('card_id', cardId)
      .gte('month_id', currentMonthId);

    for (const instance of instances || []) {
      await supabase.from('items').update(moveBaseAmount(instance, source)).eq('id', instance.id);
    }

    fetchYearData();
  };

  const updateCardSource = async (item: ItemRecord, source: 'pagamento' | 'vale') => {
    if (item.card_id) {
      await changeCardSource(item.card_id, source);
      return;
    }

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
      await supabase.from('months').upsert(
        {
          id: monthId,
          user_id: session.user.id,
          year: parseInt(y, 10),
          month_name: MONTH_NAMES[parseInt(m, 10) - 1],
        },
        { ignoreDuplicates: true },
      );
    }
  };

  const ensureCardExistsInMonth = async (cardItem: ItemRecord, targetMonthId: string): Promise<string | null> => {
    const card = cards.find(c => c.id === cardItem.card_id);
    if (card) {
      const { data: instance } = await supabase
        .from('items')
        .select('id')
        .eq('card_id', card.id)
        .eq('month_id', targetMonthId)
        .maybeSingle();
      return instance ? instance.id : createCardInstance(card, targetMonthId);
    }

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
      closing_day: cardItem.closing_day,
      due_day: cardItem.due_day,
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

  const toggleItemPaid = async (item: ItemRecord) => {
    const newStatus = !item.is_paid;
    setItems(prev => prev.map(i => (i.id === item.id ? { ...i, is_paid: newStatus } : i)));
    await supabase
      .from('items')
      .update({ is_paid: newStatus })
      .eq('id', item.id);
  };

  const toggleCardExpensePaid = async (cardId: string, exp: CardExpense) => {
    const newStatus = !exp.is_paid;
    setCardExpenses(prev => ({
      ...prev,
      [cardId]: (prev[cardId] || []).map(e => (e.id === exp.id ? { ...e, is_paid: newStatus } : e)),
    }));
    await supabase
      .from('card_expenses')
      .update({ is_paid: newStatus })
      .eq('id', exp.id);
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

  const getCardDays = (cardItem: ItemRecord) => {
    const card = cards.find(c => c.id === cardItem.card_id);
    return {
      closingDay: card?.closing_day ?? cardItem.closing_day,
      dueDay: card?.due_day ?? cardItem.due_day,
    };
  };

  const getPurchaseInvoiceMonth = (cardItem: ItemRecord, purchaseDate?: string | null) => {
    const { closingDay, dueDay } = getCardDays(cardItem);
    return purchaseDate && closingDay && dueDay
      ? getInvoiceMonth(purchaseDate, closingDay, dueDay)
      : currentMonthId;
  };

  const formatMonthId = (monthId: string) => {
    const [year, month] = monthId.split('-');
    return `${MONTH_NAMES[Number(month) - 1]}/${year}`;
  };

  // Grava a compra na fatura certa, dividindo em parcelas pelos meses seguintes
  const addCardPurchase = async (
    cardItem: ItemRecord,
    name: string,
    total: number,
    purchaseDate: string | null,
    installments = 1,
    category: string | null = suggestCategory(name),
  ) => {
    const firstMonth = getPurchaseInvoiceMonth(cardItem, purchaseDate);
    const groupId = installments > 1 ? Math.random().toString(36).substr(2, 9) : null;
    const values = splitInstallments(total, installments);

    for (let i = 0; i < installments; i++) {
      const targetMonthId = addMonths(firstMonth, i);
      await ensureMonthExists(targetMonthId);
      const targetCardId = targetMonthId === currentMonthId
        ? cardItem.id
        : await ensureCardExistsInMonth(cardItem, targetMonthId);
      if (!targetCardId) continue;

      await supabase.from('card_expenses').insert({
        id: Math.random().toString(36).substr(2, 9),
        card_item_id: targetCardId,
        name: groupId ? `${name} (${i + 1}/${installments})` : name,
        value: values[i],
        purchase_date: purchaseDate,
        category,
        installment_group_id: groupId,
        installment_number: groupId ? i + 1 : null,
        installment_total: groupId ? installments : null,
      });
    }

    setNotice(
      installments > 1
        ? `${installments} parcelas lançadas a partir da fatura de ${formatMonthId(firstMonth)}.`
        : firstMonth === currentMonthId
        ? null
        : `Compra lançada na fatura de ${formatMonthId(firstMonth)}.`,
    );
    setExpandedCards(prev => ({ ...prev, [cardItem.id]: true }));
    await fetchData();
    fetchYearData();
  };

  const handleQuickEntry = async (expense: ParsedExpense) => {
    if (!expense.amount) return;
    const desc = expense.description || 'Despesa rápida';

    const cardItem = items.find(i => i.id === expense.targetCardId);
    if (cardItem) {
      const today = new Date();
      const purchaseDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      await addCardPurchase(cardItem, desc, expense.amount, purchaseDate, Math.min(expense.installments ?? 1, 48));
      return;
    }

    const type = expense.period === 'vale' ? 'expense_vale' : 'expense_pagamento'; // default to pagamento
    const newItem = {
      id: Math.random().toString(36).substr(2, 9),
      month_id: currentMonthId,
      type,
      name: desc,
      pagamento: expense.period === 'vale' ? 0 : expense.amount,
      vale: expense.period === 'vale' ? expense.amount : 0,
      category: suggestCategory(desc),
    };
    setItems(prev => [...prev, newItem]);
    await supabase.from('items').insert(newItem);
    // Don't set to editing mode if they quickly added it, or maybe do so they can categorize
    setEditingItems(prev => ({ ...prev, [newItem.id]: true }));
    fetchYearData();
  };

  const removeItem = async (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    if (item.card_id) {
      await handleDeleteCard(item.card_id);
      return;
    }

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
      // Em outros meses a data ficaria enganosa e moveria a compra para fora da tela
      purchase_date: currentYear === realCurrentYear && currentMonthIndex === realCurrentMonth
        ? new Date().toLocaleDateString('en-CA')
        : null,
    };

    setExpandedCards(prev => ({ ...prev, [cardItem.id]: true }));
    setCardExpenses(prev => ({
      ...prev,
      [cardItem.id]: [...(prev[cardItem.id] || []), newExp],
    }));

    setEditingCardExpenses(prev => ({ ...prev, [newExp.id]: true }));
    await supabase.from('card_expenses').insert(newExp);
  };

  const handleModalAddCardExpense = (cardId: string) => {
    const card = items.find(i => i.card_id === cardId);
    if (card) {
      addCardExpense(card);
    }
  };

  const handleAddCard = async ({ name, closingDay, dueDay, source }: CardFormValues) => {
    const card: Card = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      closing_day: closingDay,
      due_day: dueDay,
      accounting_source: source,
      start_month: currentMonthId,
    };
    const newItem = {
      id: Math.random().toString(36).substr(2, 9),
      month_id: currentMonthId,
      card_id: card.id,
      type: `card_${source}`,
      name,
      pagamento: 0,
      vale: 0,
      closing_day: closingDay,
      due_day: dueDay,
    };
    setCards(prev => [...prev, card]);
    setItems(prev => [...prev, newItem]);
    await supabase.from('cards').insert(card);
    await supabase.from('items').insert(newItem);
  };

  const handleUpdateCard = async (id: string, { name, closingDay, dueDay, source }: CardFormValues) => {
    const previous = cards.find(c => c.id === id);
    const changes = { name, closing_day: closingDay, due_day: dueDay };

    setCards(prev => prev.map(c => (c.id === id ? { ...c, ...changes } : c)));
    setItems(prev => prev.map(i => (i.card_id === id ? { ...i, ...changes } : i)));

    await supabase.from('cards').update(changes).eq('id', id);
    await supabase.from('items').update(changes).eq('card_id', id).gte('month_id', currentMonthId);

    if (previous && previous.accounting_source !== source) {
      await changeCardSource(id, source);
    }
  };

  // Encerra o cartão no mês anterior: o histórico fica, e ele não volta a ser criado
  const handleDeleteCard = async (id: string) => {
    const card = cards.find(c => c.id === id);
    if (!card) return;

    const confirmed = window.confirm(
      `Excluir o cartão ${card.name} e suas compras a partir de ${formatMonthId(currentMonthId)}?\n\nOs meses anteriores não serão alterados.`,
    );
    if (!confirmed) return;

    const endMonth = addMonths(currentMonthId, -1);
    setCards(prev => prev.map(c => (c.id === id ? { ...c, end_month: endMonth } : c)));
    setItems(prev => prev.filter(i => i.card_id !== id));

    const { data: instances } = await supabase
      .from('items')
      .select('id')
      .eq('card_id', id)
      .gte('month_id', currentMonthId);
    const instanceIds = (instances || []).map(i => i.id);

    if (instanceIds.length > 0) {
      const { data: expenses } = await supabase
        .from('card_expenses')
        .select('id')
        .in('card_item_id', instanceIds);
      const expenseIds = (expenses || []).map(e => e.id);

      await supabase.from('expense_shares').delete().in('source_item_id', [...instanceIds, ...expenseIds]);
      await supabase.from('card_expenses').delete().in('card_item_id', instanceIds);
      await supabase.from('items').delete().in('id', instanceIds);
    }

    await supabase.from('cards').update({ end_month: endMonth }).eq('id', id);
    fetchYearData();
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

  const saveCardExpense = async (cardItem: ItemRecord, original: CardExpense) => {
    const exp = original.category ? original : { ...original, category: suggestCategory(original.name) };
    const installments = Math.min(Number(exp.installments_input) || 1, 48);

    if (installments > 1 && !exp.installment_group_id && !exp.is_recurring) {
      await supabase.from('card_expenses').delete().eq('id', exp.id);
      setEditingCardExpenses(prev => ({ ...prev, [exp.id]: false }));
      await addCardPurchase(cardItem, exp.name, Number(exp.value) || 0, exp.purchase_date || null, installments, exp.category);
      return;
    }

    await supabase
      .from('card_expenses')
      .update({ name: exp.name, value: Number(exp.value) || 0, purchase_date: exp.purchase_date || null, category: exp.category })
      .eq('id', exp.id);

    const invoiceMonth = getPurchaseInvoiceMonth(cardItem, exp.purchase_date);
    if (invoiceMonth !== currentMonthId && !exp.is_recurring && !exp.installment_group_id) {
      await ensureMonthExists(invoiceMonth);
      const targetCardId = await ensureCardExistsInMonth(cardItem, invoiceMonth);

      if (targetCardId) {
        await supabase.from('card_expenses').update({ card_item_id: targetCardId }).eq('id', exp.id);
        setEditingCardExpenses(prev => ({ ...prev, [exp.id]: false }));
        setCardExpenses(prev => ({
          ...prev,
          [cardItem.id]: (prev[cardItem.id] || []).filter(e => e.id !== exp.id),
        }));
        setNotice(`Compra lançada na fatura de ${formatMonthId(invoiceMonth)}.`);
        fetchYearData();
        return;
      }
    }

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
              .update({ name: exp.name, value: Number(exp.value) || 0, category: exp.category })
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

    if (exp.installment_group_id && window.confirm(
      'Excluir também as próximas parcelas desta compra?\n\n[OK] = Esta e as próximas\n[Cancelar] = Apenas esta',
    )) {
      const { data: laterParcels } = await supabase
        .from('card_expenses')
        .select('id')
        .eq('installment_group_id', exp.installment_group_id)
        .gte('installment_number', exp.installment_number ?? 1);
      const parcelIds = (laterParcels || []).map(e => e.id);

      setCardExpenses(prev => ({ ...prev, [cardItem.id]: expenses.filter(e => e.id !== expId) }));
      await supabase.from('expense_shares').delete().in('source_item_id', parcelIds);
      await supabase.from('card_expenses').delete().in('id', parcelIds);
      fetchYearData();
      return;
    }

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
                category: exp.category,
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
            .eq(rec.card_id ? 'card_id' : 'recurring_group_id', rec.card_id || groupId)
            .maybeSingle();

          if (!existingItem) {
            await supabase.from('items').insert({
              id: Math.random().toString(36).substr(2, 9),
              month_id: targetMonthId,
              type: rec.type,
              name: rec.name,
              pagamento: rec.pagamento,
              vale: rec.vale,
              card_id: rec.card_id,
              category: rec.category,
              closing_day: rec.closing_day,
              due_day: rec.due_day,
              is_recurring: !isLastMonth,
              recurring_group_id: groupId,
            });
          } else {
            await supabase
              .from('items')
              .update({
                is_recurring: !isLastMonth,
                recurring_group_id: groupId,
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

  // Parte das despesas do mês já marcada como paga
  const paidShare = useMemo(() => {
    let total = 0;
    let paid = 0;

    items.forEach(item => {
      const base = (Number(item.pagamento) || 0) + (Number(item.vale) || 0);
      const expenses = item.type.startsWith('card_') ? cardExpenses[item.id] || [] : [];
      const expensesTotal = expenses.reduce((sum, e) => sum + (Number(e.value) || 0), 0);

      total += base + expensesTotal;
      if (item.is_paid) {
        paid += base + expensesTotal;
      } else {
        paid += expenses.filter(e => e.is_paid).reduce((sum, e) => sum + (Number(e.value) || 0), 0);
      }
    });

    return total > 0 ? Math.round((paid / total) * 100) : 0;
  }, [items, cardExpenses]);

  const incomeUsed = totals.totalIncome > 0 ? Math.round((totals.totalExpenses / totals.totalIncome) * 100) : 0;

  const allCategories = useMemo(
    () => [...DEFAULT_CATEGORIES.filter(c => c.id !== OTHER_CATEGORY.id), ...customCategories, OTHER_CATEGORY],
    [customCategories],
  );

  const pieChartData = useMemo(() => {
    const sourceItems = (yearItems.length > 0 ? yearItems : items) as (ItemRecord & { month_id?: string })[];
    const isInMode = (monthId: string) =>
      expensePieMode === 'month' ? monthId === currentMonthId : expensePieMode === 'ytd' ? monthId <= currentMonthId : true;

    return groupByCategory(
      sourceItems,
      id => yearCardExpenses[id] || cardExpenses[id] || [],
      allCategories,
      currentMonthId,
    )
      .map(g => ({
        ...g,
        value: expensePieMode === 'month' ? g.monthValue : expensePieMode === 'ytd' ? g.ytdValue : g.yearValue,
        visibleEntries: g.entries.filter(e => isInMode(e.monthId)).sort((a, b) => b.value - a.value),
      }))
      .filter(g => g.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [items, cardExpenses, yearItems, yearCardExpenses, currentMonthId, expensePieMode, allCategories]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-ink" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center p-4 relative overflow-hidden">

        <div className="bg-mint p-8 rounded-[2.5rem] w-full max-w-md shadow-2xl relative z-10">
          <div className="flex flex-col items-center mb-8">
            <img src="/Logo.png" alt="ZimFinance" className="w-20 h-20 object-contain mb-4 drop-shadow-2xl" />
            <h1 className="text-3xl font-extrabold text-ink tracking-tight">ZimFinance</h1>
            <p className="text-ink/70 text-sm mt-2">Acesse seu controle financeiro</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {authError && (
              <div className="bg-rose-500/20 text-rose-700 p-3 rounded-xl text-sm text-center border border-rose-500/30">
                {authError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-ink/65 uppercase tracking-widest mb-2">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-soft border border-ink/10 focus:border-primary focus:ring-1 focus:ring-primary p-3 rounded-xl text-ink outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink/65 uppercase tracking-widest mb-2">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-soft border border-ink/10 focus:border-primary focus:ring-1 focus:ring-primary p-3 rounded-xl text-ink outline-none transition-all"
                required
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-primary text-ink font-bold py-3.5 rounded-xl hover:brightness-95 transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
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
    <div className="flex h-screen bg-mint text-ink font-sans overflow-hidden selection:bg-primary/30">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-[60] lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed lg:relative w-64 bg-white border-r border-ink/10 flex flex-col z-[70] h-full transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="h-16 lg:h-24 flex items-center justify-between px-6 lg:px-8 border-b border-ink/10">
          <div className="flex items-center">
            <img src="/Logo.png" alt="Logo" className="w-8 h-8 lg:w-10 lg:h-10 object-contain mr-3" />
            <h1 className="text-lg lg:text-xl font-extrabold tracking-tight text-ink">
              ZimFinance
            </h1>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="p-1.5 text-ink/65 hover:text-ink lg:hidden rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 lg:py-8 space-y-2">
          <button
            onClick={() => {
              setActiveView('dashboard');
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center px-4 py-3.5 rounded-2xl font-bold transition-all ${activeView === 'dashboard' ? 'bg-primary text-ink shadow-sm' : 'text-ink/70 hover:bg-soft'}`}
          >
            <LayoutDashboard className="w-5 h-5 mr-3" />
            Dashboard
          </button>

          <button
            onClick={() => {
              setActiveView('lancamentos');
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center px-4 py-3.5 rounded-2xl font-bold transition-all ${activeView === 'lancamentos' ? 'bg-primary text-ink shadow-sm' : 'text-ink/70 hover:bg-soft'}`}
          >
            <Receipt className="w-5 h-5 mr-3" />
            Lançamentos
          </button>

          <button
            onClick={() => {
              setActiveView('settings');
              setSidebarOpen(false);
              loadAdminUsers();
            }}
            className={`w-full flex items-center px-4 py-3.5 rounded-2xl font-bold transition-all ${activeView === 'settings' ? 'bg-primary text-ink shadow-sm' : 'text-ink/70 hover:bg-soft'}`}
          >
            <Settings className="w-5 h-5 mr-3" />
            Configurações
          </button>

        </nav>

        <div className="p-4 border-t border-ink/10">
          <div className="flex items-center justify-between bg-soft p-3 rounded-2xl border border-ink/10">
            <div className="flex items-center overflow-hidden">
              <div className="w-2 h-2 rounded-full bg-primary mr-2 flex-shrink-0" />
              <span className="text-xs text-ink/70 truncate pr-2">{session.user.email}</span>
            </div>
            <button onClick={handleLogout} className="p-2 bg-soft hover:bg-rose-500/20 hover:text-rose-700 rounded-xl text-ink/80 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative overflow-y-auto bg-primary custom-scrollbar">
        <header className="shrink-0 w-full max-w-[1600px] mx-auto px-4 lg:px-8 pt-4 lg:pt-6 pb-2 flex items-center justify-between gap-3 relative z-40">
          <div className="min-w-0">
            <h2 className="text-base lg:text-2xl font-bold text-ink truncate">
              {activeView === 'dashboard'
                ? `Olá, ${userProfile?.display_name || session.user.email?.split('@')[0]}`
                : activeView === 'lancamentos'
                ? 'Lançamentos'
                : 'Configurações'}
            </h2>
            <p className="hidden sm:block text-xs text-ink/70">
              {activeView === 'settings' ? 'Sua conta e preferências' : `${MONTH_NAMES[currentMonthIndex]} de ${currentYear}`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className={`${activeView === 'settings' ? 'hidden' : 'flex'} items-center gap-0.5 bg-mint px-1 py-1 rounded-full relative shadow-sm`}>
              <button
                onClick={() => {
                  if (currentMonthIndex === 0) {
                    setCurrentMonthIndex(11);
                    setCurrentYear(y => y - 1);
                  } else {
                    setCurrentMonthIndex(m => m - 1);
                  }
                }}
                className="p-1.5 text-ink/70 hover:bg-soft rounded-full transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setShowMonthPicker(p => !p)}
                className="px-2 py-1 text-xs font-bold rounded-full whitespace-nowrap hover:bg-soft transition-all cursor-pointer"
              >
                {MONTH_NAMES[currentMonthIndex].substring(0, 3)} {currentYear}
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
                className="p-1.5 text-ink/70 hover:bg-soft rounded-full transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {showMonthPicker && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMonthPicker(false)} />
                  <div className="absolute top-full right-0 mt-2 z-50 bg-white border border-ink/10 rounded-2xl p-3 shadow-2xl w-64 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between mb-2">
                      <button onClick={() => setCurrentYear(y => y - 1)} aria-label="Ano anterior" className="p-1.5 text-ink/70 hover:bg-soft rounded-full transition-colors">
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-sm font-bold text-ink">{currentYear}</span>
                      <button onClick={() => setCurrentYear(y => y + 1)} aria-label="Próximo ano" className="p-1.5 text-ink/70 hover:bg-soft rounded-full transition-colors">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
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
                            className={`px-2 py-2 rounded-xl text-xs font-bold transition-all ${isActive ? 'bg-primary text-ink' : isCurrent ? 'bg-primary/15 text-primary-dark border border-primary/30' : 'text-ink/70 hover:bg-ink/5 hover:text-ink'}`}
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
                aria-label="Notificações" className="p-2 bg-mint text-ink rounded-full shadow-sm transition-all relative"
              >
                <Bell className="w-5 h-5" />
                {notifications.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </button>

              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                  <div className="absolute right-0 top-full mt-2 z-50 w-80 bg-white border border-ink/10 rounded-2xl shadow-2xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-ink/10 flex items-center gap-2">
                      <Bell className="w-4 h-4 text-primary-dark" />
                      <span className="font-bold text-sm">Notificações</span>
                    </div>

                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-ink/65 text-sm">Nenhuma notificação pendente</div>
                    ) : (
                      <div className="max-h-80 overflow-y-auto divide-y divide-ink/5">
                        {notifications.map(n => (
                          <div key={n.id} className="p-4">
                            <p className="text-xs text-ink/70 mb-1">{n.from_user_email}</p>
                            <p className="font-bold text-sm text-ink mb-0.5">{n.expense_name}</p>
                            <div className="flex items-center gap-2 text-xs mb-3">
                              <span className="text-ink/70">Sua parte:</span>
                              <span className="text-primary-dark tabular-nums font-bold">{formatCurrency(n.share_value)}</span>
                              <span className="text-ink/65">de {formatCurrency(n.expense_value)}</span>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => respondToShare(n, true)} className="flex-1 flex items-center justify-center gap-1 bg-primary/20 hover:bg-primary/30 text-primary-dark text-xs font-bold py-2 rounded-xl transition-all">
                                <CheckCircle className="w-3.5 h-3.5" /> Aceitar
                              </button>
                              <button onClick={() => respondToShare(n, false)} className="flex-1 flex items-center justify-center gap-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 text-xs font-bold py-2 rounded-xl transition-all">
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
          <section className="shrink-0 w-full max-w-[1600px] mx-auto px-5 lg:px-8 pt-3 pb-7 text-ink">
            <div className="flex gap-4 lg:gap-8 mb-4">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-xs text-ink/80 mb-1">
                  <Wallet className="w-3.5 h-3.5 shrink-0" /> Saldo do mês
                </p>
                <p className={`text-2xl lg:text-3xl font-bold tabular-nums truncate ${totals.totalRemaining < 0 ? 'text-rose-800' : 'text-ink'}`}>
                  {formatCurrency(totals.totalRemaining)}
                </p>
              </div>
              <div className="w-px bg-ink/25" />
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-xs text-ink/80 mb-1">
                  <TrendingDown className="w-3.5 h-3.5 shrink-0" /> Total de gastos
                </p>
                <p className="text-2xl lg:text-3xl font-bold tabular-nums truncate text-brand-blue-dark">
                  {formatCurrency(totals.totalExpenses)}
                </p>
              </div>
            </div>

            <div
              role="progressbar"
              aria-label="Receita já comprometida"
              aria-valuenow={Math.min(incomeUsed, 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              className="relative h-7 rounded-full bg-mint overflow-hidden"
            >
              <div
                className={`absolute inset-y-0 left-0 rounded-full flex items-center pl-3 text-[11px] font-bold text-mint transition-all duration-500 ${incomeUsed > 100 ? 'bg-rose-700' : 'bg-ink'}`}
                style={{ width: `max(3.25rem, ${Math.min(incomeUsed, 100)}%)` }}
              >
                {incomeUsed}%
              </div>
              {incomeUsed < 75 && (
                <span className="absolute inset-y-0 right-3 flex items-center text-xs font-semibold italic text-ink tabular-nums">
                  {formatCurrency(totals.totalIncome)}
                </span>
              )}
            </div>
            <p className="flex items-center gap-1.5 mt-2 text-xs text-ink/90">
              <CheckCircle className="w-3.5 h-3.5 shrink-0" />
              {totals.totalIncome === 0
                ? 'Informe sua receita em Lançamentos para acompanhar o mês.'
                : incomeUsed > 100
                ? `Os gastos passam ${formatCurrency(-totals.totalRemaining)} da receita do mês.`
                : `${incomeUsed}% da receita de ${formatCurrency(totals.totalIncome)} já está comprometida.`}
            </p>
          </section>
        )}

        <div className="flex-[1_0_auto] bg-mint rounded-t-[2.5rem] lg:rounded-t-[3rem] relative z-10">

        {activeView !== 'settings' && (
          <div className="p-4 lg:p-8 pb-24 lg:pb-8">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto">
                <div className="bg-primary rounded-3xl p-4 lg:p-5 flex items-center gap-4 lg:gap-8 text-ink shadow-card">
                  <div className="flex flex-col items-center shrink-0 w-20 lg:w-24">
                    <div className="relative w-14 h-14 lg:w-16 lg:h-16">
                      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90" aria-hidden="true">
                        <circle cx="18" cy="18" r="15.5" fill="none" stroke="#F1FFF3" strokeWidth="3" />
                        <circle cx="18" cy="18" r="15.5" fill="none" stroke="#0052CC" strokeWidth="3" strokeLinecap="round" pathLength={100} strokeDasharray={`${paidShare} 100`} />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold tabular-nums">{paidShare}%</span>
                    </div>
                    <span className="mt-1 text-[11px] font-medium text-center leading-tight">Contas pagas</span>
                  </div>
                  <div className="w-px self-stretch bg-mint/70" />
                  <div className="flex-1 min-w-0 grid gap-2 lg:grid-cols-2 lg:gap-8">
                    {[
                      { label: 'Saldo do Pagamento', value: totals.remainingPagamento, income: totals.totalPagamentoIncome, icon: DollarSign },
                      { label: 'Saldo do Adiantamento', value: totals.remainingVale, income: totals.totalValeIncome, icon: Wallet },
                    ].map(({ label, value, income: sourceIncome, icon: Icon }, idx) => (
                      <div key={label} className={`flex items-center gap-3 min-w-0 ${idx === 1 ? 'border-t border-mint/70 pt-2 lg:border-0 lg:pt-0' : ''}`}>
                        <Icon className="hidden sm:block w-6 h-6 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[11px] truncate">{label}</p>
                          <p className={`text-base lg:text-lg font-bold tabular-nums truncate ${value < 0 ? 'text-rose-800' : 'text-ink'}`}>{formatCurrency(value)}</p>
                          <p className="text-[10px] text-ink/80 tabular-nums truncate">Recebe {formatCurrency(sourceIncome)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {activeView === 'dashboard' ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 lg:gap-3">
                      <div className="bg-primary/5 border border-primary/15 rounded-xl px-3 lg:px-4 py-2.5 lg:py-3 flex items-center justify-between">
                        <span className="text-[9px] lg:text-[10px] font-bold text-ink/65 uppercase tracking-widest">Receita Anual</span>
                        <span className="text-xs lg:text-sm tabular-nums font-bold text-primary-dark">{formatCurrency(annualTotals.income)}</span>
                      </div>
                      <div className="bg-rose-500/5 border border-rose-500/15 rounded-xl px-3 lg:px-4 py-2.5 lg:py-3 flex items-center justify-between">
                        <span className="text-[9px] lg:text-[10px] font-bold text-ink/65 uppercase tracking-widest">Gasto Anual</span>
                        <span className="text-xs lg:text-sm tabular-nums font-bold text-rose-700">{formatCurrency(annualTotals.expense)}</span>
                      </div>
                      <div className={`${annualTotals.balance >= 0 ? 'bg-primary/10 border-primary/20' : 'bg-rose-500/10 border-rose-500/20'} border rounded-xl px-3 lg:px-4 py-2.5 lg:py-3 flex items-center justify-between`}>
                        <span className="text-[9px] lg:text-[10px] font-bold text-ink/65 uppercase tracking-widest">Projeção Anual</span>
                        <span className={`text-xs lg:text-sm tabular-nums font-bold ${annualTotals.balance >= 0 ? 'text-primary-dark' : 'text-rose-700'}`}>{formatCurrency(annualTotals.balance || 0)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                      <div className="xl:col-span-2 bg-white p-5 rounded-2xl border border-ink/10 flex flex-col shadow-xl">
                        <h3 className="text-sm font-bold text-ink/80 mb-4 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-brand-blue" />
                          Visão Anual ({currentYear})
                        </h3>
                        <div className="flex-1 w-full min-h-[260px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={yearData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(9,48,48,0.08)" vertical={false} />
                              <XAxis dataKey="name" stroke="rgba(9,48,48,0.65)" fontSize={11} tickLine={false} axisLine={false} />
                              <YAxis stroke="rgba(9,48,48,0.65)" fontSize={10} tickFormatter={(val) => `${Number(val) / 1000}k`} tickLine={false} axisLine={false} />
                              <Tooltip cursor={{ fill: 'rgba(0,208,158,0.1)' }} contentStyle={{ backgroundColor: '#fff', border: 'none', borderRadius: '16px', color: '#093030', fontSize: '12px', boxShadow: '0 8px 24px rgba(9,48,48,0.12)' }} />
                              <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                              <Bar dataKey="Receitas" fill="#00D09E" radius={[6, 6, 0, 0]} maxBarSize={14} />
                              <Bar dataKey="Despesas" fill="#0068FF" radius={[6, 6, 0, 0]} maxBarSize={14} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="xl:col-span-1 bg-white p-5 rounded-2xl border border-ink/10 flex flex-col shadow-xl">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                          <h3 className="text-sm font-bold text-ink/80 flex items-center gap-2">
                            <PieChartIcon className="w-4 h-4 text-primary-dark" />
                            Maiores Gastos
                          </h3>
                          <div className="flex items-center gap-1 bg-soft p-1 rounded-xl border border-ink/10 text-[10px] font-bold self-start sm:self-auto">
                            <button
                              onClick={() => setExpensePieMode('month')}
                              className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                                expensePieMode === 'month'
                                  ? 'bg-primary text-ink'
                                  : 'text-ink/65 hover:text-ink'
                              }`}
                            >
                              Mês
                            </button>
                            <button
                              onClick={() => setExpensePieMode('ytd')}
                              className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                                expensePieMode === 'ytd'
                                  ? 'bg-primary text-ink'
                                  : 'text-ink/65 hover:text-ink'
                              }`}
                              title="Acumulado de Janeiro até o mês atual"
                            >
                              Até Hoje
                            </button>
                            <button
                              onClick={() => setExpensePieMode('year')}
                              className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                                expensePieMode === 'year'
                                  ? 'bg-primary text-ink'
                                  : 'text-ink/65 hover:text-ink'
                              }`}
                              title="Projeção total de 12 meses"
                            >
                              Anual
                            </button>
                          </div>
                        </div>

                        {pieChartData.length > 0 ? (
                          <div className="flex-1 flex flex-col">
                            <div className="w-full min-h-[200px] flex-1">
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={pieChartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={85}
                                    paddingAngle={4}
                                    dataKey="value"
                                    stroke="none"
                                  >
                                    {pieChartData.map((_entry, index) => (
                                      <Cell
                                        key={`cell-${index}`}
                                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                                        className="cursor-pointer outline-none"
                                        onClick={() => setSelectedCategoryId(id => (id === _entry.id ? null : _entry.id))}
                                      />
                                    ))}
                                  </Pie>
                                  <Tooltip
                                    content={({ active, payload }) => {
                                      if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        return (
                                          <div className="bg-white border border-ink/10 p-3 rounded-xl shadow-2xl text-xs space-y-1.5 min-w-[190px]">
                                            <p className="font-bold text-ink border-b border-ink/10 pb-1">{data.name}</p>
                                            <div className="flex justify-between items-center text-primary-dark tabular-nums">
                                              <span className="text-ink/70 text-[10px]">No Mês:</span>
                                              <span className="font-bold">{formatCurrency(data.monthValue)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-brand-blue tabular-nums">
                                              <span className="text-ink/70 text-[10px]">Acumulado (Até Hoje):</span>
                                              <span className="font-bold">{formatCurrency(data.ytdValue)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-amber-700 tabular-nums">
                                              <span className="text-ink/70 text-[10px]">Total Anual:</span>
                                              <span className="font-bold">{formatCurrency(data.yearValue)}</span>
                                            </div>
                                          </div>
                                        );
                                      }
                                      return null;
                                    }}
                                  />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>

                            <div className="mt-3 space-y-1 max-h-96 overflow-y-auto custom-scrollbar pr-1">
                              {pieChartData.map((item, idx) => {
                                const isSelected = selectedCategoryId === item.id;

                                return (
                                  <div key={item.id} className={`rounded-2xl transition-all ${isSelected ? 'bg-soft' : ''}`}>
                                    <button
                                      onClick={() => setSelectedCategoryId(isSelected ? null : item.id)}
                                      aria-expanded={isSelected}
                                      className="w-full flex items-center gap-2.5 p-2 text-left text-xs rounded-2xl hover:bg-soft transition-all"
                                    >
                                      <span
                                        className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0"
                                        style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                                      >
                                        <CategoryIcon icon={item.icon} className="w-4 h-4" />
                                      </span>
                                      <span className="flex-1 min-w-0">
                                        <span className="font-semibold text-ink block truncate">{item.name}</span>
                                        <span className="text-[10px] text-ink/65 block">
                                          {item.visibleEntries.length} {item.visibleEntries.length === 1 ? 'lançamento' : 'lançamentos'}
                                        </span>
                                      </span>
                                      <span className="text-ink font-bold tabular-nums shrink-0">{formatCurrency(item.value)}</span>
                                      <ChevronRight className={`w-3.5 h-3.5 text-ink/50 shrink-0 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                                    </button>

                                    {isSelected && (
                                      <div className="px-3 pb-2 divide-y divide-ink/5">
                                        {item.visibleEntries.map(entry => (
                                          <div key={entry.id} className="flex items-center justify-between gap-3 py-1.5 text-[11px]">
                                            <span className="min-w-0">
                                              <span className="text-ink/90 font-medium block truncate">{entry.name}</span>
                                              <span className="text-[10px] text-ink/65 block truncate">
                                                {[expensePieMode !== 'month' ? formatMonthId(entry.monthId) : null, entry.cardName && !entry.name.endsWith('(valor base)') ? entry.cardName : null].filter(Boolean).join(' · ')}
                                              </span>
                                            </span>
                                            <span className="text-ink font-semibold tabular-nums shrink-0">{formatCurrency(entry.value)}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="flex-1 flex flex-col items-center justify-center text-ink/65 min-h-[260px]">
                            <PieChartIcon className="w-12 h-12 mb-3 opacity-20" />
                            <p className="text-sm">Nenhum gasto registrado.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <QuickEntryInput onAddEntry={handleQuickEntry} cards={items.filter(i => i.type.startsWith('card_'))} />
                    <div className="bg-white rounded-3xl shadow-card overflow-hidden">

                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-ink/10">
                        <span className="text-[10px] font-bold text-ink/65 uppercase tracking-widest flex items-center gap-1.5">
                          <TrendingUp className="w-3 h-3 text-primary-dark" /> Receitas
                        </span>
                        {editingIncome ? (
                          <button onClick={saveIncome} className="flex items-center gap-1 text-primary-dark bg-primary/20 hover:bg-primary/30 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all">
                            <Check className="w-3 h-3" /> Salvar
                          </button>
                        ) : (
                          <button onClick={() => setEditingIncome(true)} className="flex items-center gap-1 text-ink/65 hover:text-ink bg-soft hover:bg-ink/5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all">
                            <Edit2 className="w-4 h-4" /> Editar
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
                          <div key={inputMap.field} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all text-xs ${editingIncome ? 'border-primary/30 bg-primary/5' : 'border-ink/10 bg-soft'}`}>
                            <span className={`text-[9px] font-bold uppercase tracking-wider ${inputMap.color === 'indigo' ? 'text-brand-blue' : 'text-primary-dark'}`}>{inputMap.label}</span>
                            <span className="text-ink/50">R$</span>
                            <input
                              type="number"
                              className="bg-transparent text-xs text-ink tabular-nums font-bold outline-none w-20 placeholder-ink/50"
                              value={income[inputMap.field as keyof typeof income] || ''}
                              onChange={(e) => updateIncomeLocal(inputMap.field, Number(e.target.value))}
                              readOnly={!editingIncome}
                              onWheel={(e) => (e.target as HTMLElement).blur()}
                              placeholder="0"
                            />
                            {!editingIncome && <Lock className="w-2.5 h-2.5 text-ink/50" />}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="lg:hidden flex items-center gap-1 bg-soft p-1 rounded-2xl" role="tablist" aria-label="Lista de lançamentos">
                      {([['pagamento', 'Pagamento'], ['vale', 'Adiantamento'], ['cartoes', 'Cartões']] as const).map(([tab, label]) => (
                        <button
                          key={tab}
                          role="tab"
                          aria-selected={lancamentosTab === tab}
                          onClick={() => setLancamentosTab(tab)}
                          className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${lancamentosTab === tab ? 'bg-primary text-ink shadow-sm' : 'text-ink/70'}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                      <div className={`${lancamentosTab === 'pagamento' ? 'flex' : 'hidden lg:flex'} flex-col bg-white rounded-3xl shadow-card overflow-hidden`}>
                        <div className="px-4 py-3 border-b border-ink/10 flex justify-between items-center bg-primary/5">
                          <span className="text-sm font-bold text-ink flex items-center gap-1.5">
                            <TrendingDown className="w-4 h-4 text-primary-dark" /> Pagamento
                          </span>
                          <button onClick={() => addItem('expense_pagamento')} className="p-1 text-ink/65 hover:text-ink hover:bg-ink/5 rounded-lg transition-all">
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="divide-y divide-ink/5 flex-1">
                          {items.filter(i => i.type === 'expense_pagamento').map(item => {
                            const isEdit = editingItems[item.id];

                            return (
                              <div key={item.id} className={`flex flex-col transition-all group ${isEdit ? 'bg-primary/5' : 'hover:bg-ink/[0.03]'} ${sentShares.some(s => s.source_item_id === item.id) ? 'border-l-2 border-brand-blue' : ''}`}>
                                {sentShares.filter(s => s.source_item_id === item.id).map(s => (
                                  <div key={s.id} className="flex items-center gap-2 px-3 pt-1.5 text-[9px] opacity-70">
                                    <span className={`px-1 rounded-sm font-bold border ${s.status === 'accepted' ? 'bg-primary/10 text-primary-dark border-primary/20' : s.status === 'rejected' ? 'bg-rose-500/10 text-rose-700 border-rose-500/20' : 'bg-brand-blue/10 text-brand-blue border-brand-blue/20'}`}>
                                      {s.status === 'pending' ? 'AGUARDANDO' : s.status === 'accepted' ? 'ACEITO' : 'RECUSADO'}
                                    </span>
                                    <span className="text-ink/65 italic">Dividido com {s.target_email || s.to_user_id}</span>
                                    <span className="text-ink/65">Minha parte: <span className="text-primary-dark">{formatCurrency(Number(item.pagamento) - Number(s.share_value))}</span></span>
                                  </div>
                                ))}

                                <div className="relative flex flex-wrap sm:flex-nowrap items-center gap-2.5 px-4 py-3">
                                  <button
                                    onClick={() => toggleItemPaid(item)}
                                    className={`w-10 h-10 rounded-2xl transition-all shrink-0 flex items-center justify-center cursor-pointer ${
                                      item.is_paid
                                        ? 'bg-primary text-ink'
                                        : 'bg-sky-tile text-ink hover:bg-primary'
                                    }`}
                                    title={item.is_paid ? 'Pago' : 'Marcar como pago'}
                                  >
                                    {item.is_paid ? <Check className="w-5 h-5 stroke-[3]" /> : <CategoryIcon icon={findCategory(allCategories, item.category).icon} className="w-5 h-5" />}
                                  </button>

                                  <div className="flex-1 min-w-[6rem]">
<input
                                    type="text"
                                    value={item.name}
                                    onChange={(e) => updateItemLocal(item.id, 'name', e.target.value)}
                                    readOnly={!isEdit}
                                    className={`w-full bg-transparent text-sm font-semibold outline-none min-w-0 transition-colors ${
                                      item.is_paid ? 'text-primary-dark font-semibold line-through decoration-primary-dark/50' : 'text-ink/90'
                                    }`}
                                    placeholder="Descrição"
                                  />
<div className="flex flex-wrap items-center gap-x-1.5 min-w-0 mt-0.5">
                                      <CategorySelect
                                        value={item.category}
                                        categories={allCategories}
                                        label={item.name}
                                        onChange={category => changeItemCategory(item, category)}
                                        onCreate={() => openCategoryManager(category => changeItemCategory(item, category))}
                                      />
                                      <span className="text-[11px] text-brand-blue-dark truncate">{[item.is_paid ? 'Pago' : 'A pagar', item.is_recurring ? 'Recorrente' : null].filter(Boolean).join(' · ')}</span>
                                    </div>
</div>
                                  <span className="text-ink/65 text-[10px]">R$</span>
                                  <input
                                    type="number"
                                    value={item.pagamento || ''}
                                    onChange={(e) => updateItemLocal(item.id, 'pagamento', e.target.value)}
                                    readOnly={!isEdit}
                                    className={`w-20 bg-transparent text-sm font-semibold tabular-nums text-right outline-none ${
                                      item.is_paid ? 'text-primary-dark font-bold' : 'text-primary-dark'
                                    }`}
                                    placeholder="0"
                                  />

                                  <div className={`flex w-full justify-end gap-1 items-center ${isEdit ? 'sm:w-auto' : 'sm:absolute sm:w-auto sm:right-3 sm:top-1/2 sm:-translate-y-1/2 sm:bg-white sm:shadow-card sm:rounded-xl sm:px-1 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100'} transition-all`}>
                                    <button onClick={() => toggleRecurring(item)} className={`p-1 rounded transition-all ${item.is_recurring ? 'text-primary-dark bg-primary/10' : 'text-ink/50 hover:text-ink'}`} title="Recorrente">
                                      <Repeat className="w-4 h-4" />
                                    </button>
                                    <button 
                                      onClick={() => { setShareModal({ item }); setShareValue(String((Number(item.pagamento) || 0) / 2)); }} 
                                      className={`p-1 transition-all rounded ${isShared(item.id, sentShares) ? 'text-primary-dark' : 'text-ink/50 hover:text-brand-blue'}`}
                                      title={isShared(item.id, sentShares) ? "Já compartilhado" : "Compartilhar"}
                                    >
                                      <Share2 className="w-4 h-4" />
                                    </button>
                                    {isEdit ? (
                                      <button onClick={() => saveItem(item)} className="p-1 bg-primary/20 text-primary-dark rounded">
                                        <Check className="w-4 h-4" />
                                      </button>
                                    ) : (
                                      <button onClick={() => setEditingItems(p => ({ ...p, [item.id]: true }))} className="p-1 text-ink/50 hover:text-ink rounded transition-all">
                                        <Edit2 className="w-4 h-4" />
                                      </button>
                                    )}
                                    <button onClick={() => removeItem(item.id)} className="p-1 text-ink/50 hover:text-rose-700 rounded transition-all">
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                          {items.filter(i => i.type === 'expense_pagamento').length === 0 && (
                            <div className="px-3 py-4 text-center text-ink/50 text-xs">Nenhuma conta</div>
                          )}
                        </div>

                        <div className="px-4 py-2.5 border-t border-ink/10 bg-soft flex justify-between items-center">
                          <span className="text-[10px] font-bold text-ink/65 uppercase tracking-wider">Total</span>
                          <span className="text-sm tabular-nums font-bold text-primary-dark">{formatCurrency(items.filter(i => i.type === 'expense_pagamento').reduce((a, c) => a + (Number(c.pagamento) || 0), 0))}</span>
                        </div>
                      </div>

                      <div className={`${lancamentosTab === 'vale' ? 'flex' : 'hidden lg:flex'} flex-col bg-white rounded-3xl shadow-card overflow-hidden`}>
                        <div className="px-4 py-3 border-b border-ink/10 flex justify-between items-center bg-brand-blue/5">
                          <span className="text-xs font-bold text-brand-blue flex items-center gap-1.5">
                            <TrendingDown className="w-3.5 h-3.5" /> Adiantamento
                          </span>
                          <button onClick={() => addItem('expense_vale')} className="p-1 text-ink/65 hover:text-ink hover:bg-ink/5 rounded-lg transition-all">
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="divide-y divide-ink/5 flex-1">
                          {items.filter(i => i.type === 'expense_vale').map(item => {
                            const isEdit = editingItems[item.id];

                            return (
                              <div key={item.id} className={`flex flex-col transition-all group ${isEdit ? 'bg-brand-blue/5' : 'hover:bg-ink/[0.03]'} ${sentShares.some(s => s.source_item_id === item.id) ? 'border-l-2 border-brand-blue' : ''}`}>
                                {sentShares.filter(s => s.source_item_id === item.id).map(s => (
                                  <div key={s.id} className="flex items-center gap-2 px-3 pt-1.5 text-[9px] opacity-70">
                                    <span className={`px-1 rounded-sm font-bold border ${s.status === 'accepted' ? 'bg-primary/10 text-primary-dark border-primary/20' : s.status === 'rejected' ? 'bg-rose-500/10 text-rose-700 border-rose-500/20' : 'bg-brand-blue/10 text-brand-blue border-brand-blue/20'}`}>
                                      {s.status === 'pending' ? 'AGUARDANDO' : s.status === 'accepted' ? 'ACEITO' : 'RECUSADO'}
                                    </span>
                                    <span className="text-ink/65 italic">Dividido com {s.target_email || s.to_user_id}</span>
                                    <span className="text-ink/65">Minha parte: <span className="text-brand-blue">{formatCurrency(Number(item.vale) - Number(s.share_value))}</span></span>
                                  </div>
                                ))}

                                <div className="relative flex flex-wrap sm:flex-nowrap items-center gap-2.5 px-4 py-3">
                                  <button
                                    onClick={() => toggleItemPaid(item)}
                                    className={`w-10 h-10 rounded-2xl transition-all shrink-0 flex items-center justify-center cursor-pointer ${
                                      item.is_paid
                                        ? 'bg-primary text-ink'
                                        : 'bg-sky-tile text-ink hover:bg-primary'
                                    }`}
                                    title={item.is_paid ? 'Pago' : 'Marcar como pago'}
                                  >
                                    {item.is_paid ? <Check className="w-5 h-5 stroke-[3]" /> : <CategoryIcon icon={findCategory(allCategories, item.category).icon} className="w-5 h-5" />}
                                  </button>

                                  <div className="flex-1 min-w-[6rem]">
<input
                                    type="text"
                                    value={item.name}
                                    onChange={(e) => updateItemLocal(item.id, 'name', e.target.value)}
                                    readOnly={!isEdit}
                                    className={`w-full bg-transparent text-sm font-semibold outline-none min-w-0 transition-colors ${
                                      item.is_paid ? 'text-primary-dark font-semibold line-through decoration-primary-dark/50' : 'text-ink/90'
                                    }`}
                                    placeholder="Descrição"
                                  />
<div className="flex flex-wrap items-center gap-x-1.5 min-w-0 mt-0.5">
                                      <CategorySelect
                                        value={item.category}
                                        categories={allCategories}
                                        label={item.name}
                                        onChange={category => changeItemCategory(item, category)}
                                        onCreate={() => openCategoryManager(category => changeItemCategory(item, category))}
                                      />
                                      <span className="text-[11px] text-brand-blue-dark truncate">{[item.is_paid ? 'Pago' : 'A pagar', item.is_recurring ? 'Recorrente' : null].filter(Boolean).join(' · ')}</span>
                                    </div>
</div>
                                  <span className="text-ink/65 text-[10px]">R$</span>
                                  <input
                                    type="number"
                                    value={item.vale || ''}
                                    onChange={(e) => updateItemLocal(item.id, 'vale', e.target.value)}
                                    readOnly={!isEdit}
                                    className={`w-20 bg-transparent text-sm font-semibold tabular-nums text-right outline-none ${
                                      item.is_paid ? 'text-primary-dark font-bold' : 'text-brand-blue'
                                    }`}
                                    placeholder="0"
                                  />

                                  <div className={`flex w-full justify-end gap-1 items-center ${isEdit ? 'sm:w-auto' : 'sm:absolute sm:w-auto sm:right-3 sm:top-1/2 sm:-translate-y-1/2 sm:bg-white sm:shadow-card sm:rounded-xl sm:px-1 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100'} transition-all`}>
                                    <button onClick={() => toggleRecurring(item)} className={`p-1 rounded transition-all ${item.is_recurring ? 'text-brand-blue bg-brand-blue/10' : 'text-ink/50 hover:text-ink'}`} title="Recorrente">
                                      <Repeat className="w-4 h-4" />
                                    </button>
                                    <button 
                                      onClick={() => { setShareModal({ item }); setShareValue(String((Number(item.vale) || 0) / 2)); }} 
                                      className={`p-1 transition-all rounded ${isShared(item.id, sentShares) ? 'text-primary-dark' : 'text-ink/50 hover:text-brand-blue'}`}
                                      title={isShared(item.id, sentShares) ? "Já compartilhado" : "Compartilhar"}
                                    >
                                      <Share2 className="w-4 h-4" />
                                    </button>
                                    {isEdit ? (
                                      <button onClick={() => saveItem(item)} className="p-1 bg-primary/20 text-primary-dark rounded">
                                        <Check className="w-4 h-4" />
                                      </button>
                                    ) : (
                                      <button onClick={() => setEditingItems(p => ({ ...p, [item.id]: true }))} className="p-1 text-ink/50 hover:text-ink rounded transition-all">
                                        <Edit2 className="w-4 h-4" />
                                      </button>
                                    )}
                                    <button onClick={() => removeItem(item.id)} className="p-1 text-ink/50 hover:text-rose-700 rounded transition-all">
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                          {items.filter(i => i.type === 'expense_vale').length === 0 && (
                            <div className="px-3 py-4 text-center text-ink/50 text-xs">Nenhuma conta</div>
                          )}
                        </div>

                        <div className="px-4 py-2.5 border-t border-ink/10 bg-soft flex justify-between items-center">
                          <span className="text-[10px] font-bold text-ink/65 uppercase tracking-wider">Total</span>
                          <span className="text-sm tabular-nums font-bold text-brand-blue">{formatCurrency(items.filter(i => i.type === 'expense_vale').reduce((a, c) => a + (Number(c.vale) || 0), 0))}</span>
                        </div>
                      </div>

                      <div className={`${lancamentosTab === 'cartoes' ? 'flex' : 'hidden lg:flex'} flex-col bg-white rounded-3xl shadow-card overflow-hidden`}>
                        <div className="px-4 py-3 border-b border-ink/10 flex justify-between items-center bg-ink/[0.03]">
                          <span className="text-sm font-bold text-ink flex items-center gap-1.5">
                            <CreditCard className="w-4 h-4 text-brand-blue" /> Cartões
                          </span>
                          <button onClick={() => setCardModalOpen(true)} className="px-3 py-1.5 text-[10px] font-bold text-ink bg-brand-blue/20 hover:bg-brand-blue/30 text-brand-blue rounded-lg transition-all flex items-center gap-1.5">
                            Gerenciar Cartões
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
                              <div key={item.id} className="border-b border-ink/10 last:border-0">
                                <div className={`flex flex-col transition-all group ${isEdit ? 'bg-soft' : 'hover:bg-ink/[0.03]'} ${sentShares.some(s => s.source_item_id === item.id) ? 'border-l-2 border-brand-blue' : ''}`}>
                                  {sentShares.filter(s => s.source_item_id === item.id).map(s => (
                                    <div key={s.id} className="flex items-center gap-2 px-3 pt-1.5 text-[9px] opacity-70">
                                      <span className={`px-1 rounded-sm font-bold border ${s.status === 'accepted' ? 'bg-primary/10 text-primary-dark border-primary/20' : s.status === 'rejected' ? 'bg-rose-500/10 text-rose-700 border-rose-500/20' : 'bg-brand-blue/10 text-brand-blue border-brand-blue/20'}`}>
                                        {s.status === 'pending' ? 'AGUARDANDO' : s.status === 'accepted' ? 'ACEITO' : 'RECUSADO'}
                                      </span>
                                      <span className="text-ink/65 italic">Dividido com {s.target_email || s.to_user_id}</span>
                                      <span className="text-ink/65">
                                        Minha parte:{' '}
                                        <span className={isPagamento ? 'text-primary-dark' : 'text-brand-blue'}>
                                          {formatCurrency(displayTotal - Number(s.share_value))}
                                        </span>
                                      </span>
                                    </div>
                                  ))}

                                  <div className="relative flex flex-wrap sm:flex-nowrap items-center gap-2 px-3 py-3 transition-all">
                                    <button onClick={() => toggleExpandCard(item.id)} className={`p-0.5 rounded transition-all shrink-0 ${isExpanded ? 'text-ink/70' : 'text-ink/50 hover:text-ink/70'}`}>
                                      <ChevronRight className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                                    </button>

                                    <button
                                      onClick={() => toggleItemPaid(item)}
                                      className={`w-10 h-10 rounded-2xl transition-all shrink-0 flex items-center justify-center cursor-pointer ${
                                        item.is_paid
                                          ? 'bg-primary text-ink'
                                          : 'bg-sky-tile text-ink hover:bg-primary'
                                      }`}
                                      title={item.is_paid ? 'Pago' : 'Marcar como pago'}
                                    >
                                      {item.is_paid ? <Check className="w-5 h-5 stroke-[3]" /> : <CreditCard className="w-5 h-5" />}
                                    </button>

                                    <div className="flex-1 min-w-[6rem]">
<input
                                      type="text"
                                      value={item.name}
                                      onChange={(e) => updateItemLocal(item.id, 'name', e.target.value)}
                                      readOnly={!isEdit}
                                      className={`w-full bg-transparent text-sm font-semibold outline-none min-w-0 transition-colors ${
                                        item.is_paid ? 'text-primary-dark font-semibold line-through decoration-primary-dark/50' : 'text-ink/90'
                                      }`}
                                      placeholder="Nome do cartão"
                                    />
<span className="block text-[11px] text-brand-blue-dark truncate">{[item.is_paid ? 'Pago' : item.due_day ? `Vence dia ${item.due_day}` : 'A pagar', item.is_recurring ? 'Recorrente' : null].filter(Boolean).join(' · ')}</span>
</div>

                                    <select
                                      value={isPagamento ? 'pagamento' : 'vale'}
                                      onChange={(e) => updateCardSource(item, e.target.value as 'pagamento' | 'vale')}
                                      title="Contabilizar em"
                                      aria-label={`Contabilizar ${item.name} em`}
                                      className={`order-5 sm:order-none text-[10px] font-bold outline-none appearance-none cursor-pointer rounded px-1.5 py-0.5 border transition-all ${isPagamento ? 'bg-primary/15 border-primary/20 text-primary-dark' : 'bg-brand-blue/15 border-brand-blue/20 text-brand-blue'}`}
                                    >
                                      <option value="pagamento" className="bg-white">Pgto</option>
                                      <option value="vale" className="bg-white">Adto</option>
                                    </select>

                                    <span className="text-ink/65 text-[10px]">R$</span>

                                    {hasExpenses ? (
                                      <span className={`w-20 text-sm font-semibold tabular-nums text-right ${item.is_paid ? 'text-primary-dark' : isPagamento ? 'text-primary-dark' : 'text-brand-blue'}`}>
                                        {formatCurrency(displayTotal).replace('R$\u00a0', '')}
                                      </span>
                                    ) : (
                                      <input
                                        type="number"
                                        value={(item[amountField as keyof ItemRecord] as number) || ''}
                                        onChange={(e) => updateItemLocal(item.id, amountField, e.target.value)}
                                        readOnly={!isEdit}
                                        className={`w-20 bg-transparent text-sm font-semibold tabular-nums text-right outline-none ${item.is_paid ? 'text-primary-dark font-bold' : isPagamento ? 'text-primary-dark' : 'text-brand-blue'}`}
                                      />
                                    )}

                                    <div className={`order-6 sm:order-none flex flex-1 sm:flex-none justify-end gap-1 items-center ${isEdit ? 'sm:w-auto' : 'sm:absolute sm:w-auto sm:right-3 sm:top-1/2 sm:-translate-y-1/2 sm:bg-white sm:shadow-card sm:rounded-xl sm:px-1 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100'} transition-all`}>
                                      <button onClick={() => toggleRecurring(item)} className={`p-1 rounded ${item.is_recurring ? 'text-primary-dark bg-primary/10' : 'text-ink/50'}`} title="Recorrente">
                                        <Repeat className="w-4 h-4" />
                                      </button>
                                      <button 
                                        onClick={() => { setShareModal({ item }); setShareValue(String(displayTotal / 2)); }} 
                                        className={`p-1 transition-all rounded ${isShared(item.id, sentShares) ? 'text-primary-dark' : 'text-ink/50 hover:text-brand-blue'}`}
                                        title={isShared(item.id, sentShares) ? "Já compartilhado" : "Compartilhar"}
                                      >
                                        <Share2 className="w-4 h-4" />
                                      </button>
                                      {isEdit ? (
                                        <button onClick={() => saveItem(item)} className="p-1 bg-primary/20 text-primary-dark rounded">
                                          <Check className="w-3 h-3" />
                                        </button>
                                      ) : (
                                        <button onClick={() => setEditingItems(p => ({ ...p, [item.id]: true }))} className="p-1 text-ink/50 hover:text-ink">
                                          <Edit2 className="w-4 h-4" />
                                        </button>
                                      )}
                                      <button onClick={() => removeItem(item.id)} className="p-1 text-ink/50 hover:text-rose-700">
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>

                                  {isExpanded && (
                                    <div className="bg-soft border-t border-ink/10 divide-y divide-ink/5">
                                      {expenses.map(exp => {
                                        const isExpEdit = editingCardExpenses[exp.id];

                                        return (
                                          <div key={exp.id} className="flex flex-wrap items-center gap-1.5 pl-6 pr-3 py-2 group">
                                            <button
                                              onClick={() => toggleCardExpensePaid(item.id, exp)}
                                              className={`w-8 h-8 rounded-xl transition-all shrink-0 flex items-center justify-center cursor-pointer ${
                                                exp.is_paid
                                                  ? 'bg-primary text-ink'
                                                  : 'bg-sky-tile text-ink hover:bg-primary'
                                              }`}
                                              title={exp.is_paid ? 'Pago' : 'Marcar como pago'}
                                            >
                                              {exp.is_paid ? <Check className="w-4 h-4 stroke-[3]" /> : <CategoryIcon icon={findCategory(allCategories, exp.category).icon} className="w-4 h-4" />}
                                            </button>

                                            <div className="flex-1 min-w-[6rem]">
<input
                                              type="text"
                                              value={exp.name}
                                              onChange={(e) => updateCardExpenseLocal(item.id, exp.id, 'name', e.target.value)}
                                              readOnly={!isExpEdit}
                                              className={`w-full bg-transparent text-xs outline-none transition-colors ${
                                                exp.is_paid ? 'text-primary-dark font-semibold line-through decoration-primary-dark/50' : 'text-ink/80'
                                              }`}
                                              placeholder="Compra"
                                            />
                                              <CategorySelect
                                                value={exp.category}
                                                categories={allCategories}
                                                label={exp.name}
                                                onChange={category => changeExpenseCategory(item.id, exp, category)}
                                                onCreate={() => openCategoryManager(category => changeExpenseCategory(item.id, exp, category))}
                                              />
                                            </div>
                                            <span className="text-ink/50 text-[10px]">R$</span>
                                            <input
                                              type="number"
                                              value={exp.value || ''}
                                              onChange={(e) => updateCardExpenseLocal(item.id, exp.id, 'value', e.target.value)}
                                              readOnly={!isExpEdit}
                                              className={`w-20 bg-transparent text-xs font-semibold tabular-nums text-right outline-none ${
                                                exp.is_paid ? 'text-primary-dark font-bold' : 'text-ink/90'
                                              }`}
                                            />
                                            <div className="flex gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all">
                                              <button onClick={() => toggleRecurringCardExpense(item.id, exp)} className={`p-1 rounded ${exp.is_recurring ? 'text-primary-dark bg-primary/10' : 'text-ink/50'}`} title="Recorrente">
                                                <Repeat className="w-2.5 h-2.5" />
                                              </button>
                                              <button 
                                                onClick={() => { setShareModal({ item: exp, isCardExp: true }); setShareValue(String((Number(exp.value) || 0) / 2)); }} 
                                                className={`p-1 transition-all rounded ${isShared(exp.id, sentShares) ? 'text-primary-dark' : 'text-ink/50 hover:text-brand-blue'}`}
                                                title={isShared(exp.id, sentShares) ? "Já compartilhado" : "Compartilhar"}
                                              >
                                                <Share2 className="w-2.5 h-2.5" />
                                              </button>

                                              {isExpEdit ? (
                                                <button onClick={() => saveCardExpense(item, exp)} className="p-1 bg-primary/20 text-primary-dark rounded">
                                                  <Check className="w-2.5 h-2.5" />
                                                </button>
                                              ) : (
                                                <button onClick={() => setEditingCardExpenses(p => ({ ...p, [exp.id]: true }))} className="p-1 text-ink/50">
                                                  <Edit2 className="w-2.5 h-2.5" />
                                                </button>
                                              )}

                                              <button onClick={() => removeCardExpense(item, exp.id)} className="p-1 text-ink/50 hover:text-rose-700">
                                                <Trash2 className="w-2.5 h-2.5" />
                                              </button>
                                            </div>
                                            {isExpEdit && (
                                              <div className="w-full flex flex-wrap items-center gap-3 pt-1 text-[10px] text-ink/70">
                                                <label className="flex items-center gap-1.5">
                                                  Data da compra
                                                  <input
                                                    type="date"
                                                    value={exp.purchase_date || ''}
                                                    onChange={(e) => updateCardExpenseLocal(item.id, exp.id, 'purchase_date', e.target.value)}
                                                    className="bg-soft border border-ink/10 rounded px-1.5 py-1 text-ink/90 outline-none "
                                                  />
                                                </label>
                                                {!exp.installment_group_id && !exp.is_recurring && (
                                                  <label className="flex items-center gap-1.5">
                                                    Parcelas
                                                    <input
                                                      type="number"
                                                      min={1}
                                                      max={48}
                                                      placeholder="1"
                                                      value={exp.installments_input ?? ''}
                                                      onChange={(e) => updateCardExpenseLocal(item.id, exp.id, 'installments_input', e.target.value)}
                                                      className="w-12 bg-soft border border-ink/10 rounded px-1.5 py-1 text-ink/90 outline-none"
                                                    />
                                                    <span className="text-ink/65">o valor é o total da compra</span>
                                                  </label>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}

                                      <button onClick={() => addCardExpense(item)} className="px-8 py-2 text-[10px] text-ink/65 hover:text-ink transition-all flex items-center gap-1">
                                        <Plus className="w-3 h-3" /> Adicionar compra
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}

                          {items.filter(i => i.type.startsWith('card_')).length === 0 && (
                            <button onClick={() => setCardModalOpen(true)} className="w-full px-3 py-4 text-center text-brand-blue hover:text-brand-blue text-xs font-bold flex items-center justify-center gap-1.5 transition-all">
                              <Plus className="w-3.5 h-3.5" /> Adicionar primeiro cartão
                            </button>
                          )}
                        </div>

                        <div className="px-4 py-2.5 border-t border-ink/10 bg-soft flex justify-between items-center">
                          <span className="text-[10px] font-bold text-ink/65 uppercase tracking-wider">Total</span>
                          <span className="text-sm tabular-nums font-bold text-ink/80">
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

        {activeView === 'settings' && (
          <div className="p-4 lg:p-8 pb-24 lg:pb-8">
            <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              <button
                onClick={() => openCategoryManager()}
                className="w-full flex items-center gap-3 bg-white rounded-3xl shadow-card p-4 text-left hover:bg-soft transition-all"
              >
                <span className="w-10 h-10 rounded-2xl bg-sky-tile text-ink flex items-center justify-center shrink-0">
                  <CategoryIcon icon="tag" className="w-5 h-5" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-bold text-ink">Categorias</span>
                  <span className="block text-xs text-ink/70">Crie e exclua suas categorias</span>
                </span>
                <ChevronRight className="w-4 h-4 text-ink/50 shrink-0" />
              </button>

              {/* PWA App Installation Section */}
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-primary/10 border border-primary/20 rounded-xl">
                  <Smartphone className="w-5 h-5 text-primary-dark" />
                </div>
                <div>
                  <h2 className="font-extrabold text-lg">Aplicativo ZimFinance</h2>
                  <p className="text-ink/65 text-xs">Instale o app diretamente no seu dispositivo</p>
                </div>
              </div>

              <div className="bg-ink/[0.03] border border-ink/10 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-sm text-ink">Instalar App no Dispositivo</h3>
                  <p className="text-xs text-ink/65 mt-1 max-w-md">
                    Instale o ZimFinance como PWA para acessar rapidamente pela tela inicial com desempenho otimizado.
                  </p>
                </div>
                <button
                  onClick={triggerInstallPWA}
                  className="flex items-center justify-center gap-2 bg-primary hover:bg-primary text-ink font-bold px-4 py-2.5 rounded-xl text-xs transition-all cursor-pointer shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Instalar App</span>
                </button>
              </div>

              {/* Painel Administrativo (apenas para Admin) */}
              {userProfile?.role === 'admin' && (
                <div className="space-y-6 pt-4 border-t border-ink/10">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2.5 bg-brand-blue border border-brand-blue rounded-xl">
                      <Shield className="w-5 h-5 text-brand-blue" />
                    </div>
                    <div>
                      <h2 className="font-extrabold text-lg">Painel Administrativo</h2>
                      <p className="text-ink/65 text-xs">Gerencie usuários do ZimFinance</p>
                    </div>
                  </div>

                  <div className="bg-ink/[0.03] border border-ink/10 rounded-2xl overflow-hidden">
                    <div className="flex items-center gap-2 px-5 py-4 border-b border-ink/10">
                      <UserPlus className="w-4 h-4 text-primary-dark" />
                      <span className="font-bold text-sm">Criar Novo Usuário</span>
                    </div>

                    <div className="p-5 space-y-4">
                      {adminMsg && (
                        <div className={`p-3 rounded-xl text-sm font-medium border ${adminMsg.type === 'success' ? 'bg-primary/10 text-primary-dark border-primary/20' : 'bg-rose-500/10 text-rose-700 border-rose-500/20'}`}>
                          {adminMsg.text}
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-ink/65 uppercase tracking-widest mb-1.5">Nome</label>
                          <input
                            type="text"
                            value={newUserName}
                            onChange={e => setNewUserName(e.target.value)}
                            placeholder="Nome do usuário"
                            className="w-full bg-soft border border-ink/10 focus:border-primary p-2.5 rounded-xl text-sm text-ink outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-ink/65 uppercase tracking-widest mb-1.5">E-mail *</label>
                          <input
                            type="email"
                            value={newUserEmail}
                            onChange={e => setNewUserEmail(e.target.value)}
                            placeholder="email@exemplo.com"
                            className="w-full bg-soft border border-ink/10 focus:border-primary p-2.5 rounded-xl text-sm text-ink outline-none transition-all"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold text-ink/65 uppercase tracking-widest mb-1.5">Senha *</label>
                          <input
                            type="password"
                            value={newUserPassword}
                            onChange={e => setNewUserPassword(e.target.value)}
                            placeholder="Mínimo 6 caracteres"
                            className="w-full bg-soft border border-ink/10 focus:border-primary p-2.5 rounded-xl text-sm text-ink outline-none transition-all"
                          />
                        </div>
                      </div>

                      <button
                        onClick={createAdminUser}
                        disabled={adminLoading}
                        className="w-full flex items-center justify-center gap-2 bg-primary text-ink font-bold py-3 rounded-xl hover:brightness-95 transition-all disabled:opacity-50"
                      >
                        {adminLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                        Criar Usuário
                      </button>
                    </div>
                  </div>

                  <div className="bg-ink/[0.03] border border-ink/10 rounded-2xl overflow-hidden">
                    <div className="flex items-center gap-2 px-5 py-4 border-b border-ink/10">
                      <Users className="w-4 h-4 text-brand-blue" />
                      <span className="font-bold text-sm">Usuários Cadastrados</span>
                      <span className="ml-auto text-xs text-ink/65 tabular-nums">{adminUsers.length}</span>
                    </div>

                    {adminLoading && adminUsers.length === 0 ? (
                      <div className="p-8 flex justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-primary-dark" />
                      </div>
                    ) : (
                      <div className="divide-y divide-ink/5">
                        {adminUsers.map(u => (
                          <div key={u.id} className="flex items-center px-5 py-3.5 gap-3">
                            <div className="w-8 h-8 rounded-full bg-soft border border-ink/10 flex items-center justify-center text-xs font-bold text-ink/80 flex-shrink-0">
                              {(u.display_name || u.email).charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-ink truncate">{u.display_name || u.email.split('@')[0]}</p>
                              <p className="text-xs text-ink/65 truncate">{u.email}</p>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${u.role === 'admin' ? 'bg-brand-blue text-brand-blue border border-brand-blue' : 'bg-soft text-ink/65 border border-ink/10'}`}>
                              {u.role === 'admin' ? 'Admin' : 'User'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
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
                <div className="bg-white border border-ink/10 rounded-3xl w-full max-w-sm shadow-2xl">
                  <div className="flex items-center gap-3 px-6 py-4 border-b border-ink/10">
                    <div className="p-2 bg-brand-blue/10 rounded-xl">
                      <Share2 className="w-4 h-4 text-brand-blue" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">Compartilhar Despesa</h3>
                      <p className="text-ink/65 text-xs truncate max-w-[180px]">{item.name || 'Sem nome'}</p>
                    </div>
                    <button
                      onClick={() => {
                        setShareModal(null);
                        setShareEmail('');
                        setShareValue('');
                        setShareMsg(null);
                      }}
                      className="ml-auto p-1.5 text-ink/65 hover:text-ink rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-6 space-y-4">
                    {shareMsg && (
                      <div className={`p-3 rounded-xl text-xs font-medium ${shareMsg.type === 'success' ? 'bg-primary/10 text-primary-dark' : 'bg-rose-500/10 text-rose-700'}`}>
                        {shareMsg.text}
                      </div>
                    )}

                    <div className="bg-ink/[0.03] border border-ink/10 rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-ink/65 uppercase tracking-wider font-bold">Valor total</p>
                        <p className="text-lg tabular-nums font-bold text-ink">
                          {formatCurrency(modalTotal)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-ink/65 uppercase tracking-wider font-bold">Conta</p>
                        <p className="text-xs font-bold text-brand-blue">
                          {modalType}
                        </p>
                      </div>
                    </div>

                  <div>
                    <label className="block text-[10px] font-bold text-ink/65 uppercase tracking-widest mb-1.5">E-mail do usuário</label>
                    <input
                      type="email"
                      value={shareEmail}
                      onChange={e => setShareEmail(e.target.value)}
                      placeholder="email@exemplo.com"
                      className="w-full bg-soft border border-ink/10 focus:border-brand-blue p-3 rounded-xl text-sm text-ink outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-ink/65 uppercase tracking-widest mb-1.5">Valor que ele(a) vai pagar</label>
                    <input
                      type="number"
                      value={shareValue}
                      onChange={e => setShareValue(e.target.value)}
                      placeholder="0,00"
                      min="0"
                      step="0.01"
                      className="w-full bg-soft border border-ink/10 focus:border-brand-blue p-3 rounded-xl text-sm text-ink outline-none transition-all"
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
                      className="flex-1 py-3 rounded-xl border border-ink/10 text-ink/70 text-sm font-bold hover:bg-soft transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={sendExpenseShare}
                      disabled={shareLoading}
                      className="flex-1 py-3 rounded-xl bg-brand-blue text-white text-sm font-bold hover:brightness-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
                <div className="bg-white border border-ink/10 rounded-3xl w-full max-w-sm shadow-2xl">
                  <div className="flex items-center gap-3 px-6 py-4 border-b border-ink/10">
                    <div className="p-2 bg-primary/10 rounded-xl">
                      <Repeat className="w-4 h-4 text-primary-dark" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">Configurar Recorrência</h3>
                      <p className="text-ink/65 text-xs truncate max-w-[180px]">{item.name || 'Sem nome'}</p>
                    </div>
                    <button
                      onClick={() => setRecurrenceModal(null)}
                      className="ml-auto p-1.5 text-ink/65 hover:text-ink rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-ink/65 uppercase tracking-widest mb-2">Tipo de Recorrência</label>
                      <div className="grid grid-cols-2 gap-2 bg-soft p-1 rounded-xl border border-ink/10">
                        <button
                          type="button"
                          onClick={() => setRecType('continuous')}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                            recType === 'continuous'
                              ? 'bg-primary/10 text-primary-dark border border-primary/20'
                              : 'text-ink/65 hover:text-ink border border-transparent'
                          }`}
                        >
                          Indefinida
                        </button>
                        <button
                          type="button"
                          onClick={() => setRecType('limited')}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                            recType === 'limited'
                              ? 'bg-primary/10 text-primary-dark border border-primary/20'
                              : 'text-ink/65 hover:text-ink border border-transparent'
                          }`}
                        >
                          Prazo Limite
                        </button>
                      </div>
                    </div>

                    {recType === 'limited' && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-bold text-ink/65 uppercase tracking-widest mb-1.5">Válido até o mês</label>
                          <select
                            value={recTargetMonth}
                            onChange={(e) => setRecTargetMonth(Number(e.target.value))}
                            className="w-full bg-soft border border-ink/10 focus:border-primary p-3 rounded-xl text-sm text-ink outline-none transition-all"
                          >
                            {MONTH_NAMES.map((name, idx) => (
                              <option key={idx} value={idx + 1} className="bg-white text-ink">
                                {name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-ink/65 uppercase tracking-widest mb-1.5">Ano limite</label>
                          <select
                            value={recTargetYear}
                            onChange={(e) => setRecTargetYear(Number(e.target.value))}
                            className="w-full bg-soft border border-ink/10 focus:border-primary p-3 rounded-xl text-sm text-ink outline-none transition-all"
                          >
                            {Array.from({ length: 6 }, (_, i) => currentYear + i).map((year) => (
                              <option key={year} value={year} className="bg-white text-ink">
                                {year}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {recLoading && (
                      <div className="space-y-2 py-1">
                        <div className="h-2 bg-soft rounded-full overflow-hidden">
                          <div className="h-full bg-primary/40 rounded-full animate-pulse" style={{ width: '100%' }} />
                        </div>
                        <p className="text-[10px] text-ink/65 text-center">Aplicando recorrência nos meses...</p>
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => setRecurrenceModal(null)}
                        disabled={recLoading}
                        className="flex-1 py-3 rounded-xl border border-ink/10 text-ink/70 text-sm font-bold hover:bg-soft transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={saveRecurrenceConfig}
                        disabled={recLoading}
                        className="flex-1 py-3 rounded-xl bg-primary text-ink text-sm font-bold hover:brightness-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 lg:hidden z-50 bg-soft rounded-t-[2rem] pb-safe shadow-[0_-4px_20px_rgba(9,48,48,0.08)]">
        <div className="flex items-center justify-around h-16 px-2">
          <button
            onClick={() => setActiveView('dashboard')}
            aria-label="Dashboard"
            aria-current={activeView === 'dashboard' ? 'page' : undefined}
            className="flex-1 flex justify-center"
          >
            <span className={`w-12 h-11 rounded-2xl flex items-center justify-center transition-all ${activeView === 'dashboard' ? 'bg-primary text-ink' : 'text-ink/70'}`}>
              <LayoutDashboard className="w-6 h-6" />
            </span>
          </button>
          <button
            onClick={() => setActiveView('lancamentos')}
            aria-label="Lançamentos"
            aria-current={activeView === 'lancamentos' ? 'page' : undefined}
            className="flex-1 flex justify-center"
          >
            <span className={`w-12 h-11 rounded-2xl flex items-center justify-center transition-all ${activeView === 'lancamentos' ? 'bg-primary text-ink' : 'text-ink/70'}`}>
              <Receipt className="w-6 h-6" />
            </span>
          </button>
          <button
            onClick={() => {
              setActiveView('settings');
              if (userProfile?.role === 'admin') {
                loadAdminUsers();
              }
            }}
            aria-label="Ajustes"
            aria-current={activeView === 'settings' ? 'page' : undefined}
            className="flex-1 flex justify-center"
          >
            <span className={`w-12 h-11 rounded-2xl flex items-center justify-center transition-all ${activeView === 'settings' ? 'bg-primary text-ink' : 'text-ink/70'}`}>
              <Settings className="w-6 h-6" />
            </span>
          </button>
          <button onClick={handleLogout} aria-label="Sair" className="flex-1 flex justify-center">
            <span className="w-12 h-11 rounded-2xl flex items-center justify-center text-ink/70">
              <LogOut className="w-6 h-6" />
            </span>
          </button>
        </div>
      </nav>

      {showIOSModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white border border-ink/10 p-6 rounded-3xl max-w-sm w-full space-y-4 text-center shadow-2xl relative animate-in fade-in zoom-in-95">
            <button onClick={() => setShowIOSModal(false)} className="absolute top-4 right-4 p-1 text-ink/65 hover:text-ink rounded-lg">
              <X className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto text-primary-dark">
              <Smartphone className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-lg text-ink">Instalar no iPhone / iPad</h3>
            <div className="text-xs text-ink/80 space-y-2 text-left bg-soft p-4 rounded-2xl border border-ink/10">
              <p className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/20 text-primary-dark font-bold flex items-center justify-center text-[10px] shrink-0">1</span>
                <span>Toque no botão <strong className="text-primary-dark">Compartilhar</strong> no Safari (ícone com quadrado e seta).</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/20 text-primary-dark font-bold flex items-center justify-center text-[10px] shrink-0">2</span>
                <span>Role para baixo e selecione <strong className="text-ink">'Adicionar à Tela de Início'</strong>.</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/20 text-primary-dark font-bold flex items-center justify-center text-[10px] shrink-0">3</span>
                <span>Pronto! O ZimFinance funcionará como App nativo no seu iPhone.</span>
              </p>
              <button onClick={() => setShowIOSModal(false)} className="w-full bg-primary text-ink font-bold py-2.5 rounded-xl hover:bg-primary transition-all cursor-pointer">
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}

      {(saveFailed || notice) && (
        <div className="fixed bottom-24 lg:bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-md" role="status">
          {saveFailed ? (
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-rose-500/30 bg-rose-950/90 text-sm text-rose-200 shadow-2xl">
              <span className="flex-1">Não foi possível salvar sua última alteração. Recarregue para ver o que está gravado.</span>
              <button onClick={() => window.location.reload()} className="shrink-0 px-3 py-1.5 rounded-lg bg-rose-500 text-white text-xs font-bold">
                Recarregar
              </button>
            </div>
          ) : (
            <div className="px-4 py-3 rounded-2xl border border-transparent bg-brand-blue text-sm text-white shadow-2xl">
              {notice}
            </div>
          )}
        </div>
      )}

      <CategoryManagerModal
        isOpen={isCategoryModalOpen}
        onClose={() => {
          setCategoryModalOpen(false);
          setCategoryTarget(null);
        }}
        customCategories={customCategories}
        onCreate={createCategory}
        onDelete={deleteCategory}
      />

      <CardManagementModal
        isOpen={isCardModalOpen}
        onClose={() => setCardModalOpen(false)}
        cards={cards.filter(card => isCardActiveInMonth(card, currentMonthId))}
        onAddCard={handleAddCard}
        onUpdateCard={handleUpdateCard}
        onDeleteCard={handleDeleteCard}
        onAddCardExpense={handleModalAddCardExpense}
      />
    </div>
  );
}
