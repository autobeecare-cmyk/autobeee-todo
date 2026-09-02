-- AutoBee OS: Phase 6 Production Hardening
-- Migration 05: 7:00 PM Auto-Checkout Procedure & Historical Workdays Cleanup
-- SAFE MIGRATION — Sanitizes unclosed past workdays and creates PostgreSQL auto-close routine

-- 1. One-Time Historical Data Cleanup
-- Any historical workday (work_date before today in IST) that was left in 'working' status
-- is automatically closed at 7:00 PM Asia/Kolkata of that workday.
UPDATE public.workdays
SET
    status = 'completed',
    check_out_at = COALESCE(check_out_at, (work_date + time '19:00:00') AT TIME ZONE 'Asia/Kolkata'),
    check_out_source = 'auto_7pm_cleanup',
    updated_at = now()
WHERE
    work_date < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
    AND status = 'working';

-- Insert corresponding audit trail events for sanitized historical records if missing
INSERT INTO public.workday_events (workday_id, founder_name, event_type, timestamp, metadata)
SELECT
    w.id,
    w.founder_name,
    'auto_check_out',
    w.check_out_at,
    jsonb_build_object('source', 'auto_7pm_cleanup', 'remediated', true)
FROM public.workdays w
WHERE
    w.check_out_source = 'auto_7pm_cleanup'
    AND NOT EXISTS (
        SELECT 1 FROM public.workday_events we
        WHERE we.workday_id = w.id AND we.event_type = 'auto_check_out'
    );

-- 2. Stored Procedure: auto_close_workdays_7pm()
-- Can be called directly by Supabase cron, Edge Functions, or Database Webhooks
CREATE OR REPLACE FUNCTION public.auto_close_workdays_7pm(override_date date DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_date date;
    closed_count integer := 0;
    r RECORD;
    now_ts timestamptz := now();
BEGIN
    target_date := COALESCE(override_date, (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date);

    FOR r IN
        SELECT id, founder_name, check_in_at
        FROM public.workdays
        WHERE work_date = target_date AND status = 'working'
    LOOP
        -- Update workday to completed
        UPDATE public.workdays
        SET
            status = 'completed',
            check_out_at = now_ts,
            check_out_source = 'auto_7pm',
            updated_at = now_ts
        WHERE id = r.id;

        -- Record audit event
        INSERT INTO public.workday_events (workday_id, founder_name, event_type, timestamp, metadata)
        VALUES (r.id, r.founder_name, 'auto_check_out', now_ts, jsonb_build_object('source', 'auto_7pm'));

        -- Record in-app notification
        INSERT INTO public.notifications (event_id, title, body, recipient, actor, type, read, created_at)
        VALUES (
            'workday_autocheckout_' || target_date::text || '_' || r.founder_name,
            'Workday Closed',
            'Your workday was automatically closed at 7:00 PM IST.',
            r.founder_name,
            'System',
            'auto_check_out',
            false,
            now_ts
        )
        ON CONFLICT (event_id) DO NOTHING;

        closed_count := closed_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'date', target_date,
        'closed_count', closed_count,
        'executed_at', now_ts
    );
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.auto_close_workdays_7pm(date) TO anon, authenticated, service_role;

-- 3. pg_cron Setup (If extension is enabled on Supabase project)
-- Schedule to run Monday through Friday at 7:00 PM IST (13:30 UTC):
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Remove existing cron if defined
        PERFORM cron.unschedule('autobee_auto_checkout_7pm');
        -- Register 13:30 UTC Mon-Fri
        PERFORM cron.schedule(
            'autobee_auto_checkout_7pm',
            '30 13 * * 1-5',
            'SELECT public.auto_close_workdays_7pm();'
        );
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- If pg_cron permissions are restricted, gracefully skip
        RAISE NOTICE 'pg_cron scheduling skipped: %', SQLERRM;
END;
$$;
