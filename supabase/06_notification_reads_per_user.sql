-- AutoBee OS: Phase 6 Production Hardening
-- Migration 06: Per-User Notification Read State
-- Fixes DESIGN-4: Allows notifications targeted to "All" to have independent read/unread states per founder

CREATE TABLE IF NOT EXISTS public.notification_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID REFERENCES public.notifications(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    read_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_user_notification_read UNIQUE(notification_id, user_name)
);

CREATE INDEX IF NOT EXISTS idx_notification_reads_user ON public.notification_reads(user_name);
CREATE INDEX IF NOT EXISTS idx_notification_reads_notif ON public.notification_reads(notification_id);

-- Enable Supabase Realtime for notification_reads
ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_reads;

-- Disable RLS or set permissive for app usage
ALTER TABLE public.notification_reads DISABLE ROW LEVEL SECURITY;
