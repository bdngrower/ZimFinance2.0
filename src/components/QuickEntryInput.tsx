import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Send, CreditCard, Calendar, CheckCircle, DollarSign, Sparkles } from 'lucide-react';
import { parseExpenseText, ParsedExpense } from '../lib/nlpParser';

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

  return (
    <div className="relative mb-4">
      {/* Toasts */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl border backdrop-blur-xl text-sm font-medium animate-[slideIn_0.3s_ease-out] ${
              toast.type === 'card'
                ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300'
                : toast.type === 'vale'
                ? 'bg-amber-500/20 border-amber-500/30 text-amber-300'
                : toast.type === 'error'
                ? 'bg-rose-500/20 border-rose-500/30 text-rose-300'
                : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
            }`}
          >
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Main Card */}
      <div className={`relative overflow-hidden rounded-2xl border transition-all duration-300 ${
        isListening 
          ? 'bg-gradient-to-br from-rose-500/10 via-purple-500/5 to-transparent border-rose-500/30 shadow-lg shadow-rose-500/10' 
          : 'bg-gradient-to-br from-white/5 via-emerald-500/5 to-transparent border-white/10 shadow-xl'
      }`}>
        {/* Subtle glow effect */}
        <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl pointer-events-none transition-all duration-500 ${
          isListening ? 'bg-rose-500/20' : 'bg-emerald-500/10'
        }`} />

        <div className="relative p-4">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Lançamento Rápido</span>
          </div>

          {/* Input Area */}
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={isListening ? 'Ouvindo...' : 'Ex: 20 café cartão Neon'}
                className={`w-full bg-black/30 border rounded-xl pl-9 pr-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none transition-all ${
                  isListening 
                    ? 'border-rose-500/40 focus:border-rose-500' 
                    : 'border-white/10 focus:border-emerald-500'
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
                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/40' 
                    : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10 border border-white/10'
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
              className="p-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0 shadow-lg shadow-emerald-500/20 disabled:shadow-none"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>

          {/* Live Preview Tags */}
          {parsed && (parsed.amount || parsed.description) && (
            <div className="flex flex-wrap items-center gap-1.5 mt-3">
              {parsed.amount != null && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                  R$ {parsed.amount.toFixed(2)}
                </span>
              )}
              {parsed.description && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2.5 py-1 rounded-lg bg-white/5 text-white/60 border border-white/10">
                  {parsed.description}
                </span>
              )}
              {detectedCard && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
                  <CreditCard className="w-3 h-3" />
                  {detectedCard.name}
                </span>
              )}
              {parsed.period && !detectedCard && (
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg border ${
                  parsed.period === 'pagamento' 
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' 
                    : 'bg-amber-500/15 text-amber-400 border-amber-500/20'
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
