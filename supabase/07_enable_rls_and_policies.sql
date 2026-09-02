-- AutoBee OS: Phase 6 Production Hardening
-- Migration 07: Row Level Security (RLS) Baseline Hardening
-- Enables RLS on core tables while establishing baseline policies

-- 1. Enable RLS on core tables
ALTER TABLE public.workdays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workday_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

-- 2. Create permissive baseline policies for app client and service role
-- (Allows app operation while restricting schema-level sabotage)
DO $$
BEGIN
    -- Workdays policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workdays' AND policyname = 'Allow public access to workdays') THEN
        CREATE POLICY "Allow public access to workdays" ON public.workdays FOR ALL USING (true) WITH CHECK (true);
    END IF;

    -- Workday events policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workday_events' AND policyname = 'Allow public access to workday_events') THEN
        CREATE POLICY "Allow public access to workday_events" ON public.workday_events FOR ALL USING (true) WITH CHECK (true);
    END IF;

    -- Settlements policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'settlements' AND policyname = 'Allow public access to settlements') THEN
        CREATE POLICY "Allow public access to settlements" ON public.settlements FOR ALL USING (true) WITH CHECK (true);
    END IF;

    -- Notifications policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Allow public access to notifications') THEN
        CREATE POLICY "Allow public access to notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);
    END IF;

    -- Push tokens policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'push_tokens' AND policyname = 'Allow public access to push_tokens') THEN
        CREATE POLICY "Allow public access to push_tokens" ON public.push_tokens FOR ALL USING (true) WITH CHECK (true);
    END IF;

    -- Notification log policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notification_log' AND policyname = 'Allow public access to notification_log') THEN
        CREATE POLICY "Allow public access to notification_log" ON public.notification_log FOR ALL USING (true) WITH CHECK (true);
    END IF;
END;
$$;
