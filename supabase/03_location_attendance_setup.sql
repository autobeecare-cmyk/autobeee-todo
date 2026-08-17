-- AutoBee OS Location-Based Attendance Database Setup
-- SAFE ADDITIVE MIGRATION ONLY - DOES NOT DELETE OR OVERWRITE EXISTING DATA

-- 1. Safely add location columns to workdays table
ALTER TABLE public.workdays ADD COLUMN IF NOT EXISTS check_in_latitude DOUBLE PRECISION;
ALTER TABLE public.workdays ADD COLUMN IF NOT EXISTS check_in_longitude DOUBLE PRECISION;
ALTER TABLE public.workdays ADD COLUMN IF NOT EXISTS check_in_accuracy DOUBLE PRECISION;
ALTER TABLE public.workdays ADD COLUMN IF NOT EXISTS check_in_location_timestamp TIMESTAMPTZ;
ALTER TABLE public.workdays ADD COLUMN IF NOT EXISTS check_in_method TEXT DEFAULT 'location';
ALTER TABLE public.workdays ADD COLUMN IF NOT EXISTS check_out_source TEXT;

-- 2. Add index for faster queries on work_date and status
CREATE INDEX IF NOT EXISTS idx_workdays_date_status ON public.workdays(work_date, status);
CREATE INDEX IF NOT EXISTS idx_workdays_founder_date ON public.workdays(founder_name, work_date);
