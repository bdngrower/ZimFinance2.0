-- Adicionar colunas para despesas recorrentes na tabela items
ALTER TABLE items ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE items ADD COLUMN IF NOT EXISTS recurring_group_id TEXT;

-- Adicionar colunas para despesas recorrentes na tabela card_expenses (conforme solicitado para cartões também)
ALTER TABLE card_expenses ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE card_expenses ADD COLUMN IF NOT EXISTS recurring_group_id TEXT;
