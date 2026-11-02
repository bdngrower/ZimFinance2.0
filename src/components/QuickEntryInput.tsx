import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Send, CreditCard, Calendar, CheckCircle, DollarSign, Sparkles } from 'lucide-react';
import { parseExpenseText, ParsedExpense } from '../lib/nlpParser';
import { DEFAULT_CATEGORIES, suggestCategory } from '../lib/categories';

interface QuickEntryInputProps {
  onAddEntry: (expense: ParsedExpense) => Promise<void> | void;
  cards: any[];
}

interface Toast {
  id: number;
  message: string;
  type: 'card' | 'pagamento' | 'vale' | 'error';
}

export function QuickEntryInput({ onAddEntry, cards }: QuickEntryInputProps) {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const recognitionRef = useRef<any>(null);
  const cardsRef = useRef(cards);
  const onAddEntryRef = useRef(onAddEntry);
  const toastIdRef = useRef(0);

  // Keep refs up to date
  cardsRef.current = cards;
  onAddEntryRef.current = onAddEntry;

  const showToast = useCallback((message: string, type: Toast['type']) => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  const doAdd = useCallback((parsed: ParsedExpense) => {
    if (!parsed.amount) {
      showToast('Não foi possível identificar o valor na frase.', 'error');
      return;
    }
    
    const cardName = parsed.targetCardId 
      ? cardsRef.current.find(c => c.id === parsed.targetCardId)?.name 
      : null;
    
    onAddEntryRef.current(parsed);

    if (cardName) {
      showToast(`R$ ${parsed.amount.toFixed(2)} "${parsed.description}" → Cartão ${cardName}`, 'card');
    } else if (parsed.period === 'vale') {
      showToast(`R$ ${parsed.amount.toFixed(2)} "${parsed.description}" → Adiantamento`, 'vale');
    } else {
      showToast(`R$ ${parsed.amount.toFixed(2)} "${parsed.description}" → Pagamento`, 'pagamento');
    }
  }, [showToast]);

  useEffect(() => {
    const W = window as any;
    const SpeechRecognition = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'pt-BR';

    rec.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      const parsed = parseExpenseText(transcript, cardsRef.current);
      setText(transcript);
      setIsListening(false);
      
      // Small delay so user can see what was recognized
      setTimeout(() => {
        doAdd(parsed);
        setText('');
      }, 600);
    };

    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);

    recognitionRef.current = rec;
  }, [doAdd]);

  const handleVoiceClick = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    const parsed = parseExpenseText(text, cards);
    doAdd(parsed);
    setText('');
  };

  const parsed = text ? parseExpenseText(text, cards) : null;
  const detectedCard = parsed?.targetCardId ? cards.find(c => c.id === parsed.targetCardId) : null;
  const detectedCategory = DEFAULT_CATEGORIES.find(c => c.id === suggestCategory(parsed?.description));

  return (
    <div className="relative mb-4">
      {/* Toasts */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl border text-sm font-medium animate-[slideIn_0.3s_ease-out] ${
              toast.type === 'card'
                ? 'bg-surface border-brand-blue/30 text-brand-blue'
                : toast.type === 'vale'
                ? 'bg-surface border-amber-500/30 text-amber-700'
                : toast.type === 'error'
                ? 'bg-surface border-rose-500/30 text-rose-700'
                : 'bg-surface border-primary/30 text-primary-dark'
            }`}
          >
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Main Card */}
      <div className={`relative overflow-hidden rounded-3xl border transition-all duration-300 ${
        isListening 
          ? 'bg-surface border-rose-500/30 shadow-card' 
          : 'bg-surface border-transparent shadow-card'
      }`}>

        <div className="relative p-4">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary-dark" />
            <span className="text-[11px] font-bold text-ink/70 uppercase tracking-widest">Lançamento Rápido</span>
          </div>

          {/* Input Area */}
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/50" />
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={isListening ? 'Ouvindo...' : 'Ex: 300 tv cartão Neon em 3x'}
                className={`w-full bg-soft border rounded-xl pl-9 pr-4 py-3 text-sm text-ink placeholder-ink/50 focus:outline-none transition-all ${
                  isListening 
                    ? 'border-rose-500/40 focus:border-rose-500' 
                    : 'border-ink/10 focus:border-primary'
                }`}
                readOnly={isListening}
              />
            </div>

            {/* Mic Button */}
            {recognitionRef.current !== null && (
              <button
                type="button"
                onClick={handleVoiceClick}
                className={`relative p-3 rounded-xl transition-all duration-300 shrink-0 ${
                  isListening 
                    ? 'bg-rose-500 text-white' 
                    : 'bg-soft text-ink/70 hover:text-ink hover:bg-ink/5 border border-ink/10'
                }`}
                title={isListening ? 'Parar' : 'Falar'}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-5 h-5 relative z-10" />
                    <span className="absolute inset-0 rounded-xl bg-rose-500 animate-ping opacity-30" />
                  </>
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </button>
            )}

            {/* Send Button */}
            <button
              type="submit"
              disabled={!text.trim() || !parsed?.amount}
              className="p-3 bg-primary text-ink rounded-xl hover:bg-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0 disabled:shadow-none"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>

          {/* Live Preview Tags */}
          {parsed && (parsed.amount || parsed.description) && (
            <div className="flex flex-wrap items-center gap-1.5 mt-3">
              {parsed.amount != null && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-primary/15 text-primary-dark border border-primary/20">
                  R$ {parsed.amount.toFixed(2)}
                </span>
              )}
              {parsed.description && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2.5 py-1 rounded-lg bg-soft text-ink/70 border border-ink/10">
                  {parsed.description}
                </span>
              )}
              {detectedCard && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-brand-blue/15 text-brand-blue border border-brand-blue/20">
                  <CreditCard className="w-3 h-3" />
                  {detectedCard.name}
                </span>
              )}
              {detectedCategory && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-soft text-ink">
                  {detectedCategory.name}
                </span>
              )}
              {detectedCard && parsed.installments && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-brand-blue/15 text-brand-blue border border-brand-blue/20">
                  {parsed.installments}x
                </span>
              )}
              {parsed.period && !detectedCard && (
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg border ${
                  parsed.period === 'pagamento' 
                    ? 'bg-primary/15 text-primary-dark border-primary/20' 
                    : 'bg-amber-500/15 text-amber-700 border-amber-500/20'
                }`}>
                  <Calendar className="w-3 h-3" />
                  {parsed.period === 'pagamento' ? 'Pagamento' : 'Adiantamento'}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
