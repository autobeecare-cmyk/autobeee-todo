-- AutoBee OS: Break State Cross-Device Synchronization Fix
-- Migration 08: Server-Persisted Break Support
-- SAFE ADDITIVE MIGRATION — no data loss, no schema breaks

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Extend workdays.status to include 'on_break'
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.workdays DROP CONSTRAINT IF EXISTS workdays_status_check;
ALTER TABLE public.workdays ADD CONSTRAINT workdays_status_check
  CHECK (status IN ('working', 'completed', 'leave', 'on_break'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Extend workday_events.event_type to include break events
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.workday_events DROP CONSTRAINT IF EXISTS workday_events_event_type_check;
ALTER TABLE public.workday_events ADD CONSTRAINT workday_events_event_type_check
  CHECK (event_type IN (
    'check_in',
    'check_out',
    'auto_leave',
    'auto_check_out',
    'check_in_reminder',
    'break_start',
    'break_end'
  ));

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Add denormalized total_break_ms column to workdays
--    Updated on every break_end and on auto-checkout.
--    Allows analytics queries without N+1 event lookups.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.workdays ADD COLUMN IF NOT EXISTS total_break_ms BIGINT NOT NULL DEFAULT 0;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Add break_started_at for quick access to current break start timestamp
--    Cleared when resume happens; set when break starts.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.workdays ADD COLUMN IF NOT EXISTS break_started_at TIMESTAMPTZ DEFAULT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Update auto_close_workdays_7pm() to handle 'on_break' status
--    Previously only closed 'working' status workdays.
--    Now also closes 'on_break' — inserts break_end + auto_check_out events.
-- ─────────────────────────────────────────────────────────────────────────────
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
    break_duration_ms bigint;
BEGIN
    target_date := COALESCE(override_date, (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date);

    FOR r IN
        SELECT id, founder_name, check_in_at, status, break_started_at, total_break_ms
        FROM public.workdays
        WHERE work_date = target_date AND status IN ('working', 'on_break')
    LOOP
        break_duration_ms := r.total_break_ms;

        -- If currently on break, close the active break first
        IF r.status = 'on_break' AND r.break_started_at IS NOT NULL THEN
            break_duration_ms := break_duration_ms +
                EXTRACT(EPOCH FROM (now_ts - r.break_started_at)) * 1000;

            -- Insert break_end event
            INSERT INTO public.workday_events (workday_id, founder_name, event_type, timestamp, metadata)
            VALUES (
                r.id,
                r.founder_name,
                'break_end',
                now_ts,
                jsonb_build_object('source', 'auto_7pm', 'auto_ended_break', true)
            );
        END IF;

        -- Update workday to completed
        UPDATE public.workdays
        SET
            status = 'completed',
            check_out_at = now_ts,
            check_out_source = 'auto_7pm',
            total_break_ms = break_duration_ms,
            break_started_at = NULL,
            updated_at = now_ts
        WHERE id = r.id;

        -- Record auto_check_out audit event
        INSERT INTO public.workday_events (workday_id, founder_name, event_type, timestamp, metadata)
        VALUES (
            r.id,
            r.founder_name,
            'auto_check_out',
            now_ts,
            jsonb_build_object('source', 'auto_7pm')
        );

        -- In-app notification (idempotent)
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

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Re-register pg_cron schedule (if extension available)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.unschedule('autobee_auto_checkout_7pm');
        PERFORM cron.schedule(
            'autobee_auto_checkout_7pm',
            '30 13 * * 1-5',
            'SELECT public.auto_close_workdays_7pm();'
        );
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'pg_cron scheduling skipped: %', SQLERRM;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Instantly reload PostgREST schema cache
-- ─────────────────────────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

