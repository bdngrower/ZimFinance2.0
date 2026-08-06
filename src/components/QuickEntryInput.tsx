import React, { useState, useEffect, useMemo } from 'react';
import { Mic, Send, Loader2, CreditCard, Calendar } from 'lucide-react';
import { parseExpenseText, ParsedExpense } from '../lib/nlpParser';

interface QuickEntryInputProps {
  onAddEntry: (expense: ParsedExpense) => void;
  cards: any[];
}

export function QuickEntryInput({ onAddEntry, cards }: QuickEntryInputProps) {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  const parsed = useMemo(() => parseExpenseText(text, cards), [text, cards]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'pt-BR';

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setText(transcript);
        setIsListening(false);
        // Automatically parse and add when voice finishes
        const parsedVoice = parseExpenseText(transcript, cards);
        onAddEntry(parsedVoice);
        setText('');
      };

      rec.onerror = () => {
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      setRecognition(rec);
    }
  }, [onAddEntry, cards]);

  const handleVoiceClick = () => {
    if (isListening) {
      recognition?.stop();
      setIsListening(false);
    } else {
      recognition?.start();
      setIsListening(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    
    onAddEntry(parsed);
    setText('');
  };

  const detectedCard = parsed.targetCardId ? cards.find(c => c.id === parsed.targetCardId) : null;

  return (
    <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700 p-4 mb-6 shadow-xl">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ex: 20 uber no cartão Neon / 30 café no dia 05"
            className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-inner"
          />
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {recognition && (
            <button
              type="button"
              onClick={handleVoiceClick}
              className={`p-3 rounded-xl transition-all shadow-lg flex-shrink-0 flex-1 sm:flex-none flex items-center justify-center ${
                isListening 
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50 animate-pulse' 
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white border border-slate-600'
              }`}
              title="Lançamento por voz"
            >
              {isListening ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
            </button>
          )}

          <button
            type="submit"
            disabled={!text.trim() || !parsed.amount}
            className="p-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/20 flex-shrink-0 flex-1 sm:flex-none flex items-center justify-center border border-emerald-400/50"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
      
      <div className="flex flex-wrap items-center gap-2 mt-3 min-h-[24px]">
        {parsed.amount && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            R$ {parsed.amount.toFixed(2)}
          </span>
        )}
        {parsed.description && (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded bg-white/5 text-white/70 border border-white/10">
            {parsed.description}
          </span>
        )}
        {detectedCard && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <CreditCard className="w-3 h-3" />
            {detectedCard.name}
          </span>
        )}
        {parsed.period && !detectedCard && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <Calendar className="w-3 h-3" />
            {parsed.period === 'pagamento' ? 'Pagamento' : 'Adiantamento'}
          </span>
        )}
      </div>
    </div>
  );
}
