-- MyFinAI Supabase Schema
-- 1. Create tables
CREATE TABLE public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    -- references auth.users
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
-- Enum for recurrence
CREATE TYPE public.recurrence_type AS ENUM (
    'monthly',
    'quarterly',
    'semiannual',
    'annual',
    'one_time'
);
CREATE TABLE public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    amount DECIMAL(12, 2) NOT NULL,
    recurrence public.recurrence_type DEFAULT 'monthly',
    next_billing_date DATE,
    is_active BOOLEAN DEFAULT true,
    installment_count INTEGER,
    -- For non-recurring but installment based
    installments_left INTEGER,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    status TEXT DEFAULT 'pending',
    -- pending, paid, cancelled
    due_date DATE NOT NULL,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);
-- 2. Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
-- 3. Create RLS Policies
-- Note: Assuming auth.uid() is the standard way to identify the current user.
CREATE POLICY "Users can manage their own clients" ON public.clients FOR ALL USING (auth.uid() = user_id);
-- Services and transactions depend on the client's ownership
CREATE POLICY "Users can manage services of their own clients" ON public.services FOR ALL USING (
    EXISTS (
        SELECT 1
        FROM public.clients
        WHERE clients.id = services.client_id
            AND clients.user_id = auth.uid()
    )
);
CREATE POLICY "Users can manage transactions of their own services" ON public.transactions FOR ALL USING (
    EXISTS (
        SELECT 1
        FROM public.services
            JOIN public.clients ON services.client_id = clients.id
        WHERE services.id = transactions.service_id
            AND clients.user_id = auth.uid()
    )
);
-- 4. Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now();
RETURN NEW;
END;
$$ language 'plpgsql';
CREATE TRIGGER update_clients_updated_at BEFORE
UPDATE ON public.clients FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_services_updated_at BEFORE
UPDATE ON public.services FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();