import React, { useState } from 'react';
import { X, Plus, Trash2, Edit2, CreditCard, Receipt } from 'lucide-react';
import { AccountingSource, Card, isValidDay, suggestAccountingSource } from '../lib/cards';

export type CardFormValues = {
  name: string;
  closingDay: number | null;
  dueDay: number | null;
  source: AccountingSource;
};

interface CardManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  cards: Card[];
  onAddCard: (values: CardFormValues) => void;
  onUpdateCard: (id: string, values: CardFormValues) => void;
  onDeleteCard: (id: string) => void;
  onAddCardExpense: (cardId: string) => void;
}

const SOURCE_LABELS: Record<AccountingSource, string> = {
  pagamento: 'Pagamento',
  vale: 'Adiantamento',
};

function CardForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: Card;
  submitLabel: string;
  onSubmit: (values: CardFormValues) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [closingDay, setClosingDay] = useState(initial?.closing_day ? String(initial.closing_day) : '');
  const [dueDay, setDueDay] = useState(initial?.due_day ? String(initial.due_day) : '');
  const [source, setSource] = useState<AccountingSource>(initial?.accounting_source ?? 'pagamento');
  // A sugestão só preenche a escolha enquanto o usuário não decidiu
  const [sourceChosen, setSourceChosen] = useState(Boolean(initial));

  const closingInvalid = closingDay !== '' && !isValidDay(closingDay);
  const dueInvalid = dueDay !== '' && !isValidDay(dueDay);
  const canSubmit = name.trim() !== '' && !closingInvalid && !dueInvalid;
  const suggestion = isValidDay(dueDay) ? suggestAccountingSource(Number(dueDay)) : null;

  const handleDueChange = (value: string) => {
    setDueDay(value);
    if (!sourceChosen && isValidDay(value)) {
      setSource(suggestAccountingSource(Number(value)));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      name: name.trim(),
      closingDay: closingDay ? Number(closingDay) : null,
      dueDay: dueDay ? Number(dueDay) : null,
      source,
    });
    if (!initial) {
      setName('');
      setClosingDay('');
      setDueDay('');
      setSource('pagamento');
      setSourceChosen(false);
    }
  };

  const inputClass = 'w-full bg-soft border border-ink/10 rounded-xl px-4 py-2.5 text-sm text-ink placeholder-ink/50 focus:outline-none focus:border-brand-blue';
  const labelClass = 'block text-xs font-medium text-ink/70 mb-1.5';

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label className={labelClass}>
          Nome do cartão
          <input
            type="text"
            placeholder="Ex: Nubank"
            value={name}
            onChange={e => setName(e.target.value)}
            className={`${inputClass} mt-1.5`}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className={labelClass}>
          Dia do fechamento
          <input
            type="number"
            inputMode="numeric"
            placeholder="Opcional"
            value={closingDay}
            onChange={e => setClosingDay(e.target.value)}
            className={`${inputClass} mt-1.5 ${closingInvalid ? 'border-rose-500' : ''}`}
            min={1}
            max={31}
          />
        </label>
        <label className={labelClass}>
          Dia do vencimento
          <input
            type="number"
            inputMode="numeric"
            placeholder="Opcional"
            value={dueDay}
            onChange={e => handleDueChange(e.target.value)}
            className={`${inputClass} mt-1.5 ${dueInvalid ? 'border-rose-500' : ''}`}
            min={1}
            max={31}
          />
        </label>
      </div>
      {(closingInvalid || dueInvalid) && (
        <p className="text-xs text-rose-700">Informe um dia entre 1 e 31.</p>
      )}

      <div role="radiogroup" aria-label="Contabilizar em">
        <span className={labelClass}>Contabilizar em</span>
        <div className="grid grid-cols-2 gap-2">
          {(['pagamento', 'vale'] as AccountingSource[]).map(option => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={source === option}
              onClick={() => {
                setSource(option);
                setSourceChosen(true);
              }}
              className={`py-2.5 rounded-xl border text-sm font-bold transition-all ${
                source === option
                  ? option === 'pagamento'
                    ? 'bg-primary/20 border-primary/50 text-primary-dark'
                    : 'bg-brand-blue/20 border-brand-blue/50 text-brand-blue'
                  : 'bg-soft border-ink/10 text-ink/70 hover:text-ink'
              }`}
            >
              {SOURCE_LABELS[option]}
            </button>
          ))}
        </div>
        <p className="text-xs text-ink/65 mt-2">
          {initial
            ? 'Uma mudança aqui vale deste mês em diante. Os meses anteriores não mudam.'
            : suggestion
            ? `Pelo vencimento, sugerimos ${SOURCE_LABELS[suggestion]}. A escolha é sua.`
            : 'O cartão vai aparecer em todos os meses a partir deste.'}
        </p>
      </div>

      <div className="flex gap-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="flex-1 min-h-[44px] bg-soft text-ink/80 rounded-xl hover:bg-ink/5 font-bold text-sm transition-all">
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={!canSubmit}
          className="flex-1 min-h-[44px] bg-brand-blue text-white rounded-xl hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2 font-bold text-sm transition-all"
        >
          {!initial && <Plus className="w-4 h-4" />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

export function CardManagementModal({
  isOpen,
  onClose,
  cards,
  onAddCard,
  onUpdateCard,
  onDeleteCard,
  onAddCardExpense
}: CardManagementModalProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-mint border border-ink/10 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="p-6 border-b border-ink/10 flex items-center justify-between bg-soft">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-blue/20 text-brand-blue rounded-xl">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-ink">Gerenciar Cartões</h2>
              <p className="text-sm text-ink/70">Cadastre uma vez e ele aparece em todos os meses</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="p-2 text-ink/70 hover:text-ink hover:bg-ink/5 rounded-xl transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="bg-soft rounded-2xl p-4 border border-ink/10">
            <h3 className="text-sm font-bold text-ink mb-3">Novo Cartão</h3>
            <CardForm submitLabel="Adicionar cartão" onSubmit={onAddCard} />
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-ink mb-3">Cartões Cadastrados</h3>
            {cards.length === 0 ? (
              <p className="text-ink/65 text-sm text-center py-4">Nenhum cartão cadastrado.</p>
            ) : (
              cards.map(card => (
                <div key={card.id} className="bg-soft border border-ink/10 rounded-2xl p-4 transition-all hover:bg-ink/5">
                  {editingId === card.id ? (
                    <CardForm
                      initial={card}
                      submitLabel="Salvar"
                      onSubmit={values => {
                        onUpdateCard(card.id, values);
                        setEditingId(null);
                      }}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-ink text-base">{card.name}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${card.accounting_source === 'pagamento' ? 'bg-primary/20 text-primary-dark' : 'bg-brand-blue/20 text-brand-blue'}`}>
                            {SOURCE_LABELS[card.accounting_source]}
                          </span>
                        </div>
                        <div className="flex gap-4 text-xs text-ink/70 font-medium">
                          <span>Fechamento: dia {card.closing_day || '--'}</span>
                          <span>Vencimento: dia {card.due_day || '--'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
                        <button
                          onClick={() => { onClose(); onAddCardExpense(card.id); }}
                          className="px-3 py-2 bg-soft text-ink rounded-xl hover:bg-ink/5 flex items-center gap-1.5 text-xs font-bold"
                          title="Lançar despesa neste cartão"
                        >
                          <Receipt className="w-4 h-4" />
                          <span className="hidden sm:inline">Lançar</span>
                        </button>
                        <button onClick={() => setEditingId(card.id)} aria-label={`Editar ${card.name}`} className="p-2 text-ink/65 hover:text-ink bg-soft hover:bg-ink/5 rounded-xl">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => onDeleteCard(card.id)} aria-label={`Excluir ${card.name}`} className="p-2 text-ink/65 hover:text-rose-700 bg-soft hover:bg-rose-500/10 rounded-xl">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
