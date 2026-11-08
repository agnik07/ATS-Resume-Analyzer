import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../lib/api';
import Navbar from '../../components/common/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Users,
  Award,
  Search,
  Filter,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  Loader2,
  X,
  ExternalLink,
  Tag,
  HelpCircle,
  Briefcase,
  FileText,
  Github,
  Linkedin,
  Globe,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Download,
  AlertTriangle,
  Layers,
  ArrowUpDown,
  Copy,
  Check,
  ShieldCheck,
  Gift,
  Scale,
  Eye,
  History,
} from 'lucide-react';
import { getScoreColorClass, getScoreBgClass } from '../../lib/scoreUtils';

export default function CandidateSearch() {
  const { jobId: urlJobId } = useParams();
  const navigate = useNavigate();

  const [availableJobs, setAvailableJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(urlJobId || null);

  const [job, setJob] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  // Sorting & Filters
  const [sortBy, setSortBy] = useState('ats_score');
  const [statusFilter, setStatusFilter] = useState('');
  const [eligibilityFilter, setEligibilityFilter] = useState('all');
  const [minAts, setMinAts] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Multi-candidate comparison selection
  const [selectedForCompare, setSelectedForCompare] = useState([]);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [comparisonData, setComparisonData] = useState(null);
  const [loadingCompare, setLoadingCompare] = useState(false);

  // Candidate Evaluation Drawer
  const [activeCandidateId, setActiveCandidateId] = useState(null);
  const [candidateDetail, setCandidateDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [evaluationTab, setEvaluationTab] = useState('overview'); // overview, skills, projects, ai, resume

  // Status Change State & Confirmation Modal
  const [confirmStatusModal, setConfirmStatusModal] = useState({
    isOpen: false,
    newStatus: null,
    title: '',
    message: '',
  });
  const [recruiterNotes, setRecruiterNotes] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);

  // Resume Viewer State
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isFullScreenResume, setIsFullScreenResume] = useState(false);
  const [copiedText, setCopiedText] = useState('');

  // Fetch recruiter's available jobs
  useEffect(() => {
    async function loadJobs() {
      try {
        const res = await api.get('/recruiter/jobs');
        const jobsList = res.data || [];
        setAvailableJobs(jobsList);
        if (!urlJobId && jobsList.length > 0) {
          setSelectedJobId(jobsList[0].id);
        }
      } catch (err) {
        console.error('Failed to load recruiter jobs:', err);
      }
    }
    loadJobs();
  }, [urlJobId]);

  useEffect(() => {
    if (urlJobId) {
      setSelectedJobId(urlJobId);
    }
  }, [urlJobId]);

  useEffect(() => {
    if (selectedJobId) {
      fetchJobDetails(selectedJobId);
    }
  }, [selectedJobId]);

  useEffect(() => {
    if (selectedJobId) {
      fetchCandidates(selectedJobId);
    }
  }, [selectedJobId, sortBy, statusFilter, eligibilityFilter, minAts, searchQuery]);

  const fetchJobDetails = async (targetId) => {
    try {
      const res = await api.get(`/recruiter/jobs/${targetId}`);
      setJob(res.data);
    } catch (err) {
      console.error('Failed to load job details:', err);
    }
  };

  const fetchCandidates = async (targetId) => {
    setLoading(true);
    try {
      const params = { sort_by: sortBy };
      if (statusFilter) params.status_filter = statusFilter;
      if (eligibilityFilter && eligibilityFilter !== 'all') params.eligibility = eligibilityFilter;
      if (minAts) params.min_ats = parseFloat(minAts);
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.get(`/recruiter/jobs/${targetId}/candidates`, { params });
      setCandidates(res.data || []);
    } catch (err) {
      console.error('Failed to load candidate applications:', err);
      toast.error('Failed to load candidate applications.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEvaluation = async (candidateId) => {
    setActiveCandidateId(candidateId);
    setLoadingDetail(true);
    setEvaluationTab('overview');
    try {
      const res = await api.get(`/recruiter/applications/${candidateId}`);
      setCandidateDetail(res.data);
      setRecruiterNotes(res.data.recruiter_notes || '');
    } catch (err) {
      toast.error('Failed to load candidate evaluation dossier.');
      setActiveCandidateId(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleGenerateAiIntelligence = async () => {
    if (!activeCandidateId) return;
    setGeneratingAi(true);
    try {
      const res = await api.post(`/recruiter/applications/${activeCandidateId}/ai-summary`);
      setCandidateDetail((prev) => ({
        ...prev,
        ai_candidate_summary: res.data.executive_summary || res.data.summary,
        ai_interview_questions: res.data.technical_interview_questions || [],
      }));
      toast.success('AI candidate dossier & tailored questions synthesized!');
      fetchCandidates();
    } catch (err) {
      toast.error('Failed to generate AI intelligence dossier.');
    } finally {
      setGeneratingAi(false);
    }
  };

  const promptStatusChange = (status) => {
    let title = `Update Pipeline Status to ${status.toUpperCase()}?`;
    let message = `Are you sure you want to transition this candidate to ${status}?`;

    if (status === 'shortlisted') {
      title = 'Advance Candidate to Shortlist?';
      message = 'This will mark the candidate as qualified for technical interview rounds.';
    } else if (status === 'rejected') {
      title = 'Confirm Candidate Rejection';
      message = 'This will record the candidate as rejected for this opening. The candidate history will retain this decision.';
    } else if (status === 'offered') {
      title = 'Mark as Offered?';
      message = 'Confirm extending an official offer to this candidate.';
    }

    setConfirmStatusModal({
      isOpen: true,
      newStatus: status,
      title,
      message,
    });
  };

  const executeStatusChange = async () => {
    const { newStatus } = confirmStatusModal;
    if (!activeCandidateId || !newStatus) return;

    setSavingStatus(true);
    try {
      await api.patch(`/recruiter/applications/${activeCandidateId}/status`, {
        status: newStatus,
        recruiter_notes: recruiterNotes,
      });

      setCandidateDetail((prev) => ({
        ...prev,
        status: newStatus,
        recruiter_notes: recruiterNotes,
      }));

      toast.success(`Candidate status transitioned to ${newStatus}.`);
      setConfirmStatusModal({ isOpen: false, newStatus: null, title: '', message: '' });
      fetchCandidates();
    } catch (err) {
      toast.error('Failed to update candidate status.');
    } finally {
      setSavingStatus(false);
    }
  };

  const toggleSelectForCompare = (appId) => {
    setSelectedForCompare((prev) => {
      if (prev.includes(appId)) {
        return prev.filter((id) => id !== appId);
      }
      if (prev.length >= 5) {
        toast.warning('Comparison supports a maximum of 5 candidates at once.');
        return prev;
      }
      return [...prev, appId];
    });
  };

  const handleOpenComparison = async () => {
    if (selectedForCompare.length < 2) {
      toast.warning('Please select at least 2 candidates to compare.');
      return;
    }
    setLoadingCompare(true);
    setCompareModalOpen(true);
    try {
      const res = await api.post(`/recruiter/jobs/${jobId}/compare`, {
        application_ids: selectedForCompare,
      });
      setComparisonData(res.data);
    } catch (err) {
      toast.error('Failed to run candidate comparison.');
      setCompareModalOpen(false);
    } finally {
      setLoadingCompare(false);
    }
  };

  const copyToClipboard = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    toast.success(`Copied ${label} to clipboard!`);
    setTimeout(() => setCopiedText(''), 2000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-card border border-border shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase font-bold text-primary tracking-wider">
                {job?.company_name || 'Company'}
              </span>
              <span className="text-muted-foreground">•</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                Min ATS: {job?.min_ats_score ?? 60}/100
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {job?.title || 'Job Applicants Pipeline'}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Evaluate verified candidate submissions ranked by deterministic ATS scoring and repository evidence.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {selectedForCompare.length > 0 && (
              <Button
                variant="default"
                size="sm"
                onClick={handleOpenComparison}
                className="gap-1.5 shadow-sm bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Scale className="h-4 w-4" /> Compare Selected ({selectedForCompare.length})
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => navigate('/recruiter/dashboard')}>
              Console Dashboard
            </Button>
          </div>
        </div>

        {/* 2. Pipeline Controls & Filters */}
        <div className="p-4 rounded-xl border border-border bg-card flex flex-wrap items-center justify-between gap-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative w-48 sm:w-64">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search name, email, skill..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-background/50"
              />
            </div>

            {/* Sort Options */}
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-bold text-muted-foreground uppercase">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="p-1.5 rounded-lg border border-border bg-background text-xs font-medium"
              >
                <option value="ats_score">ATS Score (Highest First)</option>
                <option value="match_percentage">Job Match %</option>
                <option value="github_evidence">GitHub Evidence Score</option>
                <option value="applied_at">Application Date</option>
              </select>
            </div>

            {/* Eligibility Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-muted-foreground uppercase">Threshold:</span>
              <select
                value={eligibilityFilter}
                onChange={(e) => setEligibilityFilter(e.target.value)}
                className="p-1.5 rounded-lg border border-border bg-background text-xs font-medium"
              >
                <option value="all">All Applicants</option>
                <option value="eligible">Eligible (&ge; {job?.min_ats_score ?? 60})</option>
                <option value="below_threshold">Below Threshold (&lt; {job?.min_ats_score ?? 60})</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-muted-foreground uppercase">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="p-1.5 rounded-lg border border-border bg-background text-xs font-medium"
              >
                <option value="">All Statuses</option>
                <option value="applied">Applied</option>
                <option value="reviewing">Under Review</option>
                <option value="shortlisted">Shortlisted</option>
                <option value="rejected">Rejected</option>
                <option value="offered">Offered</option>
              </select>
            </div>
          </div>

          <div className="text-xs font-medium text-muted-foreground">
            Showing <strong className="text-foreground">{candidates.length}</strong> candidate{candidates.length === 1 ? '' : 's'}
          </div>
        </div>

        {/* 2. Candidate Cards List */}
        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-xs text-muted-foreground mt-2">Loading verified candidate applications...</p>
          </div>
        ) : candidates.length > 0 ? (
          <div className="space-y-3">
            {candidates.map((cand, idx) => {
              const isSelected = selectedForCompare.includes(cand.id);
              const initials = cand.student_name
                ? cand.student_name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()
                : 'CN';

              return (
                <motion.div
                  key={cand.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className={`p-5 rounded-2xl border transition-all bg-card shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isSelected ? 'border-primary ring-1 ring-primary/30' : 'border-border hover:border-primary/40'
                  }`}
                >
                  {/* Left: Checkbox + Avatar + Basic Info */}
                  <div className="flex items-start sm:items-center gap-4">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectForCompare(cand.id)}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer mt-1 sm:mt-0"
                    />

                    <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-base shrink-0 border border-primary/20">
                      {initials}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-foreground hover:text-primary transition-colors cursor-pointer" onClick={() => handleOpenEvaluation(cand.id)}>
                          {cand.student_name}
                        </h3>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                            cand.status === 'shortlisted' || cand.status === 'offered'
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                              : cand.status === 'rejected'
                              ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                              : cand.status === 'reviewing'
                              ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                              : 'bg-muted text-muted-foreground border-border'
                          }`}
                        >
                          {cand.status}
                        </span>

                        {cand.is_eligible ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Eligible (+{cand.score_difference})
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> Below Threshold ({cand.score_difference})
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-3">
                        <span>{cand.student_email}</span>
                        <span>•</span>
                        <span>Applied: {new Date(cand.applied_at).toLocaleDateString()}</span>
                      </div>

                      {/* Matching Skills & Missing Skills Pills */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {cand.validated_skills?.slice(0, 3).map((sk, sIdx) => (
                          <span
                            key={sIdx}
                            className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1"
                          >
                            <ShieldCheck className="h-2.5 w-2.5" /> {sk}
                          </span>
                        ))}
                        {cand.unverified_skills?.slice(0, 2).map((sk, sIdx) => (
                          <span
                            key={sIdx}
                            className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted text-muted-foreground border border-border"
                          >
                            {sk}
                          </span>
                        ))}
                        {cand.missing_skills?.slice(0, 2).map((sk, sIdx) => (
                          <span
                            key={sIdx}
                            className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-500/10 text-rose-500 border border-rose-500/20"
                          >
                            Missing: {sk}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right: Scores & Action */}
                  <div className="flex items-center justify-between sm:justify-end gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-border">
                    <div className="text-center">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">ATS Score</span>
                      <span className={`text-xl font-mono font-black ${getScoreColorClass(cand.ats_score)}`}>
                        {cand.ats_score}
                      </span>
                    </div>

                    <div className="text-center">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">JD Match</span>
                      <span className="text-xl font-mono font-black text-primary">
                        {cand.match_percentage}%
                      </span>
                    </div>

                    <div className="text-center">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">GitHub</span>
                      <span className="text-xl font-mono font-black text-purple-500">
                        {cand.github_evidence_score ?? 0}
                      </span>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleOpenEvaluation(cand.id)}
                      className="gap-1.5 text-xs shadow-sm ml-2"
                    >
                      <Eye className="h-3.5 w-3.5" /> Evaluate
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 p-8 rounded-2xl border border-border bg-card">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-base font-bold text-foreground">No applicants matching filter criteria</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Try adjusting your eligibility status, sort option, or keyword search.
            </p>
          </div>
        )}

        {/* 3. CANDIDATE EVALUATION DRAWER / MODAL */}
        <AnimatePresence>
          {activeCandidateId && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-end">
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="bg-card border-l border-border w-full max-w-4xl h-full flex flex-col shadow-2xl overflow-hidden"
              >
                {/* Drawer Header */}
                <div className="p-6 border-b border-border flex items-center justify-between bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm border border-primary/20">
                      {candidateDetail?.student_name
                        ? candidateDetail.student_name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()
                        : 'CN'}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-foreground">
                        {candidateDetail?.student_name || 'Candidate Evaluation'}
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        Target Role: <strong>{job?.title}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveCandidateId(null)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Drawer Navigation Tabs */}
                <div className="flex items-center gap-2 px-6 border-b border-border bg-muted/10 text-xs overflow-x-auto">
                  <button
                    onClick={() => setEvaluationTab('overview')}
                    className={`py-3 px-3 font-semibold border-b-2 transition-colors ${
                      evaluationTab === 'overview'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Section A: Overview & Score
                  </button>
                  <button
                    onClick={() => setEvaluationTab('skills')}
                    className={`py-3 px-3 font-semibold border-b-2 transition-colors ${
                      evaluationTab === 'skills'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Section B: Critical Skills
                  </button>
                  <button
                    onClick={() => setEvaluationTab('projects')}
                    className={`py-3 px-3 font-semibold border-b-2 transition-colors ${
                      evaluationTab === 'projects'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Section C: Projects & Evidence
                  </button>
                  <button
                    onClick={() => setEvaluationTab('ai')}
                    className={`py-3 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                      evaluationTab === 'ai'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    Section D: AI Intelligence
                  </button>
                  <button
                    onClick={() => setEvaluationTab('resume')}
                    className={`py-3 px-3 font-semibold border-b-2 transition-colors ${
                      evaluationTab === 'resume'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Section E: Resume Viewer
                  </button>
                </div>

                {/* Drawer Body Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {loadingDetail ? (
                    <div className="py-24 text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                      <p className="text-xs text-muted-foreground mt-2">Assembling evaluation dossier...</p>
                    </div>
                  ) : candidateDetail ? (
                    <>
                      {/* SECTION A: Candidate Overview */}
                      {evaluationTab === 'overview' && (
                        <div className="space-y-6">
                          {/* Score Metric Cards */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="p-4 rounded-xl border border-border bg-card">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">ATS Score</span>
                              <div className={`text-2xl font-mono font-black mt-1 ${getScoreColorClass(candidateDetail.ats_score)}`}>
                                {candidateDetail.ats_score}/100
                              </div>
                              <span className="text-[10px] text-muted-foreground">Threshold: {candidateDetail.min_ats_score}</span>
                            </div>

                            <div className="p-4 rounded-xl border border-border bg-card">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">JD Match</span>
                              <div className="text-2xl font-mono font-black mt-1 text-primary">
                                {candidateDetail.match_percentage}%
                              </div>
                              <span className="text-[10px] text-muted-foreground">Semantic keyword fit</span>
                            </div>

                            <div className="p-4 rounded-xl border border-border bg-card">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">GitHub Evidence</span>
                              <div className="text-2xl font-mono font-black mt-1 text-purple-500">
                                {candidateDetail.github_evidence_score ?? 0}/100
                              </div>
                              <span className="text-[10px] text-muted-foreground">Code & repo authenticity</span>
                            </div>

                            <div className="p-4 rounded-xl border border-border bg-card">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Eligibility</span>
                              <div className="mt-1">
                                {candidateDetail.is_eligible ? (
                                  <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                                    <CheckCircle2 className="h-4 w-4" /> Meets Threshold
                                  </span>
                                ) : (
                                  <span className="text-xs font-bold text-amber-500 flex items-center gap-1">
                                    <AlertTriangle className="h-4 w-4" /> Below ({candidateDetail.score_difference})
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-muted-foreground">Delta: {candidateDetail.score_difference > 0 ? `+${candidateDetail.score_difference}` : candidateDetail.score_difference} pts</span>
                            </div>
                          </div>

                          {/* Contact Info & Professional Links */}
                          <div className="p-5 rounded-2xl border border-border bg-muted/20 space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              Candidate Contact & Authorized Profiles
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                              <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card">
                                <div>
                                  <span className="text-[10px] text-muted-foreground block">Email</span>
                                  <strong className="text-foreground">{candidateDetail.student_email || 'Not provided'}</strong>
                                </div>
                                {candidateDetail.student_email && (
                                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(candidateDetail.student_email, 'Email')} className="h-7 w-7 p-0">
                                    {copiedText === 'Email' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                                  </Button>
                                )}
                              </div>

                              <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card">
                                <div>
                                  <span className="text-[10px] text-muted-foreground block">Phone</span>
                                  <strong className="text-foreground">{candidateDetail.phone || 'Not listed in resume'}</strong>
                                </div>
                                {candidateDetail.phone && (
                                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(candidateDetail.phone, 'Phone')} className="h-7 w-7 p-0">
                                    {copiedText === 'Phone' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                                  </Button>
                                )}
                              </div>
                            </div>

                            {/* Section D: Clickable Professional Profile URLs */}
                            <div className="flex flex-wrap items-center gap-2 pt-2">
                              {candidateDetail.github_url && (
                                <a
                                  href={candidateDetail.github_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-medium flex items-center gap-1.5 transition-colors"
                                >
                                  <Github className="h-3.5 w-3.5" /> GitHub Profile <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                </a>
                              )}
                              {candidateDetail.linkedin_url && (
                                <a
                                  href={candidateDetail.linkedin_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-medium flex items-center gap-1.5 transition-colors"
                                >
                                  <Linkedin className="h-3.5 w-3.5 text-blue-500" /> LinkedIn Profile <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                </a>
                              )}
                              {candidateDetail.portfolio_url && (
                                <a
                                  href={candidateDetail.portfolio_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-medium flex items-center gap-1.5 transition-colors"
                                >
                                  <Globe className="h-3.5 w-3.5 text-emerald-500" /> Portfolio Website <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                </a>
                              )}
                              {candidateDetail.website_url && candidateDetail.website_url !== candidateDetail.portfolio_url && (
                                <a
                                  href={candidateDetail.website_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-medium flex items-center gap-1.5 transition-colors"
                                >
                                  <Globe className="h-3.5 w-3.5" /> Personal Website <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                </a>
                              )}
                            </div>
                          </div>

                          {/* 5. Shortlisting & Status Actions */}
                          <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-bold tracking-tight">Hiring Pipeline Decision</h4>
                              <span className="text-xs text-muted-foreground">Current: <strong className="uppercase text-primary">{candidateDetail.status}</strong></span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <Button
                                size="sm"
                                variant={candidateDetail.status === 'reviewing' ? 'default' : 'outline'}
                                onClick={() => promptStatusChange('reviewing')}
                                className="text-xs gap-1.5"
                              >
                                <Clock className="h-3.5 w-3.5 text-blue-500" /> Move to Reviewing
                              </Button>
                              <Button
                                size="sm"
                                variant={candidateDetail.status === 'shortlisted' ? 'default' : 'outline'}
                                onClick={() => promptStatusChange('shortlisted')}
                                className="text-xs gap-1.5 border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" /> Shortlist for Interview
                              </Button>
                              <Button
                                size="sm"
                                variant={candidateDetail.status === 'offered' ? 'default' : 'outline'}
                                onClick={() => promptStatusChange('offered')}
                                className="text-xs gap-1.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                              >
                                <Gift className="h-3.5 w-3.5" /> Mark as Offered
                              </Button>
                              <Button
                                size="sm"
                                variant={candidateDetail.status === 'rejected' ? 'default' : 'outline'}
                                onClick={() => promptStatusChange('rejected')}
                                className="text-xs gap-1.5 border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
                              >
                                <XCircle className="h-3.5 w-3.5" /> Reject Candidate
                              </Button>
                            </div>

                            <div className="space-y-1.5 pt-2">
                              <Label htmlFor="recruiter-notes" className="text-xs font-semibold">Evaluation Notes for Committee</Label>
                              <Textarea
                                id="recruiter-notes"
                                rows={2}
                                placeholder="Internal candidate evaluation notes..."
                                value={recruiterNotes}
                                onChange={(e) => setRecruiterNotes(e.target.value)}
                                className="text-xs"
                              />
                            </div>
                          </div>

                          {/* Audit Trail */}
                          {candidateDetail.audit_logs?.length > 0 && (
                            <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
                              <h5 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                <History className="h-3 w-3" /> Audit Log History
                              </h5>
                              <div className="space-y-1.5">
                                {candidateDetail.audit_logs.map((log) => (
                                  <div key={log.id} className="text-xs text-muted-foreground flex items-center justify-between">
                                    <span>
                                      Status changed: <strong className="text-foreground">{log.previous_status}</strong> &rarr; <strong className="text-primary">{log.new_status}</strong> ({log.notes})
                                    </span>
                                    <span className="text-[10px] font-mono">{new Date(log.created_at).toLocaleTimeString()}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* SECTION B: Critical Job-Specific Skills */}
                      {evaluationTab === 'skills' && (
                        <div className="space-y-6">
                          {/* Verification Disclaimer */}
                          <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-start gap-2.5 text-xs text-amber-700 dark:text-amber-400">
                            <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
                            <span>
                              <strong>Deterministic Verification Rule:</strong> Skills are marked as <em>Validated</em> only when backed by public repository evidence, commits, or practical projects. Skills merely mentioned in resume text without verifiable implementation are classified as <em>Unverified</em>.
                            </span>
                          </div>

                          {/* Category 1: Matching & Validated Skills */}
                          <div className="p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                <CheckCircle2 className="h-4 w-4" /> 1. Matching & Validated Skills ({candidateDetail.validated_skills?.length ?? 0})
                              </h4>
                              <span className="text-[10px] text-emerald-600 font-semibold">Repository / Project Verified</span>
                            </div>

                            {candidateDetail.validated_skills_items?.length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {candidateDetail.validated_skills_items.map((vItem, vIdx) => (
                                  <div key={vIdx} className="p-2.5 rounded-xl border border-emerald-500/20 bg-card text-xs space-y-1">
                                    <div className="font-bold text-emerald-600 dark:text-emerald-400">{vItem.skill}</div>
                                    <ul className="text-[11px] text-muted-foreground list-disc list-inside">
                                      {vItem.evidence?.map((ev, evIdx) => (
                                        <li key={evIdx}>{ev}</li>
                                      ))}
                                    </ul>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">No required skills have repository-backed validation yet.</p>
                            )}
                          </div>

                          {/* Category 2: Matching but Unverified Skills */}
                          <div className="p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                                <AlertTriangle className="h-4 w-4" /> 2. Matching but Unverified Skills ({candidateDetail.unverified_skills?.length ?? 0})
                              </h4>
                              <span className="text-[10px] text-amber-600 font-semibold">Self-Reported Only</span>
                            </div>

                            {candidateDetail.unverified_skills?.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {candidateDetail.unverified_skills.map((s, sIdx) => (
                                  <span key={sIdx} className="px-2.5 py-1 rounded-lg border border-amber-500/20 bg-card text-xs font-medium text-amber-700 dark:text-amber-300">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">No unverified matching skills.</p>
                            )}
                          </div>

                          {/* Category 3: Missing or Weak Skills */}
                          <div className="p-5 rounded-2xl border border-rose-500/20 bg-rose-500/5 space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                                <XCircle className="h-4 w-4" /> 3. Missing or Weak Skills ({candidateDetail.missing_skills?.length ?? 0})
                              </h4>
                              <span className="text-[10px] text-rose-600 font-semibold">Required by Job</span>
                            </div>

                            {candidateDetail.missing_skills?.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {candidateDetail.missing_skills.map((s, sIdx) => (
                                  <span key={sIdx} className="px-2.5 py-1 rounded-lg border border-rose-500/20 bg-card text-xs font-medium text-rose-600 dark:text-rose-400">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">Candidate satisfies all critical job skills!</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* SECTION C: Projects & Technical Evidence */}
                      {evaluationTab === 'projects' && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              Candidate Technical Projects ({candidateDetail.projects?.length ?? 0})
                            </h4>
                            <span className="text-xs text-muted-foreground">Ordered by job relevance</span>
                          </div>

                          {candidateDetail.projects?.length > 0 ? (
                            <div className="space-y-3">
                              {candidateDetail.projects.map((proj, pIdx) => (
                                <div key={pIdx} className="p-4 rounded-xl border border-border bg-card space-y-2">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <h5 className="font-bold text-foreground text-sm">{proj.title}</h5>
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                          proj.verification_status === 'Verified on GitHub'
                                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                            : proj.verification_status === 'Repository Linked'
                                            ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20'
                                            : 'bg-muted text-muted-foreground'
                                        }`}
                                      >
                                        {proj.verification_status}
                                      </span>
                                      {proj.relevance_score > 0 && (
                                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                                          {proj.relevance_score}% Match
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {proj.description && (
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                      {proj.description}
                                    </p>
                                  )}

                                  {proj.technologies?.length > 0 && (
                                    <div className="flex flex-wrap gap-1 pt-1">
                                      {proj.technologies.map((t, tIdx) => (
                                        <span key={tIdx} className="px-2 py-0.5 rounded bg-muted text-[10px] font-medium text-foreground">
                                          {t}
                                        </span>
                                      ))}
                                    </div>
                                  )}

                                  {/* Project links */}
                                  <div className="flex items-center gap-3 pt-2 text-xs">
                                    {proj.github_url && (
                                      <a
                                        href={proj.github_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline flex items-center gap-1 font-medium"
                                      >
                                        <Github className="h-3 w-3" /> View Codebase <ExternalLink className="h-2.5 w-2.5" />
                                      </a>
                                    )}
                                    {proj.live_url && (
                                      <a
                                        href={proj.live_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-emerald-500 hover:underline flex items-center gap-1 font-medium"
                                      >
                                        <Globe className="h-3 w-3" /> Live Demo <ExternalLink className="h-2.5 w-2.5" />
                                      </a>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-8 text-center rounded-xl border border-border bg-card">
                              <p className="text-xs text-muted-foreground">No discrete project records found in candidate resume.</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* SECTION D: Candidate Intelligence Summary (Groq LLM) */}
                      {evaluationTab === 'ai' && (
                        <div className="space-y-6">
                          <div className="flex items-center justify-between p-4 rounded-xl border border-primary/20 bg-primary/5">
                            <div>
                              <h4 className="text-sm font-bold text-primary flex items-center gap-1.5">
                                <Sparkles className="h-4 w-4" /> Groq AI Recruiter Intelligence
                              </h4>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Synthesized based on JD, deterministic ATS metrics, and verified repository evidence.
                              </p>
                            </div>
                            <Button
                              size="sm"
                              onClick={handleGenerateAiIntelligence}
                              disabled={generatingAi}
                              className="text-xs gap-1.5"
                            >
                              {generatingAi ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                              {candidateDetail.ai_candidate_summary ? 'Regenerate Dossier' : 'Generate with Groq'}
                            </Button>
                          </div>

                          {candidateDetail.ai_candidate_summary ? (
                            <div className="space-y-4 text-xs leading-relaxed">
                              {/* Executive Summary */}
                              <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                                <span className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Executive Assessment</span>
                                <p className="text-foreground leading-relaxed">{candidateDetail.ai_candidate_summary}</p>
                              </div>

                              {/* Tailored Technical Interview Questions */}
                              {candidateDetail.ai_interview_questions?.length > 0 && (
                                <div className="p-5 rounded-xl border border-border bg-card space-y-3">
                                  <span className="font-bold text-xs uppercase tracking-wider text-primary flex items-center gap-1.5">
                                    <HelpCircle className="h-4 w-4" /> Tailored Technical Interview Questions
                                  </span>
                                  <p className="text-[11px] text-muted-foreground">
                                    Targeting identified missing skills and validating depth of claimed project capabilities.
                                  </p>
                                  <div className="space-y-2">
                                    {candidateDetail.ai_interview_questions.map((q, qIdx) => (
                                      <div key={qIdx} className="p-3 rounded-lg border border-border bg-muted/30 flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-2">
                                          <span className="font-mono font-bold text-primary shrink-0">#{qIdx + 1}</span>
                                          <span className="text-foreground">{q}</span>
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => copyToClipboard(q, `Question #${qIdx + 1}`)}
                                          className="h-6 w-6 p-0 shrink-0"
                                        >
                                          <Copy className="h-3 w-3 text-muted-foreground" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-16 p-6 rounded-xl border border-border bg-card">
                              <Sparkles className="h-8 w-8 text-primary mx-auto mb-2" />
                              <h5 className="font-bold text-sm text-foreground">No AI summary generated yet</h5>
                              <p className="text-xs text-muted-foreground mt-1 mb-3">
                                Click "Generate with Groq" to synthesize an executive summary and interview questions.
                              </p>
                              <Button size="sm" onClick={handleGenerateAiIntelligence} disabled={generatingAi} className="text-xs">
                                Generate Assessment
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* SECTION E: Resume Viewer */}
                      {evaluationTab === 'resume' && (
                        <div className="space-y-3">
                          {/* Viewer Controls */}
                          <div className="p-3 rounded-xl border border-border bg-muted/40 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground">
                                {candidateDetail.filename || 'Candidate Resume'}
                              </span>
                              <span className="text-muted-foreground uppercase text-[10px]">
                                ({candidateDetail.file_type || 'PDF'})
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setZoomLevel((z) => Math.max(50, z - 15))}
                                className="h-7 w-7 p-0"
                              >
                                <ZoomOut className="h-3.5 w-3.5" />
                              </Button>
                              <span className="font-mono text-xs w-12 text-center">{zoomLevel}%</span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setZoomLevel((z) => Math.min(180, z + 15))}
                                className="h-7 w-7 p-0"
                              >
                                <ZoomIn className="h-3.5 w-3.5" />
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsFullScreenResume((f) => !f)}
                                className="h-7 w-7 p-0"
                              >
                                {isFullScreenResume ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                              </Button>

                              {candidateDetail.file_url && (
                                <a
                                  href={`/api/v1/recruiter/applications/${candidateDetail.id}/resume?download=true`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Button size="sm" variant="default" className="h-7 text-xs gap-1">
                                    <Download className="h-3 w-3" /> Download
                                  </Button>
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Embed Container */}
                          <div
                            className={`rounded-xl border border-border overflow-hidden bg-white dark:bg-zinc-950 transition-all ${
                              isFullScreenResume ? 'fixed inset-4 z-50 shadow-2xl flex flex-col' : 'h-[550px]'
                            }`}
                          >
                            {isFullScreenResume && (
                              <div className="p-2 bg-muted border-b border-border flex justify-end">
                                <Button size="sm" variant="outline" onClick={() => setIsFullScreenResume(false)}>
                                  Close Fullscreen
                                </Button>
                              </div>
                            )}

                            {candidateDetail.file_url ? (
                              <iframe
                                src={`/api/v1/recruiter/applications/${candidateDetail.id}/resume`}
                                title="Candidate Resume Viewer"
                                style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
                                className="w-full h-full border-0"
                              />
                            ) : candidateDetail.raw_text ? (
                              <div className="p-6 h-full overflow-y-auto font-mono text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                                {candidateDetail.raw_text}
                              </div>
                            ) : (
                              <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                                Resume preview unavailable.
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  ) : null}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* 4. CANDIDATE SIDE-BY-SIDE COMPARISON MODAL */}
        <AnimatePresence>
          {compareModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-card border border-border rounded-2xl max-w-6xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
              >
                {/* Header */}
                <div className="p-6 border-b border-border flex items-center justify-between bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Scale className="h-5 w-5 text-purple-500" />
                    <div>
                      <h3 className="text-xl font-bold text-foreground">Candidate Side-by-Side Comparison</h3>
                      <p className="text-xs text-muted-foreground">
                        Comparing {comparisonData?.candidates?.length ?? selectedForCompare.length} applicants for {job?.title} (Min ATS: {job?.min_ats_score})
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setCompareModalOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Body Table */}
                <div className="flex-1 overflow-auto p-6">
                  {loadingCompare ? (
                    <div className="py-24 text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                      <p className="text-xs text-muted-foreground mt-2">Computing multi-candidate matrix...</p>
                    </div>
                  ) : comparisonData?.candidates?.length > 0 ? (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="p-3 bg-muted/40 font-bold uppercase text-muted-foreground w-44">Attribute</th>
                          {comparisonData.candidates.map((c) => (
                            <th key={c.application_id} className="p-3 bg-card font-bold text-foreground min-w-[200px]">
                              <div className="text-sm font-extrabold">{c.student_name}</div>
                              <span className="text-[10px] text-muted-foreground block truncate">{c.student_email}</span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {/* ATS Score */}
                        <tr>
                          <td className="p-3 font-semibold bg-muted/20 text-muted-foreground">ATS Score</td>
                          {comparisonData.candidates.map((c) => (
                            <td key={c.application_id} className="p-3 font-mono font-bold">
                              <span className={`text-base ${getScoreColorClass(c.ats_score)}`}>{c.ats_score}/100</span>
                              <span className="text-[10px] text-muted-foreground block">
                                {c.is_eligible ? `Meets (+${c.score_difference})` : `Below (${c.score_difference})`}
                              </span>
                            </td>
                          ))}
                        </tr>

                        {/* JD Match */}
                        <tr>
                          <td className="p-3 font-semibold bg-muted/20 text-muted-foreground">JD Match %</td>
                          {comparisonData.candidates.map((c) => (
                            <td key={c.application_id} className="p-3 font-mono font-bold text-primary">
                              {c.match_percentage}%
                            </td>
                          ))}
                        </tr>

                        {/* GitHub Score */}
                        <tr>
                          <td className="p-3 font-semibold bg-muted/20 text-muted-foreground">GitHub Evidence</td>
                          {comparisonData.candidates.map((c) => (
                            <td key={c.application_id} className="p-3 font-mono font-bold text-purple-500">
                              {c.github_evidence_score}/100
                            </td>
                          ))}
                        </tr>

                        {/* Status */}
                        <tr>
                          <td className="p-3 font-semibold bg-muted/20 text-muted-foreground">Status</td>
                          {comparisonData.candidates.map((c) => (
                            <td key={c.application_id} className="p-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-muted text-foreground">
                                {c.status}
                              </span>
                            </td>
                          ))}
                        </tr>

                        {/* Validated Skills */}
                        <tr>
                          <td className="p-3 font-semibold bg-muted/20 text-muted-foreground">Validated Skills</td>
                          {comparisonData.candidates.map((c) => (
                            <td key={c.application_id} className="p-3">
                              <strong className="text-emerald-500 block mb-1">
                                {c.validated_skills_count} skills verified
                              </strong>
                              <div className="flex flex-wrap gap-1">
                                {c.validated_skills?.map((s, idx) => (
                                  <span key={idx} className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px]">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            </td>
                          ))}
                        </tr>

                        {/* Missing Skills */}
                        <tr>
                          <td className="p-3 font-semibold bg-muted/20 text-muted-foreground">Missing Requirements</td>
                          {comparisonData.candidates.map((c) => (
                            <td key={c.application_id} className="p-3">
                              {c.missing_skills?.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {c.missing_skills.map((s, idx) => (
                                    <span key={idx} className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-500 text-[10px]">
                                      {s}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-emerald-500 text-[11px] font-medium">None missing</span>
                              )}
                            </td>
                          ))}
                        </tr>

                        {/* Projects */}
                        <tr>
                          <td className="p-3 font-semibold bg-muted/20 text-muted-foreground">Top Projects</td>
                          {comparisonData.candidates.map((c) => (
                            <td key={c.application_id} className="p-3 space-y-1">
                              {c.top_projects?.map((p, idx) => (
                                <div key={idx} className="p-1.5 rounded bg-muted/30 border border-border">
                                  <div className="font-bold text-foreground text-[11px]">{p.title}</div>
                                  <span className="text-[10px] text-muted-foreground">{p.verification_status}</span>
                                </div>
                              ))}
                            </td>
                          ))}
                        </tr>

                        {/* Experience */}
                        <tr>
                          <td className="p-3 font-semibold bg-muted/20 text-muted-foreground">Experience</td>
                          {comparisonData.candidates.map((c) => (
                            <td key={c.application_id} className="p-3 text-muted-foreground">
                              {c.experience_summary}
                            </td>
                          ))}
                        </tr>

                        {/* Education */}
                        <tr>
                          <td className="p-3 font-semibold bg-muted/20 text-muted-foreground">Education</td>
                          {comparisonData.candidates.map((c) => (
                            <td key={c.application_id} className="p-3 text-foreground font-medium">
                              {c.education_summary}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  ) : null}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* 5. CONFIRMATION MODAL FOR STATUS TRANSITIONS */}
        <AnimatePresence>
          {confirmStatusModal.isOpen && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-card border border-border rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-base text-foreground">{confirmStatusModal.title}</h3>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {confirmStatusModal.message}
                </p>

                <div className="flex justify-end items-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmStatusModal({ isOpen: false, newStatus: null, title: '', message: '' })}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={executeStatusChange}
                    disabled={savingStatus}
                    className="gap-1.5 shadow-sm"
                  >
                    {savingStatus ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Confirm Decision
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
