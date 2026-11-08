import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import Navbar from '../components/common/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Briefcase,
  Search,
  MapPin,
  Clock,
  DollarSign,
  Award,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
  Building2,
  Filter,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  ExternalLink,
  FileText,
  Upload,
  Calendar,
  Lock,
  Unlock,
  Check,
  Flame,
  ChevronRight,
  RefreshCw,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { getScoreColorClass, getScoreBgClass } from '../lib/scoreUtils';

const APPLICATION_STAGES = [
  { key: 'applied', label: 'Applied' },
  { key: 'reviewing', label: 'Reviewing' },
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'offered', label: 'Offered' },
];

export default function JobListings() {
  const [activeTab, setActiveTab] = useState('discover'); // 'discover' | 'my-applications'
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myApplications, setMyApplications] = useState([]);
  const [loadingApps, setLoadingApps] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExp, setSelectedExp] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Application Modal state
  const [selectedJob, setSelectedJob] = useState(null);
  const [candidateResumes, setCandidateResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState(null);
  const [newResumeFile, setNewResumeFile] = useState(null);
  const [coverLetter, setCoverLetter] = useState('');

  // Evaluation & submission state
  const [evaluatingAts, setEvaluatingAts] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [submittingApp, setSubmittingApp] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchJobs();
    fetchMyApplications();
    fetchCandidateResumes();
  }, [sortBy]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchQuery.trim()) params.query = searchQuery.trim();
      if (selectedExp !== 'all') params.experience_level = selectedExp;
      if (selectedType !== 'all') params.job_type = selectedType;
      if (sortBy) params.sort_by = sortBy;

      const res = await api.get('/jobs', { params });
      setJobs(res.data || []);
    } catch (err) {
      console.error('Failed to load jobs:', err);
      toast.error('Failed to load job listings.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyApplications = async () => {
    setLoadingApps(true);
    try {
      const res = await api.get('/jobs/applications/me');
      setMyApplications(res.data || []);
    } catch (err) {
      console.error('Failed to load student applications:', err);
    } finally {
      setLoadingApps(false);
    }
  };

  const fetchCandidateResumes = async () => {
    try {
      const res = await api.get('/student/resumes');
      const resumes = res.data || [];
      setCandidateResumes(resumes);
      if (resumes.length > 0) {
        setSelectedResumeId(resumes[0].id);
      }
    } catch (err) {
      console.error('Failed to load resumes:', err);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchJobs();
  };

  // Open the application preparation drawer/modal
  const handleOpenApplyModal = (job) => {
    setSelectedJob(job);
    setEvaluationResult(null);
    setNewResumeFile(null);
    setCoverLetter('');
    if (candidateResumes.length > 0 && !selectedResumeId) {
      setSelectedResumeId(candidateResumes[0].id);
    }
  };

  // Evaluate candidate's selected/uploaded resume against this specific job posting
  const handleEvaluateEligibility = async () => {
    if (!selectedJob) return;

    setEvaluatingAts(true);
    const formData = new FormData();
    formData.append('company', selectedJob.company_name);
    formData.append('role', selectedJob.title);
    formData.append('job_id', selectedJob.id);

    // Build synthesized JD text
    const fullJd = [
      `Title: ${selectedJob.title}`,
      `Company: ${selectedJob.company_name}`,
      `Location: ${selectedJob.location}`,
      `Overview: ${selectedJob.description}`,
      selectedJob.responsibilities?.length ? `Responsibilities:\n${selectedJob.responsibilities.join('\n')}` : '',
      selectedJob.qualifications?.length ? `Qualifications:\n${selectedJob.qualifications.join('\n')}` : '',
      selectedJob.required_skills?.length ? `Required Skills:\n${selectedJob.required_skills.join(', ')}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    formData.append('job_description', fullJd);

    if (newResumeFile) {
      formData.append('file', newResumeFile);
    } else if (selectedResumeId) {
      // Find selected resume
      const chosen = candidateResumes.find((r) => r.id === selectedResumeId);
      if (!chosen) {
        toast.error('Please select an existing resume or upload a new one.');
        setEvaluatingAts(false);
        return;
      }
      // If we don't have a fresh file, we fetch or evaluate directly
      formData.append('resume_id', selectedResumeId);
    } else {
      toast.error('Please select or upload a resume first.');
      setEvaluatingAts(false);
      return;
    }

    try {
      let evalData = null;
      if (newResumeFile) {
        const res = await api.post('/ats/upload-and-analyze', formData);
        evalData = res.data;
        // Refresh resumes
        fetchCandidateResumes();
      } else {
        // Evaluate existing resume against job JD
        const res = await api.post('/ats/upload-and-analyze', formData);
        evalData = res.data;
      }

      setEvaluationResult(evalData);
      toast.success('ATS eligibility evaluation complete!');
    } catch (err) {
      const detail = err.response?.data?.detail || 'ATS evaluation failed. Please check your resume file.';
      toast.error(detail);
    } finally {
      setEvaluatingAts(false);
    }
  };

  // Final Application Submission (Only enabled when meeting recruiter threshold)
  const handleSubmitApplication = async () => {
    if (!selectedJob || !evaluationResult) return;

    // Check threshold again on client
    const atsScore = evaluationResult.overall_score;
    const minThreshold = selectedJob.min_ats_score;
    if (selectedJob.enforce_threshold && atsScore < minThreshold) {
      toast.error(`Your ATS score (${atsScore}) is below the required threshold (${minThreshold}).`);
      return;
    }

    setSubmittingApp(true);
    try {
      const payload = {
        resume_id: evaluationResult.resume_id || selectedResumeId,
        ats_report_id: evaluationResult.id,
        cover_letter: coverLetter.trim() || undefined,
      };

      const res = await api.post(`/jobs/${selectedJob.id}/apply`, payload);
      toast.success(`Application submitted to ${selectedJob.company_name}! Score: ${res.data.ats_score}/100.`);

      // Update state
      setSelectedJob(null);
      setEvaluationResult(null);
      fetchJobs();
      fetchMyApplications();
      setActiveTab('my-applications');
    } catch (err) {
      const detail = err.response?.data?.detail || 'Application submission failed. Please try again.';
      toast.error(detail);
    } finally {
      setSubmittingApp(false);
    }
  };

  // Helper to check if student already applied for a job
  const hasAppliedForJob = (jobId) => {
    return myApplications.some((a) => a.job_id === jobId);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header Banner */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                Recruitment Portal
              </span>
              <span className="text-xs text-muted-foreground font-mono">Verified ATS Pipeline</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight mt-1">Tech Opportunities & Application Hub</h1>
            <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
              Discover verified technical vacancies with recruiter-defined ATS eligibility standards. Real-time eligibility scoring and application tracking.
            </p>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border self-start md:self-center">
            <button
              onClick={() => setActiveTab('discover')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'discover'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Briefcase className="h-4 w-4" />
              Discover Jobs ({jobs.length})
            </button>
            <button
              onClick={() => setActiveTab('my-applications')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'my-applications'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              My Applications ({myApplications.length})
            </button>
          </div>
        </motion.div>

        {/* ========================================================================= */}
        {/* TAB 1: DISCOVER JOBS                                                      */}
        {/* ========================================================================= */}
        {activeTab === 'discover' && (
          <div className="space-y-6">
            {/* Search & Filter Bar */}
            <div className="p-4 rounded-2xl border border-border bg-card shadow-sm space-y-4">
              <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by role title, company, skills (e.g. Full Stack, Google, React, Docker)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-background/60 text-sm"
                  />
                </div>
                <Button type="submit" className="gap-2 shrink-0">
                  <Search className="h-4 w-4" /> Search Jobs
                </Button>
              </form>

              {/* Quick Filters */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-border text-xs">
                <div className="flex flex-wrap items-center gap-4">
                  {/* Experience Level */}
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-semibold">Experience:</span>
                    <select
                      value={selectedExp}
                      onChange={(e) => {
                        setSelectedExp(e.target.value);
                        setTimeout(fetchJobs, 50);
                      }}
                      className="bg-background border border-border rounded-lg px-2.5 py-1 text-xs font-medium focus:ring-1 focus:ring-primary outline-none"
                    >
                      <option value="all">All Levels</option>
                      <option value="Entry">Entry Level</option>
                      <option value="Mid">Mid Level</option>
                      <option value="Senior">Senior Level</option>
                      <option value="Lead">Lead / Architect</option>
                    </select>
                  </div>

                  {/* Employment Type */}
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-semibold">Type:</span>
                    <select
                      value={selectedType}
                      onChange={(e) => {
                        setSelectedType(e.target.value);
                        setTimeout(fetchJobs, 50);
                      }}
                      className="bg-background border border-border rounded-lg px-2.5 py-1 text-xs font-medium focus:ring-1 focus:ring-primary outline-none"
                    >
                      <option value="all">All Types</option>
                      <option value="Full-time">Full-time</option>
                      <option value="Remote">Remote</option>
                      <option value="Hybrid">Hybrid</option>
                      <option value="Internship">Internship</option>
                    </select>
                  </div>
                </div>

                {/* Sort dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground font-semibold">Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-background border border-border rounded-lg px-2.5 py-1 text-xs font-medium focus:ring-1 focus:ring-primary outline-none"
                  >
                    <option value="newest">Newest Postings</option>
                    <option value="deadline">Nearest Deadline</option>
                    <option value="min_ats_score">Min ATS Threshold (Low to High)</option>
                    <option value="min_ats_score_desc">Min ATS Threshold (High to Low)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Job Listings Grid */}
            {loading ? (
              <div className="py-20 text-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-sm text-muted-foreground">Loading verified active job opportunities...</p>
              </div>
            ) : jobs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {jobs.map((job) => {
                  const isApplied = hasAppliedForJob(job.id);
                  const isClosed = job.status === 'closed' || !job.is_active;

                  return (
                    <motion.div
                      key={job.id}
                      whileHover={{ y: -3 }}
                      className="p-6 rounded-2xl border border-border bg-card flex flex-col justify-between shadow-sm hover:border-primary/50 transition-all space-y-4"
                    >
                      <div className="space-y-3">
                        {/* Company & Badges */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            {job.company_logo_url ? (
                              <img
                                src={job.company_logo_url}
                                alt={job.company_name}
                                className="h-10 w-10 rounded-xl object-contain bg-background p-1 border border-border"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-sm">
                                {job.company_name.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <span className="text-xs font-bold text-foreground line-clamp-1">
                                {job.company_name}
                              </span>
                              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> {job.location}
                              </span>
                            </div>
                          </div>

                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border shrink-0">
                            {job.job_type}
                          </span>
                        </div>

                        {/* Title & Experience */}
                        <div>
                          <h3 className="text-lg font-bold text-foreground line-clamp-1">{job.title}</h3>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span className="px-2 py-0.2 rounded bg-muted/50 text-foreground font-medium text-[11px]">
                              {job.experience_level}
                            </span>
                            {job.salary_range && (
                              <>
                                <span>•</span>
                                <span className="font-mono text-primary font-semibold">{job.salary_range}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Description Preview */}
                        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                          {job.description}
                        </p>

                        {/* Required Skills */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {job.required_skills?.slice(0, 4).map((s, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-semibold border border-primary/20"
                            >
                              {s}
                            </span>
                          ))}
                          {job.required_skills?.length > 4 && (
                            <span className="px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground text-[10px] font-semibold">
                              +{job.required_skills.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Footer: Minimum ATS & Action */}
                      <div className="pt-4 border-t border-border flex items-center justify-between text-xs">
                        <div>
                          {job.disclose_threshold ? (
                            <div className="flex items-center gap-1.5">
                              <ShieldCheck className="h-4 w-4 text-primary" />
                              <span className="font-semibold text-foreground">
                                Min ATS: <strong className="text-primary font-mono">{job.min_ats_score}</strong>
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">Confidential Threshold</span>
                          )}
                        </div>

                        <div>
                          {isApplied ? (
                            <span className="px-3 py-1 rounded-lg text-xs font-bold bg-[#0F6E56]/10 text-[#0F6E56] dark:text-[#5DCAA5] border border-[#0F6E56]/20 flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Applied
                            </span>
                          ) : isClosed ? (
                            <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-muted text-muted-foreground border border-border">
                              Closed
                            </span>
                          ) : (
                            <Button size="sm" onClick={() => handleOpenApplyModal(job)} className="gap-1.5 text-xs">
                              View & Apply <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-20 p-8 rounded-2xl border border-border bg-card space-y-3">
                <Briefcase className="h-12 w-12 mx-auto text-muted-foreground" />
                <h3 className="text-lg font-bold text-foreground">No active positions match your criteria</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Try clearing your search query or adjusting your experience and employment filters.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedExp('all');
                    setSelectedType('all');
                    setTimeout(fetchJobs, 50);
                  }}
                  className="mt-2"
                >
                  Reset All Filters
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: MY APPLICATIONS TRACKER                                            */}
        {/* ========================================================================= */}
        {activeTab === 'my-applications' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Application Status & Live Pipeline</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Real-time status updates, recruiter communication, and your verified ATS scores.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={fetchMyApplications} className="gap-1.5 text-xs">
                <RefreshCw className="h-3.5 w-3.5" /> Refresh Pipeline
              </Button>
            </div>

            {loadingApps ? (
              <div className="py-20 text-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-sm text-muted-foreground">Loading submitted applications...</p>
              </div>
            ) : myApplications.length > 0 ? (
              <div className="space-y-4">
                {myApplications.map((app) => {
                  // Calculate stage progression index
                  const statusNormalized = (app.status || 'applied').toLowerCase();
                  let currentStageIdx = 0;
                  if (statusNormalized === 'reviewing') currentStageIdx = 1;
                  else if (statusNormalized === 'shortlisted') currentStageIdx = 2;
                  else if (statusNormalized === 'offered') currentStageIdx = 3;
                  else if (statusNormalized === 'rejected') currentStageIdx = -1; // special case

                  return (
                    <div
                      key={app.id}
                      className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-5"
                    >
                      {/* Top Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          {app.company_logo_url ? (
                            <img
                              src={app.company_logo_url}
                              alt={app.company_name}
                              className="h-12 w-12 rounded-xl object-contain bg-background p-1 border border-border"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-base">
                              {app.company_name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <span className="text-xs uppercase font-semibold text-primary">
                              {app.company_name}
                            </span>
                            <h3 className="text-lg font-bold text-foreground">{app.job_title}</h3>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              <span>Applied on {new Date(app.applied_at).toLocaleDateString()}</span>
                              <span>•</span>
                              <span>{app.location}</span>
                            </div>
                          </div>
                        </div>

                        {/* Scores & Badges */}
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground">ATS Score</span>
                            <div className={`text-2xl font-black font-mono ${getScoreColorClass(app.ats_score)}`}>
                              {app.ats_score.toFixed(0)} <span className="text-xs text-muted-foreground font-normal">/ 100</span>
                            </div>
                          </div>
                          <div className="h-8 w-[1px] bg-border" />
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground">JD Match</span>
                            <div className="text-2xl font-black font-mono text-primary">
                              {app.match_percentage.toFixed(0)}%
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Recruiter Notes Banner */}
                      {app.recruiter_notes && (
                        <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 text-xs space-y-1">
                          <span className="font-bold text-primary flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5" /> Note from Hiring Team:
                          </span>
                          <p className="text-foreground leading-relaxed">{app.recruiter_notes}</p>
                        </div>
                      )}

                      {/* Dynamic Application Timeline */}
                      <div className="pt-2">
                        {statusNormalized === 'rejected' ? (
                          <div className="p-3 rounded-xl bg-[#993C1D]/10 text-[#993C1D] dark:text-[#F0997B] border border-[#993C1D]/20 text-xs flex items-center justify-between">
                            <span className="font-semibold flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4" /> Application Not Selected
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate('/career-readiness')}
                              className="text-xs h-7"
                            >
                              Bridge Skill Gaps
                            </Button>
                          </div>
                        ) : (
                          <div className="relative flex items-center justify-between">
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 w-full bg-muted -z-0 rounded" />
                            {APPLICATION_STAGES.map((stg, sIdx) => {
                              const isCompleted = sIdx <= currentStageIdx;
                              const isCurrent = sIdx === currentStageIdx;

                              return (
                                <div key={stg.key} className="relative z-10 flex flex-col items-center gap-1.5">
                                  <div
                                    className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                                      isCompleted
                                        ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                                        : 'bg-muted border border-border text-muted-foreground'
                                    }`}
                                  >
                                    {isCompleted ? <Check className="h-3.5 w-3.5" /> : sIdx + 1}
                                  </div>
                                  <span
                                    className={`text-[11px] font-semibold ${
                                      isCurrent ? 'text-primary' : isCompleted ? 'text-foreground' : 'text-muted-foreground'
                                    }`}
                                  >
                                    {stg.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Action Links */}
                      <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-4">
                          {app.ats_report_id && (
                            <span className="text-[11px] font-mono">Report ID: {app.ats_report_id.slice(0, 8)}...</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate('/career-readiness')}
                            className="text-xs h-8 gap-1.5"
                          >
                            <TrendingUp className="h-3.5 w-3.5" /> Career Roadmap
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-20 p-8 rounded-2xl border border-border bg-card space-y-3">
                <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground" />
                <h3 className="text-lg font-bold text-foreground">You haven't submitted any job applications yet</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Browse verified openings on the Discover Jobs tab and apply with your authenticated ATS resume.
                </p>
                <Button size="sm" onClick={() => setActiveTab('discover')} className="mt-2">
                  Explore Active Positions
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* ATS-POWERED APPLICATION PREPARATION MODAL                                */}
        {/* ========================================================================= */}
        {selectedJob && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-card border border-border rounded-2xl p-6 sm:p-8 max-w-2xl w-full max-h-[92vh] overflow-y-auto space-y-6 shadow-2xl"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-start border-b border-border pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase font-bold text-primary">{selectedJob.company_name}</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">{selectedJob.location}</span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-foreground mt-0.5">{selectedJob.title}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                      Required ATS Threshold: {selectedJob.min_ats_score}/100
                    </span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedJob(null)} className="h-8 w-8 p-0 rounded-full">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Step 1: Resume Selection & Evaluation */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Step 1: Select or Upload Resume for ATS Analysis
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your resume will be evaluated against the recruiter's exact job description and technical requirements.
                  </p>
                </div>

                {/* Candidate's Existing Resumes List */}
                {candidateResumes.length > 0 && !newResumeFile && (
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {candidateResumes.map((r) => (
                      <div
                        key={r.id}
                        onClick={() => setSelectedResumeId(r.id)}
                        className={`p-3 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                          selectedResumeId === r.id
                            ? 'border-primary bg-primary/10 text-foreground font-semibold'
                            : 'border-border bg-background/50 text-muted-foreground hover:border-primary/40'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="h-4 w-4 text-primary shrink-0" />
                          <span className="truncate">{r.filename}</span>
                          <span className="text-[10px] text-muted-foreground">
                            ({new Date(r.created_at).toLocaleDateString()})
                          </span>
                        </div>
                        {selectedResumeId === r.id && (
                          <CheckCircle2 className="h-4 w-4 text-primary shrink-0 ml-2" />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Or Upload New Resume */}
                <div className="pt-1">
                  <div
                    className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                      newResumeFile ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 bg-background/40'
                    }`}
                    onClick={() => document.getElementById('modal-resume-file').click()}
                  >
                    <input
                      id="modal-resume-file"
                      type="file"
                      accept=".pdf,.docx,.doc,.txt,.md"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setNewResumeFile(file);
                          setEvaluationResult(null);
                          toast.success(`Selected resume file: ${file.name}`);
                        }
                      }}
                      className="hidden"
                    />
                    <Upload className="h-6 w-6 mx-auto mb-1 text-primary" />
                    <span className="text-xs font-semibold text-foreground">
                      {newResumeFile ? newResumeFile.name : 'Click to upload a new or tailored resume version (.pdf, .docx, .txt)'}
                    </span>
                    {newResumeFile && (
                      <div className="mt-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setNewResumeFile(null);
                          }}
                          className="text-[11px] text-red-500 hover:underline"
                        >
                          Remove file
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Run Evaluation Button */}
                {!evaluationResult && (
                  <Button
                    onClick={handleEvaluateEligibility}
                    disabled={evaluatingAts || (!newResumeFile && !selectedResumeId)}
                    className="w-full py-5 text-sm font-bold rounded-xl gap-2 shadow-md shadow-primary/20"
                  >
                    {evaluatingAts ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Evaluating ATS Eligibility Against Job Description...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Evaluate Eligibility with ATS Engine
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Step 2: Eligibility Evaluation Report */}
              {evaluationResult && (() => {
                const atsScore = evaluationResult.overall_score;
                const minThreshold = selectedJob.min_ats_score;
                const isEligible = !selectedJob.enforce_threshold || atsScore >= minThreshold;
                const diff = (atsScore - minThreshold).toFixed(1);

                return (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pt-2 border-t border-border">
                    <div>
                      <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        Step 2: ATS Eligibility Evaluation Result
                      </h4>
                    </div>

                    {/* Score vs Threshold Banner */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3.5 rounded-xl border border-border bg-background/60 text-center">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">Your ATS Score</span>
                        <div className={`text-2xl font-black font-mono ${getScoreColorClass(atsScore)}`}>
                          {atsScore}
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl border border-border bg-background/60 text-center">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">Required Min</span>
                        <div className="text-2xl font-black font-mono text-foreground">
                          {minThreshold}
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl border border-border bg-background/60 text-center">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">Score Delta</span>
                        <div className={`text-2xl font-black font-mono ${isEligible ? 'text-[#0F6E56] dark:text-[#5DCAA5]' : 'text-[#993C1D] dark:text-[#F0997B]'}`}>
                          {parseFloat(diff) >= 0 ? `+${diff}` : diff}
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl border border-border bg-background/60 text-center">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">JD Match</span>
                        <div className="text-2xl font-black font-mono text-primary">
                          {evaluationResult.match_percentage ? `${evaluationResult.match_percentage.toFixed(0)}%` : '85%'}
                        </div>
                      </div>
                    </div>

                    {/* Eligibility Status Banner */}
                    {isEligible ? (
                      <div className="p-4 rounded-xl bg-[#0F6E56]/10 text-[#0F6E56] dark:text-[#5DCAA5] border border-[#0F6E56]/20 text-xs space-y-1">
                        <span className="font-bold text-sm flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" /> You meet the ATS eligibility requirement!
                        </span>
                        <p className="text-foreground leading-relaxed">
                          Your verified resume score ({atsScore}/100) satisfies {selectedJob.company_name}'s threshold ({minThreshold}/100). You are eligible to submit your application.
                        </p>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-[#993C1D]/10 text-[#993C1D] dark:text-[#F0997B] border border-[#993C1D]/20 text-xs space-y-2">
                        <span className="font-bold text-sm flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" /> Your current resume does not meet the required ATS threshold.
                        </span>
                        <p className="text-foreground leading-relaxed">
                          You scored <strong>{atsScore}/100</strong>, which is short by <strong>{Math.abs(parseFloat(diff))} pts</strong> of the recruiter's minimum {minThreshold}/100 standard.
                        </p>

                        <div className="pt-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              setSelectedJob(null);
                              navigate('/career-readiness');
                            }}
                            className="bg-[#BA7517] hover:bg-[#BA7517]/90 text-white gap-1.5 text-xs font-bold"
                          >
                            <TrendingUp className="h-3.5 w-3.5" /> Improve My Career Readiness
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Critical Strengths & Missing Requirements */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {evaluationResult.strengths?.length > 0 && (
                        <div className="p-3.5 rounded-xl border border-border bg-background/50 space-y-1.5">
                          <span className="font-bold text-foreground flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Key Strengths
                          </span>
                          <ul className="space-y-1 text-muted-foreground">
                            {evaluationResult.strengths.slice(0, 3).map((str, idx) => (
                              <li key={idx} className="line-clamp-1">• {str}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {evaluationResult.critical_issues?.length > 0 && (
                        <div className="p-3.5 rounded-xl border border-border bg-background/50 space-y-1.5">
                          <span className="font-bold text-[#993C1D] dark:text-[#F0997B] flex items-center gap-1.5">
                            <AlertTriangle className="h-3.5 w-3.5" /> Missing / Needs Work
                          </span>
                          <ul className="space-y-1 text-muted-foreground">
                            {evaluationResult.critical_issues.slice(0, 3).map((iss, idx) => (
                              <li key={idx} className="line-clamp-1">• {iss}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Step 3: Application Submission Form (Only if eligible) */}
                    {isEligible && (
                      <div className="space-y-3 pt-2 border-t border-border">
                        <Label htmlFor="app-cover-letter" className="text-xs font-bold text-foreground">
                          Cover Note to Hiring Manager (Optional)
                        </Label>
                        <Textarea
                          id="app-cover-letter"
                          rows={3}
                          placeholder="Introduce yourself and highlight specific engineering achievements relevant to this role..."
                          value={coverLetter}
                          onChange={(e) => setCoverLetter(e.target.value)}
                          className="bg-background/60 text-xs resize-none"
                        />
                      </div>
                    )}
                  </motion.div>
                );
              })()}

              {/* Modal Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <Button variant="outline" size="sm" onClick={() => setSelectedJob(null)}>
                  Cancel
                </Button>

                {evaluationResult && (
                  <div>
                    {selectedJob.enforce_threshold && evaluationResult.overall_score < selectedJob.min_ats_score ? (
                      <Button disabled className="gap-1.5 opacity-60 cursor-not-allowed">
                        <Lock className="h-4 w-4" /> Application Submission Locked
                      </Button>
                    ) : (
                      <Button
                        onClick={handleSubmitApplication}
                        disabled={submittingApp}
                        className="gap-2 font-bold shadow-md shadow-primary/20"
                      >
                        {submittingApp ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Submitting to Recruiter Pipeline...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4" />
                            Submit Official Application
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
}
