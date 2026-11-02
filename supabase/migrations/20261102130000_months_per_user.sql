-- Cada usuário passa a ter os próprios meses: o id do mês deixa de ser único no banco inteiro.
ALTER TABLE public.items DROP CONSTRAINT items_month_id_fkey;
ALTER TABLE public.months DROP CONSTRAINT months_pkey;
ALTER TABLE public.months ADD CONSTRAINT months_pkey PRIMARY KEY (user_id, id);

-- Quem tem lançamentos em um mês criado por outro usuário recebe o próprio registro desse mês
INSERT INTO public.months (id, user_id, year, month_name, recurring_synced)
SELECT DISTINCT ON (i.user_id, i.month_id) i.month_id, i.user_id, m.year, m.month_name, true
FROM public.items i
JOIN public.months m ON m.id = i.month_id
WHERE NOT EXISTS (
    SELECT 1 FROM public.months own WHERE own.id = i.month_id AND own.user_id = i.user_id
)
ORDER BY i.user_id, i.month_id;

ALTER TABLE public.items
    ADD CONSTRAINT items_month_id_fkey
    FOREIGN KEY (user_id, month_id) REFERENCES public.months (user_id, id) ON DELETE CASCADE;
