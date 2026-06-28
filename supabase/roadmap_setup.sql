-- 1. Create Roadmap Phases table
CREATE TABLE IF NOT EXISTS public.roadmap_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    owner TEXT NOT NULL, -- 'Sourabh' | 'Asher' | 'Subin' | 'All'
    priority TEXT NOT NULL DEFAULT 'medium', -- 'urgent' | 'high' | 'medium' | 'low'
    start_date DATE,
    target_date DATE,
    completion_percentage NUMERIC(5, 2) DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'upcoming', -- 'locked' | 'upcoming' | 'active' | 'completed'
    notes TEXT,
    dependencies JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Roadmap Objectives table
CREATE TABLE IF NOT EXISTS public.roadmap_objectives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phase_id UUID REFERENCES public.roadmap_phases(id) ON DELETE CASCADE,
    goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    owner TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium',
    start_date DATE,
    target_date DATE,
    completion_percentage NUMERIC(5, 2) DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'upcoming',
    notes TEXT,
    dependencies JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create Key Results table (linked to existing goals for OKRs)
CREATE TABLE IF NOT EXISTS public.key_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID REFERENCES public.goals(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    target_value NUMERIC(12, 2) DEFAULT 100.00,
    current_value NUMERIC(12, 2) DEFAULT 0.00,
    completion_percentage NUMERIC(5, 2) DEFAULT 0.00, -- current_value / target_value
    status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'completed' | 'paused'
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create Roadmap Milestones table
CREATE TABLE IF NOT EXISTS public.roadmap_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    objective_id UUID REFERENCES public.roadmap_objectives(id) ON DELETE CASCADE,
    key_result_id UUID REFERENCES public.key_results(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    owner TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium',
    start_date DATE,
    target_date DATE,
    completion_percentage NUMERIC(5, 2) DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'upcoming',
    notes TEXT,
    dependencies JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Create Roadmap Epics table (grouping tasks under milestones)
CREATE TABLE IF NOT EXISTS public.roadmap_epics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    milestone_id UUID REFERENCES public.roadmap_milestones(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    owner TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium',
    start_date DATE,
    target_date DATE,
    completion_percentage NUMERIC(5, 2) DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'upcoming',
    notes TEXT,
    dependencies JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Link Tasks table to Milestones and Epics
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS milestone_id UUID REFERENCES public.roadmap_milestones(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS epic_id UUID REFERENCES public.roadmap_epics(id) ON DELETE SET NULL;

-- 7. Create Roadmap Hiring table
CREATE TABLE IF NOT EXISTS public.roadmap_hiring (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phase_id UUID REFERENCES public.roadmap_phases(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    department TEXT,
    owner TEXT NOT NULL,
    budget NUMERIC(10, 2) DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'upcoming', -- 'upcoming' | 'open' | 'filled'
    start_date DATE,
    target_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Create Roadmap Marketing table
CREATE TABLE IF NOT EXISTS public.roadmap_marketing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phase_id UUID REFERENCES public.roadmap_phases(id) ON DELETE CASCADE,
    campaign_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'upcoming', -- 'upcoming' | 'active' | 'completed'
    budget NUMERIC(10, 2) DEFAULT 0.00,
    expected_outcome TEXT,
    deadline DATE,
    completion_percentage NUMERIC(5, 2) DEFAULT 0.00,
    owner TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Create Roadmap Finance projections table
CREATE TABLE IF NOT EXISTS public.roadmap_finance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phase_id UUID REFERENCES public.roadmap_phases(id) ON DELETE CASCADE,
    month_name TEXT NOT NULL, -- e.g., "Month 1", "Jan 2027"
    projected_bookings INTEGER DEFAULT 0,
    projected_revenue NUMERIC(12, 2) DEFAULT 0.00,
    actual_revenue NUMERIC(12, 2) DEFAULT 0.00,
    monthly_target NUMERIC(12, 2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Create Roadmap Risks table
CREATE TABLE IF NOT EXISTS public.roadmap_risks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    probability TEXT NOT NULL DEFAULT 'Medium', -- 'High' | 'Medium' | 'Low'
    impact TEXT NOT NULL DEFAULT 'Medium', -- 'Critical' | 'High' | 'Medium' | 'Low'
    owner TEXT NOT NULL,
    mitigation TEXT,
    status TEXT NOT NULL DEFAULT 'open', -- 'open' | 'resolved' | 'critical'
    milestone_id UUID REFERENCES public.roadmap_milestones(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Supabase Realtime for the new tables (if not already added)
ALTER PUBLICATION supabase_realtime ADD TABLE public.roadmap_phases;
ALTER PUBLICATION supabase_realtime ADD TABLE public.roadmap_objectives;
ALTER PUBLICATION supabase_realtime ADD TABLE public.roadmap_milestones;
ALTER PUBLICATION supabase_realtime ADD TABLE public.roadmap_epics;
ALTER PUBLICATION supabase_realtime ADD TABLE public.key_results;
ALTER PUBLICATION supabase_realtime ADD TABLE public.roadmap_hiring;
ALTER PUBLICATION supabase_realtime ADD TABLE public.roadmap_marketing;
ALTER PUBLICATION supabase_realtime ADD TABLE public.roadmap_finance;
ALTER PUBLICATION supabase_realtime ADD TABLE public.roadmap_risks;

-- Disable Row Level Security (RLS) on all roadmap tables for local development
ALTER TABLE public.roadmap_phases DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_objectives DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_milestones DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_epics DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.key_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_hiring DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_marketing DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_finance DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_risks DISABLE ROW LEVEL SECURITY;
