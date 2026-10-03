-- AutoBee OS: Restructure & Cleanup (Attendance and Roadmap Removal)
-- Migration 09: Safe Archival and Removal of Attendance & Roadmap DB Objects
-- SAFE MIGRATION: Preserves all historical records under archived table names

-- 1. Unschedule any pg_cron background jobs for attendance
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        BEGIN
            PERFORM cron.unschedule('autobee_auto_checkout_7pm');
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
        BEGIN
            PERFORM cron.unschedule('autobee_attendance_reminder');
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'pg_cron unschedule skipped: %', SQLERRM;
END;
$$;

-- 2. Drop obsolete attendance functions
DROP FUNCTION IF EXISTS public.auto_close_workdays_7pm(date);

-- 3. Safely remove tables from Supabase Realtime publication
DO $$
DECLARE
    tbl text;
    tables_to_remove text[] := ARRAY[
        'workdays',
        'workday_events',
        'roadmap_phases',
        'roadmap_objectives',
        'key_results',
        'roadmap_milestones',
        'roadmap_epics',
        'roadmap_hiring',
        'roadmap_marketing',
        'roadmap_finance',
        'roadmap_risks'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables_to_remove LOOP
        IF EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
              AND schemaname = 'public' 
              AND tablename = tbl
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime DROP TABLE public.%I', tbl);
        END IF;
    END LOOP;
END;
$$;

-- 4. Safely Archive Workday & Attendance tables (Preserves all historical logs)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workdays') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '_archived_workdays') THEN
            ALTER TABLE public.workdays RENAME TO _archived_workdays;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workday_events') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '_archived_workday_events') THEN
            ALTER TABLE public.workday_events RENAME TO _archived_workday_events;
        END IF;
    END IF;
END;
$$;

-- 5. Safely Archive Roadmap tables (Preserves all historical roadmap records)
DO $$
DECLARE
    r RECORD;
    roadmap_tables text[] := ARRAY[
        'roadmap_phases',
        'roadmap_objectives',
        'key_results',
        'roadmap_milestones',
        'roadmap_epics',
        'roadmap_hiring',
        'roadmap_marketing',
        'roadmap_finance',
        'roadmap_risks'
    ];
    t text;
BEGIN
    FOREACH t IN ARRAY roadmap_tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
            IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '_archived_' || t) THEN
                EXECUTE format('ALTER TABLE public.%I RENAME TO %I', t, '_archived_' || t);
            END IF;
        END IF;
    END LOOP;
END;
$$;

-- 6. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
