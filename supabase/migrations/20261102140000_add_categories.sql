-- Categorias: as padrão ficam no código, e as criadas pelo usuário nesta tabela.
-- Lançamento sem categoria conta como "Outros".
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'tag',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own categories"
    ON public.categories FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own categories"
    ON public.categories FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories"
    ON public.categories FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories"
    ON public.categories FOR DELETE
    USING (auth.uid() = user_id);

ALTER TABLE public.items ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.card_expenses ADD COLUMN IF NOT EXISTS category TEXT;

-- Classifica os lançamentos existentes pelo nome, com as regras de src/lib/categories.ts
UPDATE public.items SET category = CASE
        WHEN translate(lower(name), 'ãáàâéêíóôõúç', 'aaaaeeiooouc') ~ '\m(mercado livre\M|shopee\M|amazon\M)' THEN NULL
        WHEN translate(lower(name), 'ãáàâéêíóôõúç', 'aaaaeeiooouc') ~ '\m(netflix\M|spotify\M|youtube\M|google one\M|google ai\M|claude\M|chatgpt\M|disney\M|prime video\M|hbo\M|globoplay\M|deezer\M|anuidade\M)' THEN 'assinaturas'
        WHEN translate(lower(name), 'ãáàâéêíóôõúç', 'aaaaeeiooouc') ~ '\m(aluguel\M|agua\M|energia\M|luz\M|condominio\M|iptu\M|medidor\M|internet\M|roteador\M|claro\M|vivo\M|tim\M|gas\M)' THEN 'moradia'
        WHEN translate(lower(name), 'ãáàâéêíóôõúç', 'aaaaeeiooouc') ~ '\m(mercado\M|supermercado\M|emporio\M|atacadao\M|hortifruti\M|feira\M)' THEN 'mercado'
        WHEN translate(lower(name), 'ãáàâéêíóôõúç', 'aaaaeeiooouc') ~ '\m(almoco\M|jantar\M|acai\M|churrasc|mequi\M|mcdonalds\M|subway\M|sorveteria\M|american mania\M|restaurante\M|lanche|pizza|cafe\M|ifood\M|padaria\M|burger|adega\M)' THEN 'alimentacao'
        WHEN translate(lower(name), 'ãáàâéêíóôõúç', 'aaaaeeiooouc') ~ '\m(gasolina\M|posto\M|combustivel\M|etanol\M|uber\M|99\M|estacionamento\M|sem parar\M|pedagio\M|oficina\M|carro\M|moto\M|s10\M|clio\M|ipva\M|seguro auto\M)' THEN 'transporte'
        WHEN translate(lower(name), 'ãáàâéêíóôõúç', 'aaaaeeiooouc') ~ '\m(drog|farmacia\M|dental\M|dentista\M|medico\M|consulta\M|exame|oculos\M|academia\M|plano de saude\M)' THEN 'saude'
        WHEN translate(lower(name), 'ãáàâéêíóôõúç', 'aaaaeeiooouc') ~ '\m(viagem\M|airbnb\M|festa|cinema\M|niver\M|show\M|maria fumaca\M|forro\M|hookah\M)' THEN 'lazer'
        WHEN translate(lower(name), 'ãáàâéêíóôõúç', 'aaaaeeiooouc') ~ '\m(faculdade\M|escola\M|curso|livro)' THEN 'educacao'
    END
WHERE type LIKE 'expense\_%';

UPDATE public.card_expenses SET category = CASE
        WHEN translate(lower(name), 'ãáàâéêíóôõúç', 'aaaaeeiooouc') ~ '\m(mercado livre\M|shopee\M|amazon\M)' THEN NULL
        WHEN translate(lower(name), 'ãáàâéêíóôõúç', 'aaaaeeiooouc') ~ '\m(netflix\M|spotify\M|youtube\M|google one\M|google ai\M|claude\M|chatgpt\M|disney\M|prime video\M|hbo\M|globoplay\M|deezer\M|anuidade\M)' THEN 'assinaturas'
        WHEN translate(lower(name), 'ãáàâéêíóôõúç', 'aaaaeeiooouc') ~ '\m(aluguel\M|agua\M|energia\M|luz\M|condominio\M|iptu\M|medidor\M|internet\M|roteador\M|claro\M|vivo\M|tim\M|gas\M)' THEN 'moradia'
        WHEN translate(lower(name), 'ãáàâéêíóôõúç', 'aaaaeeiooouc') ~ '\m(mercado\M|supermercado\M|emporio\M|atacadao\M|hortifruti\M|feira\M)' THEN 'mercado'
        WHEN translate(lower(name), 'ãáàâéêíóôõúç', 'aaaaeeiooouc') ~ '\m(almoco\M|jantar\M|acai\M|churrasc|mequi\M|mcdonalds\M|subway\M|sorveteria\M|american mania\M|restaurante\M|lanche|pizza|cafe\M|ifood\M|padaria\M|burger|adega\M)' THEN 'alimentacao'
        WHEN translate(lower(name), 'ãáàâéêíóôõúç', 'aaaaeeiooouc') ~ '\m(gasolina\M|posto\M|combustivel\M|etanol\M|uber\M|99\M|estacionamento\M|sem parar\M|pedagio\M|oficina\M|carro\M|moto\M|s10\M|clio\M|ipva\M|seguro auto\M)' THEN 'transporte'
        WHEN translate(lower(name), 'ãáàâéêíóôõúç', 'aaaaeeiooouc') ~ '\m(drog|farmacia\M|dental\M|dentista\M|medico\M|consulta\M|exame|oculos\M|academia\M|plano de saude\M)' THEN 'saude'
        WHEN translate(lower(name), 'ãáàâéêíóôõúç', 'aaaaeeiooouc') ~ '\m(viagem\M|airbnb\M|festa|cinema\M|niver\M|show\M|maria fumaca\M|forro\M|hookah\M)' THEN 'lazer'
        WHEN translate(lower(name), 'ãáàâéêíóôõúç', 'aaaaeeiooouc') ~ '\m(faculdade\M|escola\M|curso|livro)' THEN 'educacao'
    END;
