-- Add closing_day and due_day to items table (used for credit cards)
ALTER TABLE public.items
ADD COLUMN closing_day integer,
ADD COLUMN due_day integer;

-- Add purchase_date to card_expenses to track when the expense was actually made
ALTER TABLE public.card_expenses
ADD COLUMN purchase_date date;
