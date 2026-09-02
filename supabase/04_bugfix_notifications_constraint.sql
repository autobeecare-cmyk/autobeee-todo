-- AutoBee OS: Bug Fix Migration
-- Run this in the Supabase SQL editor to apply the type constraint fix live.
-- SAFE ADDITIVE MIGRATION — only modifies constraint, does not touch data.

-- BUG-9 fix: Add 'meeting_change' to notifications type check constraint
-- The notify-meeting Edge Function uses this type for non-reminder meeting events,
-- but it was missing from the constraint, causing silent insert failures.
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
        'meeting_change',
        'goal',
        'system'
    )
);
