-- AutoBee OS Push Notification & Attendance Database Setup
-- SAFE ADDITIVE MIGRATION ONLY - DOES NOT DELETE OR OVERWRITE EXISTING DATA

-- 1. Push Tokens Table (Supports Multiple Devices Per User)
CREATE TABLE IF NOT EXISTS public.push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_name TEXT NOT NULL,
    fcm_token TEXT NOT NULL,
    platform TEXT NOT NULL DEFAULT 'web',
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_fcm_token UNIQUE(fcm_token)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_active ON public.push_tokens(user_name, is_active);

-- 2. Notifications Table (Ensure constraint allows all app notification types)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    recipient TEXT NOT NULL,
    actor TEXT NOT NULL,
    type TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Drop old check constraint if it was restrictive and add updated one
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (
    type IN (
        'check_in',
        'check_out',
        'auto_leave',
        'auto_check_out',
        'check_in_reminder',
        'settlement',
        'expense',
        'task',
        'task_reminder',
        'meeting',
        'meeting_alert',
        'goal',
        'system'
    )
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient, created_at DESC);

-- 3. Notification Log Table (Audit trail for debugging push notification delivery)
CREATE TABLE IF NOT EXISTS public.notification_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    sent_to TEXT[] DEFAULT '{}',
    tokens_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_log_created ON public.notification_log(created_at DESC);

-- 4. Enable Supabase Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.push_tokens;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 5. Disable RLS for local development
ALTER TABLE public.push_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_log DISABLE ROW LEVEL SECURITY;
