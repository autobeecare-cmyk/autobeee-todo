-- AutoBee OS Additive Migration: Workdays, Expense Splits, Settlements, Notifications
-- SAFE ADDITIVE UPGRADE ONLY - DOES NOT DELETE OR MODIFY EXISTING TABLES OR RECORDS

-- 1. Workdays Table
CREATE TABLE IF NOT EXISTS public.workdays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    founder_name TEXT NOT NULL,
    work_date DATE NOT NULL,
    check_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    check_out_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'working' CHECK (status IN ('working', 'completed', 'leave')),
    progress_notes TEXT,
    blocker_notes TEXT,
    tomorrow_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_founder_work_date UNIQUE(founder_name, work_date)
);

-- 2. Workday Events Audit Trail Table
CREATE TABLE IF NOT EXISTS public.workday_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workday_id UUID REFERENCES public.workdays(id) ON DELETE CASCADE,
    founder_name TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('check_in', 'check_out', 'auto_leave')),
    timestamp TIMESTAMPTZ DEFAULT now(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 3. Expense Splits Table (Linked to existing expenses table)
CREATE TABLE IF NOT EXISTS public.expense_splits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id UUID REFERENCES public.expenses(id) ON DELETE CASCADE,
    expense_type TEXT NOT NULL DEFAULT 'shared_founder' CHECK (expense_type IN ('company', 'shared_founder', 'founder_paid_company', 'founder_specific')),
    paid_by TEXT NOT NULL,
    split_method TEXT NOT NULL DEFAULT 'equal' CHECK (split_method IN ('equal', 'percentage', 'custom')),
    split_details JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_expense_split UNIQUE(expense_id)
);

-- 4. Founder Settlements Table
CREATE TABLE IF NOT EXISTS public.settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payer TEXT NOT NULL,
    payee TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('pending', 'paid')),
    notes TEXT,
    settled_at TIMESTAMPTZ DEFAULT now(),
    confirmed_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    recipient TEXT NOT NULL,
    actor TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('check_in', 'check_out', 'auto_leave', 'settlement', 'expense')),
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Supabase Realtime for all new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.workdays;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workday_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.expense_splits;
ALTER PUBLICATION supabase_realtime ADD TABLE public.settlements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Disable Row Level Security (RLS) for local development
ALTER TABLE public.workdays DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workday_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
