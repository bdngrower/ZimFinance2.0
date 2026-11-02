import React, { useState } from 'react';
import {
  Baby, Briefcase, Car, Dog, Gift, GraduationCap, HeartPulse, Home, Plane, Plus, Shirt, ShoppingCart, Tag, Ticket, Trash2, Tv, Utensils, X,
} from 'lucide-react';
import { Category, DEFAULT_CATEGORIES } from '../lib/categories';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  home: Home,
  utensils: Utensils,
  cart: ShoppingCart,
  car: Car,
  health: HeartPulse,
  ticket: Ticket,
  tv: Tv,
  education: GraduationCap,
  tag: Tag,
  gift: Gift,
  plane: Plane,
  shirt: Shirt,
  briefcase: Briefcase,
  baby: Baby,
  pet: Dog,
};

export function CategoryIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = ICONS[icon] ?? Tag;
  return <Icon className={className} />;
}

const NEW_CATEGORY = '__nova__';

export function CategorySelect({
  value,
  categories,
  onChange,
  onCreate,
  label,
}: {
  value: string | null | undefined;
  categories: Category[];
  onChange: (categoryId: string | null) => void;
  onCreate: () => void;
  label: string;
}) {
  const selected = categories.some(category => category.id === value) ? value! : 'outros';

  return (
    <select
      value={selected}
      aria-label={`Categoria de ${label}`}
      title="Categoria"
      onChange={e => {
        if (e.target.value === NEW_CATEGORY) {
          onCreate();
        } else {
          onChange(e.target.value === 'outros' ? null : e.target.value);
        }
      }}
      className="[field-sizing:content] max-w-[7rem] shrink-0 bg-soft text-ink text-[10px] font-semibold rounded-md px-1.5 py-0.5 outline-none appearance-none cursor-pointer truncate"
    >
      {categories.map(category => (
        <option key={category.id} value={category.id}>{category.name}</option>
      ))}
      <option value={NEW_CATEGORY}>+ Nova categoria</option>
    </select>
  );
}

export function CategoryManagerModal({
  isOpen,
  onClose,
  customCategories,
  onCreate,
  onDelete,
}: {
  isOpen: boolean;
  onClose: () => void;
  customCategories: Category[];
  onCreate: (name: string, icon: string) => void;
  onDelete: (id: string) => void;
}) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('tag');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim(), icon);
    setName('');
    setIcon('tag');
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-mint rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">Categorias</h2>
          <button onClick={onClose} aria-label="Fechar" className="p-2 text-ink/70 hover:bg-soft rounded-xl transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 bg-white rounded-2xl p-4 shadow-card">
          <h3 className="text-sm font-bold text-ink">Nova categoria</h3>
          <label className="block text-xs font-medium text-ink/70">
            Nome
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Pets"
              className="mt-1.5 w-full bg-soft rounded-xl px-4 py-2.5 text-sm text-ink placeholder-ink/50 outline-none focus:ring-1 focus:ring-primary"
            />
          </label>
          <div role="radiogroup" aria-label="Ícone">
            <span className="block text-xs font-medium text-ink/70 mb-1.5">Ícone</span>
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(ICONS).map(key => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={icon === key}
                  aria-label={key}
                  onClick={() => setIcon(key)}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${icon === key ? 'bg-primary text-ink' : 'bg-soft text-ink/70'}`}
                >
                  <CategoryIcon icon={key} className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>
          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full min-h-[44px] bg-primary text-ink rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
          >
            <Plus className="w-4 h-4" /> Criar categoria
          </button>
        </form>

        <div className="space-y-2">
          <h3 className="text-sm font-bold text-ink">Suas categorias</h3>
          {customCategories.length === 0 ? (
            <p className="text-sm text-ink/65 py-1">Você ainda não criou nenhuma.</p>
          ) : (
            customCategories.map(category => (
              <div key={category.id} className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-card">
                <span className="w-9 h-9 rounded-xl bg-sky-tile text-ink flex items-center justify-center shrink-0">
                  <CategoryIcon icon={category.icon} className="w-4 h-4" />
                </span>
                <span className="flex-1 text-sm font-semibold text-ink truncate">{category.name}</span>
                <button onClick={() => onDelete(category.id)} aria-label={`Excluir ${category.name}`} className="p-2 text-ink/65 hover:text-rose-700 transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-bold text-ink">Categorias padrão</h3>
          <p className="text-xs text-ink/70">
            Já vêm com o app e não podem ser excluídas. A categoria é sugerida pelo nome do lançamento, e você pode trocar quando quiser.
          </p>
          {DEFAULT_CATEGORIES.map(category => (
            <div key={category.id} className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-card">
              <span className="w-9 h-9 rounded-xl bg-sky-tile text-ink flex items-center justify-center shrink-0">
                <CategoryIcon icon={category.icon} className="w-4 h-4" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-ink">{category.name}</span>
                <span className="block text-xs text-ink/70">{category.description}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
