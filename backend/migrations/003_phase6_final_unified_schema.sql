-- ==============================================================================
-- SkillGap AI — Migration 003: Unified Schema, Progress Persistence & Security
-- ==============================================================================

-- 1. User Learning Roadmap Progress Persistence
CREATE TABLE IF NOT EXISTS public.user_roadmap_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    report_id UUID REFERENCES public.skill_gap_reports(id) ON DELETE SET NULL,
    completed_resources JSONB NOT NULL DEFAULT '[]'::jsonb,
    completed_objectives JSONB NOT NULL DEFAULT '[]'::jsonb,
    week_completion JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_roadmap_progress_user ON public.user_roadmap_progress (user_id);

-- 2. User Company DSA Progress Persistence
CREATE TABLE IF NOT EXISTS public.user_dsa_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    problem_id TEXT NOT NULL,
    problem_title TEXT,
    company TEXT,
    difficulty TEXT,
    is_solved BOOLEAN NOT NULL DEFAULT TRUE,
    solved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_dsa_progress_user ON public.user_dsa_progress (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_dsa_unique ON public.user_dsa_progress (user_id, problem_id);

-- 3. Unified Cross-Module Linking Columns
DO $$
BEGIN
    -- ats_reports extensions
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ats_reports' AND column_name = 'target_company') THEN
        ALTER TABLE public.ats_reports ADD COLUMN target_company TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ats_reports' AND column_name = 'target_role') THEN
        ALTER TABLE public.ats_reports ADD COLUMN target_role TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ats_reports' AND column_name = 'job_description') THEN
        ALTER TABLE public.ats_reports ADD COLUMN job_description TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ats_reports' AND column_name = 'job_id') THEN
        ALTER TABLE public.ats_reports ADD COLUMN job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_ats_reports_job_id ON public.ats_reports (job_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ats_reports' AND column_name = 'skill_gap_report_id') THEN
        ALTER TABLE public.ats_reports ADD COLUMN skill_gap_report_id UUID REFERENCES public.skill_gap_reports(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_ats_reports_skill_gap_report_id ON public.ats_reports (skill_gap_report_id);
    END IF;

    -- skill_gap_reports extensions
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skill_gap_reports' AND column_name = 'ats_report_id') THEN
        ALTER TABLE public.skill_gap_reports ADD COLUMN ats_report_id UUID REFERENCES public.ats_reports(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_skill_gap_ats_report_id ON public.skill_gap_reports (ats_report_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skill_gap_reports' AND column_name = 'job_description') THEN
        ALTER TABLE public.skill_gap_reports ADD COLUMN job_description TEXT;
    END IF;

    -- applications extensions
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'applications' AND column_name = 'skill_gap_report_id') THEN
        ALTER TABLE public.applications ADD COLUMN skill_gap_report_id UUID REFERENCES public.skill_gap_reports(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_applications_skill_gap_report_id ON public.applications (skill_gap_report_id);
    END IF;

    -- jobs extensions
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'enforce_threshold') THEN
        ALTER TABLE public.jobs ADD COLUMN enforce_threshold BOOLEAN NOT NULL DEFAULT TRUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'company_name') THEN
        ALTER TABLE public.jobs ADD COLUMN company_name TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'company_logo_url') THEN
        ALTER TABLE public.jobs ADD COLUMN company_logo_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'responsibilities') THEN
        ALTER TABLE public.jobs ADD COLUMN responsibilities JSONB NOT NULL DEFAULT '[]'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'qualifications') THEN
        ALTER TABLE public.jobs ADD COLUMN qualifications JSONB NOT NULL DEFAULT '[]'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'deadline') THEN
        ALTER TABLE public.jobs ADD COLUMN deadline TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'status') THEN
        ALTER TABLE public.jobs ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'disclose_threshold') THEN
        ALTER TABLE public.jobs ADD COLUMN disclose_threshold BOOLEAN NOT NULL DEFAULT TRUE;
    END IF;
END $$;

-- 4. Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ats_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_gap_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roadmap_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_dsa_progress ENABLE ROW LEVEL SECURITY;

