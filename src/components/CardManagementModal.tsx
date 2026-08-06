import React, { useState } from 'react';
import { X, Plus, Trash2, Edit2, Check, CreditCard, Receipt } from 'lucide-react';
import { ExpenseRecord } from '../types';

interface CardManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  cards: ExpenseRecord[];
  onAddCard: (name: string, closingDay: number, dueDay: number) => void;
  onUpdateCard: (id: string, name: string, closingDay: number, dueDay: number) => void;
  onDeleteCard: (id: string) => void;
  onAddCardExpense: (cardId: string) => void;
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
  const [newCardName, setNewCardName] = useState('');
  const [newCardClosing, setNewCardClosing] = useState<number | ''>('');
  const [newCardDue, setNewCardDue] = useState<number | ''>('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editClosing, setEditClosing] = useState<number | ''>('');
  const [editDue, setEditDue] = useState<number | ''>('');

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardName || !newCardClosing || !newCardDue) return;
    onAddCard(newCardName, Number(newCardClosing), Number(newCardDue));
    setNewCardName('');
    setNewCardClosing('');
    setNewCardDue('');
  };

  const startEdit = (card: ExpenseRecord) => {
    setEditingId(card.id);
    setEditName(card.name);
    setEditClosing(card.closing_day || '');
    setEditDue(card.due_day || '');
  };

  const saveEdit = () => {
    if (!editingId || !editName || !editClosing || !editDue) return;
    onUpdateCard(editingId, editName, Number(editClosing), Number(editDue));
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-slate-900 border border-white/10 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Gerenciar Cartões</h2>
              <p className="text-sm text-white/50">Adicione e configure seus cartões de crédito</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          <form onSubmit={handleAdd} className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <h3 className="text-sm font-bold text-white mb-3">Novo Cartão</h3>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-6">
                <input
                  type="text"
                  placeholder="Nome do Cartão"
                  value={newCardName}
                  onChange={e => setNewCardName(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="sm:col-span-2">
                <input
                  type="number"
                  placeholder="Fech."
                  title="Dia de Fechamento"
                  value={newCardClosing}
                  onChange={e => setNewCardClosing(Number(e.target.value))}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-indigo-500"
                  min={1} max={31}
                />
              </div>
              <div className="sm:col-span-2">
                <input
                  type="number"
                  placeholder="Venc."
                  title="Dia de Vencimento"
                  value={newCardDue}
                  onChange={e => setNewCardDue(Number(e.target.value))}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-indigo-500"
                  min={1} max={31}
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={!newCardName || !newCardClosing || !newCardDue}
                  className="w-full h-full min-h-[44px] bg-indigo-500 text-white rounded-xl hover:bg-indigo-400 disabled:opacity-50 flex items-center justify-center font-bold transition-all"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
            <p className="text-[10px] text-white/40 mt-2">
              * Cartões com vencimento até dia 05 entram em <strong>Pagamento</strong>. Após dia 05 entram em <strong>Adiantamento</strong>.
            </p>
          </form>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white mb-3">Cartões Cadastrados</h3>
            {cards.length === 0 ? (
              <p className="text-white/40 text-sm text-center py-4">Nenhum cartão cadastrado.</p>
            ) : (
              cards.map(card => (
                <div key={card.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between group transition-all hover:bg-white/10">
                  
                  {editingId === card.id ? (
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-2 w-full">
                      <div className="sm:col-span-6">
                        <input
                          type="text"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <input
                          type="number"
                          placeholder="Fec"
                          value={editClosing}
                          onChange={e => setEditClosing(Number(e.target.value))}
                          className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                          min={1} max={31}
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <input
                          type="number"
                          placeholder="Ven"
                          value={editDue}
                          onChange={e => setEditDue(Number(e.target.value))}
                          className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                          min={1} max={31}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-white text-base">{card.name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${card.type === 'card_pagamento' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                          {card.type === 'card_pagamento' ? 'Pgto' : 'Adto'}
                        </span>
                      </div>
                      <div className="flex gap-4 text-xs text-white/50 font-medium">
                        <span>Fechamento: dia {card.closing_day || '--'}</span>
                        <span>Vencimento: dia {card.due_day || '--'}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
                    {editingId === card.id ? (
                      <button onClick={saveEdit} className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl hover:bg-emerald-500/30">
                        <Check className="w-4 h-4" />
                      </button>
                    ) : (
                      <>
                        <button 
                          onClick={() => { onClose(); onAddCardExpense(card.id); }} 
                          className="px-3 py-2 bg-white/5 text-white rounded-xl hover:bg-white/10 flex items-center gap-1.5 text-xs font-bold"
                          title="Lançar despesa neste cartão"
                        >
                          <Receipt className="w-4 h-4" />
                          <span className="hidden sm:inline">Lançar</span>
                        </button>
                        <button onClick={() => startEdit(card as any)} className="p-2 text-white/40 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => { if(window.confirm('Excluir cartão e todas suas despesas?')) onDeleteCard(card.id) }} className="p-2 text-white/40 hover:text-rose-400 bg-white/5 hover:bg-rose-500/10 rounded-xl">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>

                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
