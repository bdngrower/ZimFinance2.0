import React, { useState, useEffect } from 'react';
import { Mic, Send, Loader2 } from 'lucide-react';
import { parseExpenseText, ParsedExpense } from '../lib/nlpParser';

interface QuickEntryInputProps {
  onAddEntry: (expense: ParsedExpense) => void;
}

export function QuickEntryInput({ onAddEntry }: QuickEntryInputProps) {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

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
        const parsed = parseExpenseText(transcript);
        onAddEntry(parsed);
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
  }, [onAddEntry]);

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
    
    const parsed = parseExpenseText(text);
    onAddEntry(parsed);
    setText('');
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700 p-4 mb-6 shadow-xl">
      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ex: 50,00 Gasolina hoje..."
            className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-inner"
          />
        </div>
        
        {recognition && (
          <button
            type="button"
            onClick={handleVoiceClick}
            className={`p-3 rounded-xl transition-all shadow-lg flex-shrink-0 ${
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
          disabled={!text.trim()}
          className="p-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/20 flex-shrink-0 border border-emerald-400/50"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
      <p className="text-xs text-slate-400 mt-2 ml-1 opacity-80">
        Digite ou fale o valor e a descrição para lançar rapidamente.
      </p>
    </div>
  );
}
