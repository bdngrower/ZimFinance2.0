-- Adicionar coluna is_paid para confirmação de pagamento de despesas e cartões
ALTER TABLE items ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false;
ALTER TABLE card_expenses ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false;
