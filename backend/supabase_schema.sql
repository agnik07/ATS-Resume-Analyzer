-- ==============================================================================
-- SkillGap AI — Supabase PostgreSQL Database Schema
-- Run this script in the Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. USERS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'recruiter', 'admin')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    avatar_url TEXT,
    bio TEXT,
    company_name TEXT,
    phone TEXT,
    headline TEXT,
    github_url TEXT,
    linkedin_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users (role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users (created_at DESC);

-- ------------------------------------------------------------------------------
-- 2. RESUMES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_url TEXT,
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    file_type TEXT NOT NULL DEFAULT 'pdf',
    raw_text TEXT NOT NULL DEFAULT '',
    parsed_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    extracted_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    action_verbs JSONB NOT NULL DEFAULT '[]'::jsonb,
    keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON public.resumes (user_id);
CREATE INDEX IF NOT EXISTS idx_resumes_created_at ON public.resumes (created_at DESC);

-- ------------------------------------------------------------------------------
-- 3. ATS REPORTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ats_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    resume_id UUID NOT NULL REFERENCES public.resumes(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    overall_score NUMERIC(5,2) NOT NULL DEFAULT 0.0,
    formatting_score NUMERIC(5,2) NOT NULL DEFAULT 0.0,
    keywords_score NUMERIC(5,2) NOT NULL DEFAULT 0.0,
    content_score NUMERIC(5,2) NOT NULL DEFAULT 0.0,
    skill_validation_score NUMERIC(5,2) NOT NULL DEFAULT 0.0,
    ats_compatibility_score NUMERIC(5,2) NOT NULL DEFAULT 0.0,
    interpretation TEXT NOT NULL DEFAULT '',
    strengths JSONB NOT NULL DEFAULT '[]'::jsonb,
    critical_issues JSONB NOT NULL DEFAULT '[]'::jsonb,
    suggestions JSONB NOT NULL DEFAULT '[]'::jsonb,
    issues_summary JSONB NOT NULL DEFAULT '[]'::jsonb,
    detailed_feedback JSONB NOT NULL DEFAULT '[]'::jsonb,
    recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
    skill_validation_details JSONB NOT NULL DEFAULT '{}'::jsonb,
    penalties JSONB NOT NULL DEFAULT '{}'::jsonb,
    bonuses JSONB NOT NULL DEFAULT '{}'::jsonb,
    github_evidence_score NUMERIC(5,2) DEFAULT 0.0,
    enhanced_ats_score NUMERIC(5,2) DEFAULT 0.0,
    github_evidence JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ats_reports_user_id ON public.ats_reports (user_id);
CREATE INDEX IF NOT EXISTS idx_ats_reports_resume_id ON public.ats_reports (resume_id);
CREATE INDEX IF NOT EXISTS idx_ats_reports_overall_score ON public.ats_reports (overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_ats_reports_created_at ON public.ats_reports (created_at DESC);

-- ------------------------------------------------------------------------------
-- 3b. GITHUB EVIDENCE TABLES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.github_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    username TEXT NOT NULL UNIQUE,
    profile_url TEXT NOT NULL,
    public_repo_count INT DEFAULT 0,
    followers INT DEFAULT 0,
    following INT DEFAULT 0,
    retrieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.github_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    resume_id UUID NOT NULL REFERENCES public.resumes(id) ON DELETE CASCADE,
    ats_report_id UUID NOT NULL REFERENCES public.ats_reports(id) ON DELETE CASCADE,
    github_username TEXT NOT NULL,
    github_evidence_score NUMERIC(5,2) NOT NULL DEFAULT 0.0,
    enhanced_ats_score NUMERIC(5,2) NOT NULL DEFAULT 0.0,
    repositories_analyzed INT DEFAULT 0,
    projects_verified_count INT DEFAULT 0,
    skills_verified_count INT DEFAULT 0,
    project_matches JSONB NOT NULL DEFAULT '[]'::jsonb,
    skill_matches JSONB NOT NULL DEFAULT '[]'::jsonb,
    activity_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    maturity_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    authenticity_analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
    cross_validation_matrix JSONB NOT NULL DEFAULT '[]'::jsonb,
    mismatches JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 4. COMPANIES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    recruiter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    logo_url TEXT,
    website TEXT,
    location TEXT,
    description TEXT,
    industry TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_slug ON public.companies (slug);
CREATE INDEX IF NOT EXISTS idx_companies_recruiter_id ON public.companies (recruiter_id);

-- ------------------------------------------------------------------------------
-- 5. JOBS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    recruiter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    location TEXT NOT NULL,
    job_type TEXT NOT NULL DEFAULT 'Full-time',
    experience_level TEXT NOT NULL DEFAULT 'Mid',
    salary_range TEXT,
    description TEXT NOT NULL,
    required_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    preferred_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
    min_ats_score NUMERIC(5,2) NOT NULL DEFAULT 60.0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON public.jobs (company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_recruiter_id ON public.jobs (recruiter_id);
CREATE INDEX IF NOT EXISTS idx_jobs_is_active ON public.jobs (is_active);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON public.jobs (created_at DESC);

-- ------------------------------------------------------------------------------
-- 6. APPLICATIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    resume_id UUID NOT NULL REFERENCES public.resumes(id) ON DELETE CASCADE,
    ats_report_id UUID REFERENCES public.ats_reports(id) ON DELETE SET NULL,
    ats_score NUMERIC(5,2) NOT NULL DEFAULT 0.0,
    match_percentage NUMERIC(5,2) NOT NULL DEFAULT 0.0,
    status TEXT NOT NULL DEFAULT 'applied' CHECK (status IN ('applied', 'reviewing', 'shortlisted', 'rejected', 'offered')),
    cover_letter TEXT,
    recruiter_notes TEXT,
    ai_candidate_summary TEXT,
    ai_interview_questions JSONB DEFAULT '[]'::jsonb,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_applications_job_id ON public.applications (job_id);
CREATE INDEX IF NOT EXISTS idx_applications_student_id ON public.applications (student_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications (status);
CREATE INDEX IF NOT EXISTS idx_applications_ats_score ON public.applications (ats_score DESC);
CREATE INDEX IF NOT EXISTS idx_applications_applied_at ON public.applications (applied_at DESC);

-- ------------------------------------------------------------------------------
-- 7. SKILL GAP REPORTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.skill_gap_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    resume_id UUID NOT NULL REFERENCES public.resumes(id) ON DELETE CASCADE,
    job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
    target_company TEXT NOT NULL,
    target_role TEXT NOT NULL,
    match_percentage NUMERIC(5,2) NOT NULL DEFAULT 0.0,
    confidence_score NUMERIC(5,2) NOT NULL DEFAULT 0.0,
    confidence_level TEXT NOT NULL DEFAULT 'Medium',
    fallback_used TEXT NOT NULL DEFAULT 'NONE',
    resume_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    job_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    matched_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    missing_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    skill_gaps JSONB NOT NULL DEFAULT '[]'::jsonb,
    learning_roadmap TEXT NOT NULL DEFAULT '',
    learning_resources JSONB NOT NULL DEFAULT '{}'::jsonb,
    company_dsa_problems JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skill_gap_user_id ON public.skill_gap_reports (user_id);
CREATE INDEX IF NOT EXISTS idx_skill_gap_resume_id ON public.skill_gap_reports (resume_id);
CREATE INDEX IF NOT EXISTS idx_skill_gap_created_at ON public.skill_gap_reports (created_at DESC);

-- ------------------------------------------------------------------------------
-- 8. CAREER TEST RESULTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.career_test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    answers JSONB NOT NULL DEFAULT '[]'::jsonb,
    career_path TEXT NOT NULL,
    explanation TEXT NOT NULL,
    strengths JSONB NOT NULL DEFAULT '[]'::jsonb,
    suggested_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_career_test_user_id ON public.career_test_results (user_id);
CREATE INDEX IF NOT EXISTS idx_career_test_created_at ON public.career_test_results (created_at DESC);

-- ------------------------------------------------------------------------------
-- 9. SUPABASE STORAGE BUCKET (OPTIONAL FOR RESUME FILES)
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public) 
VALUES ('resumes', 'resumes', true)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 10. ENABLE ROW LEVEL SECURITY (OPTIONAL / PERMISSIVE POLICIES FOR BACKEND SERVICE)
-- ------------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ats_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_gap_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_test_results ENABLE ROW LEVEL SECURITY;

-- Allow service role & backend full access
CREATE POLICY "Allow all access to service role" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to service role" ON public.resumes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to service role" ON public.ats_reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to service role" ON public.companies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to service role" ON public.jobs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to service role" ON public.applications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to service role" ON public.skill_gap_reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to service role" ON public.career_test_results FOR ALL USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 11. UNIFIED CAREER READINESS MIGRATIONS (NON-DESTRUCTIVE ALTER STATEMENTS)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
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

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skill_gap_reports' AND column_name = 'ats_report_id') THEN
        ALTER TABLE public.skill_gap_reports ADD COLUMN ats_report_id UUID REFERENCES public.ats_reports(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_skill_gap_ats_report_id ON public.skill_gap_reports (ats_report_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skill_gap_reports' AND column_name = 'job_description') THEN
        ALTER TABLE public.skill_gap_reports ADD COLUMN job_description TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'applications' AND column_name = 'skill_gap_report_id') THEN
        ALTER TABLE public.applications ADD COLUMN skill_gap_report_id UUID REFERENCES public.skill_gap_reports(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_applications_skill_gap_report_id ON public.applications (skill_gap_report_id);
    END IF;

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

    CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_job_student_application ON public.applications (job_id, student_id);

    -- Phase 4: Application Audit Logs
    CREATE TABLE IF NOT EXISTS public.application_audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
        recruiter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
        previous_status TEXT NOT NULL,
        new_status TEXT NOT NULL,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_audit_logs_application_id ON public.application_audit_logs (application_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_recruiter_id ON public.application_audit_logs (recruiter_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_job_id ON public.application_audit_logs (job_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.application_audit_logs (created_at DESC);

    -- Phase 5: User Learning Roadmap Progress
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

    -- Phase 5: User Company DSA Progress
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
END $$;
