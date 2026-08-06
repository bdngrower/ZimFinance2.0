-- Criação das tabelas para o Open Finance

-- Conexões Bancárias
CREATE TABLE IF NOT EXISTS public.bank_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL, -- Ex: 'Nubank', 'Itaú', 'Bradesco'
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'disconnected'
    last_sync TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS e políticas para bank_connections
ALTER TABLE public.bank_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bank connections"
    ON public.bank_connections FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bank connections"
    ON public.bank_connections FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bank connections"
    ON public.bank_connections FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bank connections"
    ON public.bank_connections FOR DELETE
    USING (auth.uid() = user_id);


-- Transações Importadas (Log para evitar duplicatas)
CREATE TABLE IF NOT EXISTS public.imported_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_transaction_id TEXT NOT NULL, -- ID original da transação no banco
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    bank_connection_id UUID REFERENCES public.bank_connections(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    type TEXT NOT NULL, -- 'income' (Pix recebido), 'expense' (Pix enviado, Débito)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(external_transaction_id, user_id) -- Garante que uma transação de um banco não seja importada 2x pelo mesmo user
);

-- Habilitar RLS e políticas para imported_transactions
ALTER TABLE public.imported_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own imported transactions"
    ON public.imported_transactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own imported transactions"
    ON public.imported_transactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);
