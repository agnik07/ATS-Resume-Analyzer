-- ==============================================================================
-- SkillGap AI — Migration 002: GitHub Evidence & Application Audit Logs
-- ==============================================================================

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

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_job_student_application ON public.applications (job_id, student_id);

