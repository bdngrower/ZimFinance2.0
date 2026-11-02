-- Cadastro único de cartões: cada mês passa a ter uma instância ligada ao cartão,
-- com a escolha explícita de contabilizar em Pagamento ou Adiantamento (vale).
CREATE TABLE IF NOT EXISTS public.cards (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    closing_day INTEGER CHECK (closing_day BETWEEN 1 AND 31),
    due_day INTEGER CHECK (due_day BETWEEN 1 AND 31),
    accounting_source TEXT NOT NULL DEFAULT 'pagamento' CHECK (accounting_source IN ('pagamento', 'vale')),
    start_month TEXT NOT NULL,
    end_month TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cards"
    ON public.cards FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cards"
    ON public.cards FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cards"
    ON public.cards FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cards"
    ON public.cards FOR DELETE
    USING (auth.uid() = user_id);

ALTER TABLE public.items ADD COLUMN IF NOT EXISTS card_id TEXT REFERENCES public.cards(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS items_card_id_month_id_key ON public.items (card_id, month_id);

-- Parcelamento: as parcelas de uma compra ficam ligadas pelo grupo
ALTER TABLE public.card_expenses ADD COLUMN IF NOT EXISTS installment_group_id TEXT;
ALTER TABLE public.card_expenses ADD COLUMN IF NOT EXISTS installment_number INTEGER;
ALTER TABLE public.card_expenses ADD COLUMN IF NOT EXISTS installment_total INTEGER;

-- Meses pré-criados pela recorrência ainda precisam receber os demais recorrentes ao abrir
ALTER TABLE public.months ADD COLUMN IF NOT EXISTS recurring_synced BOOLEAN NOT NULL DEFAULT false;
UPDATE public.months SET recurring_synced = true;

-- Converte os cartões existentes: linhas do mesmo cartão são agrupadas pelo nome sem acentos,
-- usando o nome mais recente de cada grupo de recorrência.
CREATE TEMP TABLE legacy_card_items AS
SELECT
    i.id,
    i.user_id,
    i.month_id,
    i.type,
    i.closing_day,
    i.due_day,
    i.is_recurring,
    i.created_at,
    coalesce(i.pagamento, 0) + coalesce(i.vale, 0) AS base_amount,
    translate(lower(trim(CASE
        WHEN i.recurring_group_id IS NOT NULL THEN first_value(i.name) OVER (PARTITION BY i.user_id, i.recurring_group_id ORDER BY i.month_id DESC)
        ELSE i.name
    END)), 'ãáàâéêíóôõúç', 'aaaaeeiooouc') AS card_key,
    trim(CASE
        WHEN i.recurring_group_id IS NOT NULL THEN first_value(i.name) OVER (PARTITION BY i.user_id, i.recurring_group_id ORDER BY i.month_id DESC)
        ELSE i.name
    END) AS card_name
FROM public.items i
WHERE i.type LIKE 'card\_%' AND i.user_id IS NOT NULL AND trim(coalesce(i.name, '')) <> '';

INSERT INTO public.cards (id, user_id, name, closing_day, due_day, accounting_source, start_month, end_month)
SELECT
    substr(md5(user_id::text || ':' || card_key), 1, 12),
    user_id,
    (array_agg(card_name ORDER BY month_id DESC, base_amount DESC))[1],
    (array_agg(closing_day ORDER BY month_id DESC) FILTER (WHERE closing_day BETWEEN 1 AND 31))[1],
    (array_agg(due_day ORDER BY month_id DESC) FILTER (WHERE due_day BETWEEN 1 AND 31))[1],
    CASE WHEN (array_agg(type ORDER BY month_id DESC, base_amount DESC))[1] = 'card_vale' THEN 'vale' ELSE 'pagamento' END,
    min(month_id),
    -- Cartão sem uso há mais de um mês e sem recorrência fica encerrado no último mês em que apareceu
    CASE
        WHEN max(month_id) >= to_char(now() - interval '1 month', 'YYYY-MM')
          OR coalesce((array_agg(is_recurring ORDER BY month_id DESC, base_amount DESC))[1], false) THEN NULL
        ELSE max(month_id)
    END
FROM legacy_card_items
GROUP BY user_id, card_key
ON CONFLICT (id) DO NOTHING;

-- Se o mesmo cartão aparecer duas vezes no mês, só a linha de maior valor é vinculada
UPDATE public.items i
SET card_id = linked.card_id
FROM (
    SELECT id, card_id
    FROM (
        SELECT
            id,
            substr(md5(user_id::text || ':' || card_key), 1, 12) AS card_id,
            row_number() OVER (PARTITION BY user_id, card_key, month_id ORDER BY base_amount DESC, created_at, id) AS position
        FROM legacy_card_items
    ) ranked
    WHERE position = 1
) linked
WHERE i.id = linked.id;

UPDATE public.items i
SET closing_day = coalesce(i.closing_day, c.closing_day),
    due_day = coalesce(i.due_day, c.due_day)
FROM public.cards c
WHERE i.card_id = c.id;

DROP TABLE legacy_card_items;
