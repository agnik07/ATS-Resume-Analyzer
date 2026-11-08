import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import Navbar from '../components/common/Navbar';
import GitHubEvidenceDashboard from '../components/github/GitHubEvidenceDashboard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Target,
  Upload,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Download,
  Brain,
  ShieldCheck,
  Zap,
  Layers,
  ChevronDown,
  ChevronUp,
  Tag,
  Sparkles,
  Building2,
  Briefcase,
  ExternalLink,
  Star,
  BookOpen,
  Code2,
  Check,
  Flame,
  ArrowRight,
  RefreshCw,
  BarChart3,
  HelpCircle,
  Clock,
  GraduationCap,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';

import { getScoreColorClass, getScoreBgClass, getScoreFillHex } from '../lib/scoreUtils';

const POPULAR_COMPANIES = ['Google', 'Microsoft', 'Amazon', 'Meta', 'Apple', 'Netflix', 'Uber', 'Salesforce'];
const POPULAR_ROLES = [
  'Full Stack Engineer',
  'Backend Engineer',
  'Frontend Engineer',
  'Machine Learning Engineer',
  'DevOps Engineer',
  'Data Scientist',
];

export default function UploadResume() {
  // 4 Required Inputs for Career Readiness Engine
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [file, setFile] = useState(null);
  const [jdFile, setJdFile] = useState(null);

  // Suggested options from catalog
  const [catalogCompanies, setCatalogCompanies] = useState(POPULAR_COMPANIES);
  const [catalogRoles, setCatalogRoles] = useState(POPULAR_ROLES);

  // Status & Results
  const [uploading, setUploading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [expandedIssue, setExpandedIssue] = useState(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Skill Gap & Roadmap state
  const [generatingSkillGap, setGeneratingSkillGap] = useState(false);
  const [skillGapResult, setSkillGapResult] = useState(null);
  const [activeWeek, setActiveWeek] = useState(1);

  const skillGapSectionRef = useRef(null);
  const navigate = useNavigate();

  // Load catalog suggestions on mount
  useEffect(() => {
    async function loadPresets() {
      try {
        const [compRes, roleRes] = await Promise.allSettled([
          api.get('/skill-gap/companies'),
          api.get('/skill-gap/roles'),
        ]);
        if (compRes.status === 'fulfilled' && compRes.value?.data?.length) {
          setCatalogCompanies(compRes.value.data.slice(0, 10));
        }
        if (roleRes.status === 'fulfilled' && roleRes.value?.data?.length) {
          setCatalogRoles(roleRes.value.data.slice(0, 10));
        }
      } catch (e) {
        // Fallback to presets
      }
    }
    loadPresets();
  }, []);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      const ext = selected.name.split('.').pop().toLowerCase();
      if (['pdf', 'docx', 'doc', 'txt', 'md'].includes(ext)) {
        setFile(selected);
        toast.success(`Selected resume: ${selected.name}`);
      } else {
        toast.error('Supported formats: PDF (.pdf), Word (.docx), or Text (.txt/.md).');
        e.target.value = null;
      }
    }
  };

  const handleJdFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      const ext = selected.name.split('.').pop().toLowerCase();
      if (['pdf', 'docx', 'doc', 'txt', 'md'].includes(ext)) {
        setJdFile(selected);
        toast.success(`Selected JD document: ${selected.name}`);
      } else {
        toast.error('Supported JD formats: PDF, Word, or Text document.');
        e.target.value = null;
      }
    }
  };

  // 1. Validation & Execution of Career Readiness ATS Pipeline
  const handleUploadAndAnalyze = async () => {
    // Validate 4 required inputs
    if (!company.trim()) {
      toast.error('Company Name is required. Please enter or select a target company.');
      return;
    }
    if (!role.trim()) {
      toast.error('Target Job Role is required. Please enter or select a target role.');
      return;
    }
    if (!jobDescription.trim() && !jdFile) {
      toast.error('Job Description is required. Please paste the JD or upload a JD document.');
      return;
    }
    if (!file) {
      toast.error('Resume File is required. Please select or drop your resume file.');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('company', company.trim());
    formData.append('role', role.trim());
    if (jobDescription.trim()) {
      formData.append('job_description', jobDescription.trim());
    }
    if (jdFile) {
      formData.append('jd_file', jdFile);
    }

    try {
      const res = await api.post('/ats/upload-and-analyze', formData);
      setAnalysisResult(res.data);
      setSkillGapResult(null); // Reset skill gap on new upload
      toast.success('Career Readiness ATS analysis complete!');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      const detail = err.response?.data?.detail || 'Resume analysis failed. Please check inputs and try again.';
      toast.error(detail);
    } finally {
      setUploading(false);
    }
  };

  // 2. Skill Gap & Learning Roadmap Generation (Reusing ATS report context)
  const handleGenerateSkillGap = async () => {
    if (!analysisResult?.id) {
      toast.error('Please analyze your resume first.');
      return;
    }

    setGeneratingSkillGap(true);
    try {
      const payload = {
        company: (analysisResult.target_company || company).trim(),
        role: (analysisResult.target_role || role).trim(),
        job_description: (analysisResult.job_description || jobDescription).trim() || undefined,
        resume_id: analysisResult.resume_id,
        ats_report_id: analysisResult.id,
      };

      const res = await api.post('/skill-gap/analyze', payload);
      setSkillGapResult(res.data);
      toast.success('Skill Gap Analysis & Personalized Learning Roadmap generated!');
      setTimeout(() => {
        skillGapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
    } catch (err) {
      const detail = err.response?.data?.detail || 'Failed to generate skill gap roadmap.';
      toast.error(detail);
    } finally {
      setGeneratingSkillGap(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!analysisResult?.id) return;
    setDownloadingPdf(true);
    try {
      const res = await api.get(`/ats/reports/${analysisResult.id}/export-pdf`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Career_Readiness_Report_${analysisResult.filename}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('PDF report downloaded successfully!');
    } catch (err) {
      toast.error('Failed to download PDF report.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const resetForm = () => {
    setAnalysisResult(null);
    setSkillGapResult(null);
    setFile(null);
    setJdFile(null);
  };

  // Prepare chart data for skill gap display
  const chartData = (skillGapResult?.skill_gaps || []).slice(0, 10).map((item) => ({
    name: item.skill.length > 14 ? item.skill.slice(0, 13) + '…' : item.skill,
    fullName: item.skill,
    demand: item.demand_proficiency || 2.0,
    candidate: item.candidate_proficiency || 0.0,
    gap: item.gap,
    status: item.status,
  }));

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header Banner */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                Career Intelligence Platform
              </span>
              <span className="text-xs text-muted-foreground font-mono">v3.0</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight mt-1">Career Readiness Engine</h1>
            <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
              Unified evaluation: deterministic 5-pillar ATS scoring, verifiable GitHub engineering evidence, hybrid skill gap analysis, and tailored 4-week roadmaps.
            </p>
          </div>

          {analysisResult && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={resetForm} className="gap-2">
                <RefreshCw className="h-4 w-4" /> New Evaluation
              </Button>
            </div>
          )}
        </motion.div>

        {!analysisResult ? (
          /* ========================================================================= */
          /* 4-INPUT CAREER READINESS FORM                                             */
          /* ========================================================================= */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 glass-card rounded-2xl p-6 sm:p-8 border border-border shadow-sm space-y-6">
              <div className="border-b border-border pb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Target Career Context & Resume
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  All 4 inputs are required to power deterministic scoring, skill taxonomy matching, and company DSA recommendations.
                </p>
              </div>

              {/* 1. Target Company Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="company-input" className="text-sm font-semibold flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-primary" />
                    1. Target Company Name <span className="text-red-500">*</span>
                  </Label>
                  <span className="text-[11px] text-muted-foreground">e.g. Google, Amazon, Stripe</span>
                </div>
                <Input
                  id="company-input"
                  placeholder="Enter target company name (e.g., Google)"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="bg-background/60"
                />
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-muted-foreground mr-1">Popular:</span>
                  {catalogCompanies.slice(0, 6).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCompany(c)}
                      className={`text-[11px] px-2 py-0.5 rounded-md border transition-colors ${
                        company.toLowerCase() === c.toLowerCase()
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted/40 hover:bg-muted text-muted-foreground border-border'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Target Job Role Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="role-input" className="text-sm font-semibold flex items-center gap-1.5">
                    <Briefcase className="h-4 w-4 text-primary" />
                    2. Target Job Role <span className="text-red-500">*</span>
                  </Label>
                  <span className="text-[11px] text-muted-foreground">e.g. Backend Engineer, ML Specialist</span>
                </div>
                <Input
                  id="role-input"
                  placeholder="Enter target job role (e.g., Full Stack Engineer)"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="bg-background/60"
                />
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-muted-foreground mr-1">Popular:</span>
                  {catalogRoles.slice(0, 4).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`text-[11px] px-2 py-0.5 rounded-md border transition-colors ${
                        role.toLowerCase() === r.toLowerCase()
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted/40 hover:bg-muted text-muted-foreground border-border'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Job Description Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="jd-textarea" className="text-sm font-semibold flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-primary" />
                    3. Target Job Description <span className="text-red-500">*</span>
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 gap-1"
                    onClick={() => document.getElementById('jd-file-input').click()}
                  >
                    <Upload className="h-3 w-3" />
                    {jdFile ? jdFile.name : 'Upload JD File'}
                  </Button>
                  <input
                    id="jd-file-input"
                    type="file"
                    accept=".pdf,.docx,.doc,.txt,.md"
                    onChange={handleJdFileChange}
                    className="hidden"
                  />
                </div>
                <Textarea
                  id="jd-textarea"
                  rows={4}
                  placeholder="Paste the target job description here (or upload document above). Required for keyword extraction, requirement verification, and hybrid matching..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="bg-background/60 resize-none text-sm font-sans"
                />
                {jdFile && (
                  <p className="text-xs text-primary flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> JD Document attached: {jdFile.name}
                  </p>
                )}
              </div>

              {/* 4. Resume File Upload */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <Upload className="h-4 w-4 text-primary" />
                  4. Candidate Resume File <span className="text-red-500">*</span>
                </Label>
                <div
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                    file ? 'border-primary/60 bg-primary/5' : 'border-border hover:border-primary/50 bg-background/40'
                  }`}
                  onClick={() => document.getElementById('resume-file-input').click()}
                >
                  <input
                    id="resume-file-input"
                    type="file"
                    accept=".pdf,.docx,.doc,.txt,.md"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Upload className="h-10 w-10 mx-auto mb-2 text-primary" />
                  <h3 className="text-base font-semibold">
                    {file ? file.name : 'Click to select or drag and drop candidate resume'}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supported: PDF (.pdf), Word (.docx), or Markdown/Text (.txt/.md) — Max 10MB
                  </p>
                  {file && (
                    <span className="inline-block mt-2 px-3 py-0.5 bg-primary/10 text-primary text-xs font-semibold rounded-full border border-primary/20">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB Selected
                    </span>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleUploadAndAnalyze}
                disabled={uploading}
                className="w-full py-6 text-base font-semibold rounded-xl shadow-lg shadow-primary/20"
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Executing Deterministic 5-Pillar ATS Pipeline...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-5 w-5" />
                    Evaluate Career Readiness
                  </>
                )}
              </Button>
            </div>

            {/* Sidebar Guide */}
            <div className="space-y-4">
              <div className="p-6 rounded-2xl border border-border bg-card shadow-sm">
                <h3 className="font-bold text-base flex items-center gap-2 mb-3">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Deterministic ATS Standard
                </h3>
                <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                  The ATS score is calculated through rigorous rule-based formulas and cosine similarity embeddings. The LLM never invents or alters numerical scores.
                </p>
                <ul className="space-y-2.5 text-xs text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-foreground">1. Formatting (20 pts):</span> Section headers, standard layout, contact info.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-foreground">2. Keywords (25 pts):</span> Technical taxonomy matching against JD.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-foreground">3. Content Quality (25 pts):</span> Action verbs and measurable impact metrics.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-foreground">4. Skill Validation (15 pts):</span> Semantic proof of skills in project descriptions.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-foreground">5. Parseability (15 pts):</span> Encoding integrity and privacy protection.
                  </li>
                </ul>
              </div>

              <div className="p-6 rounded-2xl border border-border bg-card/60 shadow-sm space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Brain className="h-4 w-4 text-primary" /> Integrated Workflow
                </h4>
                <p className="text-xs text-muted-foreground">
                  Once your resume is evaluated, one click runs our research-backed Skill Gap Engine ($g_i = \max(0, d_i - w_i)$), creates a tailored 4-week roadmap with verified resources, and retrieves company-specific DSA interview problems.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* EVALUATION RESULTS VIEW: ATS REPORT + SKILL GAP ENGINE BRIDGE             */
          /* ========================================================================= */
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            {/* Top Analysis Context Bar */}
            <div className="px-6 py-4 rounded-xl border border-border bg-muted/40 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-primary" />
                  Target: <strong className="text-primary">{analysisResult.target_company || company}</strong>
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4 text-primary" />
                  Role: <strong className="text-primary">{analysisResult.target_role || role}</strong>
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <FileText className="h-4 w-4" />
                  File: {analysisResult.filename}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button onClick={handleDownloadPdf} disabled={downloadingPdf} variant="outline" size="sm" className="gap-1.5 text-xs">
                  {downloadingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                  Export PDF
                </Button>
              </div>
            </div>

            {/* Distinct Score Metrics Cards (4 Metrics) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Metric 1: Base ATS Score */}
              <div className="p-6 rounded-2xl border border-border bg-card shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs uppercase font-bold text-muted-foreground tracking-wider">
                      Base ATS Score
                    </span>
                    <ShieldCheck className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-4xl font-black font-mono mt-1 flex items-baseline gap-1">
                    <span className={getScoreColorClass(analysisResult.overall_score)}>
                      {analysisResult.overall_score}
                    </span>
                    <span className="text-xs text-muted-foreground font-normal">/ 100</span>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground mt-3 pt-3 border-t border-border">
                  Deterministic 5-pillar mathematical score.
                </p>
              </div>

              {/* Metric 2: Enhanced ATS Score */}
              <div className="p-6 rounded-2xl border border-border bg-card shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs uppercase font-bold text-muted-foreground tracking-wider">
                      Enhanced ATS Score
                    </span>
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-4xl font-black font-mono mt-1 flex items-baseline gap-1">
                    <span className={getScoreColorClass(analysisResult.enhanced_ats_score || analysisResult.overall_score)}>
                      {analysisResult.enhanced_ats_score ?? analysisResult.overall_score}
                    </span>
                    <span className="text-xs text-muted-foreground font-normal">/ 100</span>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground mt-3 pt-3 border-t border-border">
                  {analysisResult.github_evidence?.is_available
                    ? 'Weighted: 75% ATS + 25% GitHub Evidence.'
                    : 'GitHub not detected; matches Base ATS.'}
                </p>
              </div>

              {/* Metric 3: JD Skill Match % */}
              <div className="p-6 rounded-2xl border border-border bg-card shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs uppercase font-bold text-muted-foreground tracking-wider">
                      JD Skill Match %
                    </span>
                    <Target className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-4xl font-black font-mono mt-1 flex items-baseline gap-1">
                    <span className={getScoreColorClass(skillGapResult?.match_percentage ?? analysisResult.match_percentage ?? 0)}>
                      {(skillGapResult?.match_percentage ?? analysisResult.match_percentage ?? 0).toFixed(0)}%
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground mt-3 pt-3 border-t border-border">
                  {skillGapResult
                    ? 'Hybrid Formula: 0.6·Rule + 0.4·Semantic'
                    : 'Initial JD technical keyword alignment.'}
                </p>
              </div>

              {/* Metric 4: GitHub Evidence Score */}
              <div className="p-6 rounded-2xl border border-border bg-card shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs uppercase font-bold text-muted-foreground tracking-wider">
                      GitHub Evidence
                    </span>
                    <Code2 className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-4xl font-black font-mono mt-1 flex items-baseline gap-1">
                    {analysisResult.github_evidence?.is_available ? (
                      <>
                        <span className={getScoreColorClass(analysisResult.github_evidence_score)}>
                          {analysisResult.github_evidence_score}
                        </span>
                        <span className="text-xs text-muted-foreground font-normal">/ 100</span>
                      </>
                    ) : (
                      <span className="text-xl font-bold text-muted-foreground">Not Linked</span>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground mt-3 pt-3 border-t border-border">
                  {analysisResult.github_evidence?.is_available
                    ? `${analysisResult.github_evidence.verified_repositories_count || 0} repos validated against claims.`
                    : 'Add GitHub profile to boost authentic score.'}
                </p>
              </div>
            </div>

            {/* Score Modifiers (Bonuses & Penalties) */}
            {(Object.keys(analysisResult.bonuses || {}).length > 0 || Object.keys(analysisResult.penalties || {}).length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.keys(analysisResult.bonuses || {}).length > 0 && (
                  <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold uppercase text-primary tracking-wider">Applied Score Bonuses (+)</h4>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {Object.entries(analysisResult.bonuses || {}).map(([key, val]) => (
                          <span key={key} className="px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-primary/10 text-primary border border-primary/20">
                            +{val} pts: {key.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {Object.keys(analysisResult.penalties || {}).length > 0 && (
                  <div className="p-4 rounded-xl border border-[#993C1D]/20 dark:border-[#F0997B]/30 bg-[#993C1D]/5 dark:bg-[#F0997B]/5 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-[#993C1D] dark:text-[#F0997B] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold uppercase text-[#993C1D] dark:text-[#F0997B] tracking-wider">Applied Unverified Penalties (-)</h4>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {Object.entries(analysisResult.penalties || {}).map(([key, val]) => (
                          <span key={key} className="px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-[#993C1D]/10 text-[#993C1D] dark:text-[#F0997B] border border-[#993C1D]/20">
                            -{val} pts: {key.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 5-Pillar Breakdown Cards */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold tracking-tight">5-Pillar Score Breakdown</h3>
                <span className="text-xs text-muted-foreground">Standard 100-Point Model</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                  { name: 'Formatting & Layout', score: analysisResult.component_scores.formatting, max: 20 },
                  { name: 'Keywords & Taxonomy', score: analysisResult.component_scores.keywords, max: 25 },
                  { name: 'Content Quality', score: analysisResult.component_scores.content, max: 25 },
                  { name: 'Skill Validation', score: analysisResult.component_scores.skill_validation, max: 15 },
                  { name: 'ATS Parseability', score: analysisResult.component_scores.ats_compatibility, max: 15 },
                ].map((pillar) => {
                  const pct = (pillar.score / pillar.max) * 100;
                  return (
                    <div key={pillar.name} className="p-5 rounded-xl border border-border bg-card flex flex-col justify-between shadow-sm">
                      <div>
                        <span className="text-[11px] text-muted-foreground font-semibold uppercase">{pillar.name}</span>
                        <div className="text-2xl font-black font-mono mt-1">
                          {pillar.score} <span className="text-xs text-muted-foreground font-normal">/ {pillar.max}</span>
                        </div>
                      </div>
                      <div className="w-full bg-muted h-2 rounded-full mt-3 overflow-hidden">
                        <div
                          className={`h-full ${pct >= 70 ? 'bg-primary' : pct >= 40 ? 'bg-[#BA7517] dark:bg-[#EF9F27]' : 'bg-[#993C1D] dark:bg-[#F0997B]'} rounded-full transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* GitHub Evidence Dashboard Component */}
            {analysisResult.github_evidence && analysisResult.github_evidence.is_available && (
              <GitHubEvidenceDashboard
                githubEvidence={analysisResult.github_evidence}
                enhancedAtsScore={analysisResult.enhanced_ats_score}
                originalAtsScore={analysisResult.overall_score}
              />
            )}

            {/* Skill Evidence & Validation Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Validated Skills */}
              <div className="p-6 rounded-2xl border border-border bg-card shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-foreground flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    Validated Skills ({analysisResult.skill_validation_details?.validated?.length || 0})
                  </h4>
                  <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
                    {analysisResult.skill_validation_details?.validation_pct?.toFixed(0)}% Backed by Projects
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
                  {analysisResult.skill_validation_details?.validated?.map((item, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-primary/10 border border-primary/20 text-primary rounded-lg text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Tag className="h-3 w-3" />
                      {item.skill}
                      <span className="text-[10px] text-muted-foreground">({item.projects?.[0] || 'Experience'})</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Unvalidated Skills */}
              <div className="p-6 rounded-2xl border border-border bg-card shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-foreground flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-[#BA7517] dark:text-[#EF9F27]" />
                    Unvalidated Skills ({analysisResult.skill_validation_details?.unvalidated?.length || 0})
                  </h4>
                  <span className="text-xs text-muted-foreground">Lacks Project Mentions</span>
                </div>
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
                  {analysisResult.skill_validation_details?.unvalidated?.length > 0 ? (
                    analysisResult.skill_validation_details.unvalidated.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-[#BA7517]/10 dark:bg-[#EF9F27]/15 border border-[#BA7517]/20 dark:border-[#EF9F27]/30 text-[#BA7517] dark:text-[#EF9F27] rounded-lg text-xs font-semibold"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">All extracted skills are supported by project or work experience!</p>
                  )}
                </div>
              </div>
            </div>

            {/* Strengths and Prioritized Action Items */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl border border-border bg-card shadow-sm">
                <h4 className="font-bold text-foreground mb-4">Standout Resume Strengths</h4>
                <ul className="space-y-2">
                  {analysisResult.strengths?.map((s, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-6 rounded-2xl border border-border bg-card shadow-sm">
                <h4 className="font-bold text-foreground mb-4">Prioritized Action Items</h4>
                <div className="space-y-3">
                  {analysisResult.detailed_feedback?.map((issue, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-border bg-background/50">
                      <div
                        className="flex justify-between items-center cursor-pointer"
                        onClick={() => setExpandedIssue(expandedIssue === idx ? null : idx)}
                      >
                        <span className="text-sm font-semibold text-foreground">
                          [{issue.severity_level}] {issue.issue_title}
                        </span>
                        {expandedIssue === idx ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{issue.explanation}</p>
                      {expandedIssue === idx && (
                        <div className="mt-3 pt-3 border-t border-border space-y-2 text-xs">
                          <div>
                            <span className="font-bold text-foreground">How to Fix:</span> {issue.how_to_fix}
                          </div>
                          {issue.example_improvement && (
                            <div className="p-2.5 rounded-lg bg-muted/60 font-mono text-[11px] whitespace-pre-wrap">
                              {issue.example_improvement}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* PROMINENT INTEGRATION CALLOUT: GENERATE SKILL GAPS & LEARNING ROADMAP     */}
            {/* ========================================================================= */}
            <div className="p-8 rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/10 via-primary/5 to-background shadow-xl text-center space-y-4">
              <div className="inline-flex p-3 rounded-2xl bg-primary/20 text-primary mb-1">
                <Brain className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-extrabold tracking-tight">
                Unlock Complete Career Intelligence
              </h3>
              <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                Connect your ATS assessment directly to our research-grade Skill Gap Engine. Evaluates your candidate proficiency ($w_i$) against demand ($d_i$) for <strong className="text-foreground">{analysisResult.target_role || role}</strong> at <strong className="text-foreground">{analysisResult.target_company || company}</strong>, builds a 4-week verified learning roadmap, and suggests company-specific DSA challenges.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  onClick={handleGenerateSkillGap}
                  disabled={generatingSkillGap}
                  size="lg"
                  className="px-8 py-6 text-base font-bold rounded-xl shadow-lg shadow-primary/30 gap-2"
                >
                  {generatingSkillGap ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Computing Skill Gaps & 4-Week Roadmap...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      Generate Skill Gaps & Learning Roadmap
                    </>
                  )}
                </Button>
                {skillGapResult && (
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => skillGapSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
                    className="gap-2"
                  >
                    <BarChart3 className="h-5 w-5" /> View Active Roadmap Below
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Reuses existing parsed resume and JD data. Zero reparsing or re-uploading required.
              </p>
            </div>

            {/* ========================================================================= */}
            {/* SKILL GAP ENGINE & ROADMAP RESULTS SECTION                                */}
            {/* ========================================================================= */}
            {skillGapResult && (
              <motion.div
                ref={skillGapSectionRef}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8 pt-4 border-t-2 border-border"
              >
                {/* Skill Gap Banner */}
                <div className="p-8 rounded-2xl border border-border bg-card shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                        Research Methodology Hybrid Match
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">
                        Source: {skillGapResult.fallback_used}
                      </span>
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight mt-1">
                      Skill Gap Intelligence: {skillGapResult.target_role} @ {skillGapResult.target_company}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                      Formula: C = 0.6 × M_rule + 0.4 × (Sim × 100). Confidence level: <strong>{skillGapResult.confidence_level}</strong> ({(skillGapResult.confidence_score * 100).toFixed(0)}%).
                    </p>
                  </div>

                  <div className="flex items-center gap-6 p-4 rounded-xl bg-muted/40 border border-border shrink-0">
                    <div className="text-center">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Hybrid Match</span>
                      <div className={`text-3xl font-black font-mono ${getScoreColorClass(skillGapResult.match_percentage)}`}>
                        {skillGapResult.match_percentage.toFixed(0)}%
                      </div>
                    </div>
                    <div className="h-10 w-[1px] bg-border" />
                    <div className="text-center">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Identified Gaps</span>
                      <div className="text-3xl font-black font-mono text-[#BA7517] dark:text-[#EF9F27]">
                        {skillGapResult.skill_gaps.filter(g => g.gap > 0).length}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Skills Match vs Missing Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Matched Skills */}
                  <div className="p-6 rounded-2xl border border-border bg-card shadow-sm">
                    <h4 className="font-bold text-foreground flex items-center gap-2 mb-3">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                      Matched Skills ({skillGapResult.matched_skills.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {skillGapResult.matched_skills.map((s, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 rounded-lg text-xs font-semibold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1"
                        >
                          <Check className="h-3 w-3" /> {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Missing / High-Priority Gaps */}
                  <div className="p-6 rounded-2xl border border-border bg-card shadow-sm">
                    <h4 className="font-bold text-foreground flex items-center gap-2 mb-3">
                      <Flame className="h-5 w-5 text-[#993C1D] dark:text-[#F0997B]" />
                      Missing / Priority Skills to Acquire ({skillGapResult.missing_skills.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {skillGapResult.missing_skills.map((s, idx) => {
                        const gapObj = skillGapResult.skill_gaps.find(g => g.skill.toLowerCase() === s.toLowerCase());
                        const isHigh = (gapObj?.importance || 0) >= 0.7;
                        return (
                          <span
                            key={idx}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 ${
                              isHigh
                                ? 'bg-[#993C1D]/10 dark:bg-[#F0997B]/15 text-[#993C1D] dark:text-[#F0997B] border-[#993C1D]/20'
                                : 'bg-[#BA7517]/10 dark:bg-[#EF9F27]/15 text-[#BA7517] dark:text-[#EF9F27] border-[#BA7517]/20'
                            }`}
                          >
                            <AlertTriangle className="h-3 w-3" />
                            {s}
                            {gapObj && (
                              <span className="text-[10px] font-mono opacity-80">
                                (Gap: {gapObj.gap.toFixed(1)})
                              </span>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Skill Gap Breakdown Chart (g_i = max(0, d_i - w_i)) */}
                {chartData.length > 0 && (
                  <div className="p-6 rounded-2xl border border-border bg-card shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-bold text-foreground flex items-center gap-2">
                          <BarChart3 className="h-5 w-5 text-primary" />
                          Skill Gap Formula Breakdown: $g_i = \max(0, d_i - w_i)$
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Comparing Role Demand Proficiency ($d_i$) vs Candidate Validated Proficiency ($w_i$).
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-sm bg-primary" /> Demand ($d_i$)
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-sm bg-[#BA7517] dark:bg-[#EF9F27]" /> Candidate ($w_i$)
                        </span>
                      </div>
                    </div>

                    <div className="h-72 w-full mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 25 }}>
                          <XAxis dataKey="name" angle={-25} textAnchor="end" height={50} tick={{ fontSize: 11 }} />
                          <YAxis domain={[0, 3]} ticks={[0, 1, 2, 3]} tick={{ fontSize: 11 }} />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="p-3 bg-popover border border-border rounded-lg shadow-lg text-xs space-y-1">
                                    <div className="font-bold text-foreground">{data.fullName}</div>
                                    <div className="text-primary">Role Demand ($d_i$): {data.demand.toFixed(1)} / 3.0</div>
                                    <div className="text-[#BA7517] dark:text-[#EF9F27]">Candidate Level ($w_i$): {data.candidate.toFixed(1)} / 3.0</div>
                                    <div className="font-mono font-bold text-foreground pt-1 border-t border-border">
                                      Calculated Gap ($g_i$): {data.gap.toFixed(1)}
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar dataKey="demand" fill="#0F6E56" radius={[4, 4, 0, 0]} name="Demand Proficiency" />
                          <Bar dataKey="candidate" fill="#BA7517" radius={[4, 4, 0, 0]} name="Candidate Proficiency" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Personalized 4-Week Learning Roadmap */}
                {skillGapResult.roadmap_weeks && skillGapResult.roadmap_weeks.length > 0 && (
                  <div className="p-6 sm:p-8 rounded-2xl border border-border bg-card shadow-sm space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                            Structured Curriculum
                          </span>
                        </div>
                        <h3 className="text-xl font-bold tracking-tight mt-1 flex items-center gap-2">
                          <GraduationCap className="h-5 w-5 text-primary" />
                          Personalized 4-Week Career Roadmap
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Progressive weekly milestones tailored to bridge your exact high-impact missing skills.
                        </p>
                      </div>

                      {/* Week Selectors */}
                      <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl">
                        {[1, 2, 3, 4].map((w) => (
                          <button
                            key={w}
                            type="button"
                            onClick={() => setActiveWeek(w)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              activeWeek === w
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            Week {w}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Active Week Details */}
                    {(() => {
                      const weekData = skillGapResult.roadmap_weeks.find((w) => w.week === activeWeek) || skillGapResult.roadmap_weeks[0];
                      if (!weekData) return null;

                      return (
                        <div className="space-y-6">
                          {/* Week Theme & Focus */}
                          <div className="p-4 rounded-xl bg-muted/30 border border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div>
                              <span className="text-xs font-bold uppercase text-primary tracking-wider">
                                Week {weekData.week} Focus
                              </span>
                              <h4 className="text-lg font-bold text-foreground mt-0.5">{weekData.theme}</h4>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {weekData.focus_skills?.map((skill, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="px-2.5 py-1 rounded-md text-xs font-semibold bg-primary/10 text-primary border border-primary/20"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Objectives & Exercises */}
                            <div className="space-y-4">
                              <div className="p-5 rounded-xl border border-border bg-background/50 space-y-3">
                                <h5 className="text-xs font-bold uppercase text-foreground tracking-wider flex items-center gap-1.5">
                                  <Target className="h-4 w-4 text-primary" /> Learning Objectives
                                </h5>
                                <ul className="space-y-2">
                                  {weekData.objectives?.map((obj, oIdx) => (
                                    <li key={oIdx} className="text-xs text-muted-foreground flex items-start gap-2">
                                      <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                                      <span>{obj}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <div className="p-5 rounded-xl border border-border bg-background/50 space-y-3">
                                <h5 className="text-xs font-bold uppercase text-foreground tracking-wider flex items-center gap-1.5">
                                  <Code2 className="h-4 w-4 text-primary" /> Practical Hands-on Exercises
                                </h5>
                                <ul className="space-y-2">
                                  {weekData.practical_exercises?.map((ex, eIdx) => (
                                    <li key={eIdx} className="text-xs text-muted-foreground flex items-start gap-2">
                                      <ArrowRight className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                                      <span>{ex}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>

                            {/* Mini Project & Expected Outcomes */}
                            <div className="space-y-4">
                              <div className="p-5 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
                                <h5 className="text-xs font-bold uppercase text-primary tracking-wider flex items-center gap-1.5">
                                  <Sparkles className="h-4 w-4" /> Weekly Mini-Project
                                </h5>
                                <p className="text-xs text-foreground font-medium leading-relaxed">
                                  {weekData.mini_project}
                                </p>
                              </div>

                              <div className="p-5 rounded-xl border border-border bg-background/50 space-y-3">
                                <h5 className="text-xs font-bold uppercase text-foreground tracking-wider flex items-center gap-1.5">
                                  <Check className="h-4 w-4 text-primary" /> Expected Outcomes
                                </h5>
                                <ul className="space-y-2">
                                  {weekData.learning_outcomes?.map((out, outIdx) => (
                                    <li key={outIdx} className="text-xs text-muted-foreground flex items-start gap-2">
                                      <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                                      <span>{out}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>

                          {/* Verified Learning Resources for this week */}
                          <div className="space-y-3 pt-2">
                            <h5 className="text-sm font-bold text-foreground flex items-center gap-2">
                              <BookOpen className="h-4 w-4 text-primary" />
                              Verified Learning Resources for Week {weekData.week}
                            </h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {weekData.resources?.map((res, rIdx) => (
                                <div
                                  key={rIdx}
                                  className="p-4 rounded-xl border border-border bg-background hover:border-primary/40 transition-colors shadow-sm flex flex-col justify-between space-y-3"
                                >
                                  <div>
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                                        {res.platform}
                                      </span>
                                      {res.verified ? (
                                        <span className="text-[10px] font-semibold text-primary flex items-center gap-1">
                                          <ShieldCheck className="h-3 w-3" /> Verified Resource
                                        </span>
                                      ) : (
                                        <span className="text-[10px] font-semibold text-muted-foreground">
                                          Educational Reference
                                        </span>
                                      )}
                                    </div>
                                    <h6 className="font-bold text-sm text-foreground mt-2 line-clamp-1">{res.title}</h6>
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{res.why_recommended}</p>
                                  </div>

                                  <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
                                      {res.provider && <span>by {res.provider}</span>}
                                      {res.duration && (
                                        <>
                                          <span>•</span>
                                          <span className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" /> {res.duration}
                                          </span>
                                        </>
                                      )}
                                      <span>•</span>
                                      <span className="text-foreground font-medium">
                                        {res.rating_display || 'Rating unavailable'}
                                      </span>
                                    </div>

                                    {res.url && (
                                      <a
                                        href={res.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-primary hover:underline font-semibold text-xs shrink-0"
                                      >
                                        Access Resource <ExternalLink className="h-3 w-3" />
                                      </a>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Company-Specific DSA Interview Preparation */}
                {skillGapResult.company_dsa_problems && skillGapResult.company_dsa_problems.length > 0 && (
                  <div className="p-6 sm:p-8 rounded-2xl border border-border bg-card shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                            Master DSA Bank (3,310+ Problems)
                          </span>
                        </div>
                        <h3 className="text-xl font-bold tracking-tight mt-1 flex items-center gap-2">
                          <Code2 className="h-5 w-5 text-primary" />
                          Company-Specific Technical Interview Questions for {skillGapResult.target_company}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Frequently asked algorithm and data structure problems mapped directly to {skillGapResult.target_company}.
                        </p>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          navigate('/dsa-tracker', {
                            state: {
                              company: skillGapResult.target_company,
                              role: skillGapResult.target_role,
                              missing_skills: skillGapResult.missing_skills || [],
                            },
                          })
                        }
                        className="gap-1.5 text-xs self-start sm:self-center"
                      >
                        Open Full DSA Tracker <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                      {skillGapResult.company_dsa_problems.map((prob, pIdx) => {
                        const diff = (prob.difficulty || 'Medium').toLowerCase();
                        const diffBadge =
                          diff === 'easy'
                            ? 'bg-[#0F6E56]/10 text-[#0F6E56] border-[#0F6E56]/20'
                            : diff === 'hard'
                            ? 'bg-[#993C1D]/10 text-[#993C1D] border-[#993C1D]/20'
                            : 'bg-[#BA7517]/10 text-[#BA7517] border-[#BA7517]/20';

                        return (
                          <div
                            key={pIdx}
                            className="p-4 rounded-xl border border-border bg-background hover:border-primary/40 transition-colors shadow-sm flex flex-col justify-between space-y-3"
                          >
                            <div>
                              <div className="flex items-center justify-between">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${diffBadge}`}>
                                  {prob.difficulty}
                                </span>
                                <span className="text-[11px] font-mono text-muted-foreground">
                                  {prob.topic || 'Algorithms'}
                                </span>
                              </div>
                              <h5 className="font-bold text-sm text-foreground mt-2">{prob.title}</h5>
                              <p className="text-xs text-muted-foreground mt-0.5">Company: {prob.company}</p>
                            </div>

                            <div className="flex items-center gap-2 pt-2 border-t border-border">
                              {prob.leetcode_url && (
                                <a
                                  href={prob.leetcode_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-primary font-semibold hover:underline inline-flex items-center gap-1"
                                >
                                  LeetCode <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                              {prob.gfg_url && (
                                <a
                                  href={prob.gfg_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-muted-foreground hover:text-foreground font-semibold inline-flex items-center gap-1 ml-auto"
                                >
                                  GeeksforGeeks <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Bottom Actions */}
            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <Button variant="outline" onClick={resetForm} className="gap-2">
                <RefreshCw className="h-4 w-4" /> Evaluate Another Target Role
              </Button>
              <Button onClick={() => navigate('/jobs')} className="gap-2 shadow-sm">
                <Briefcase className="h-4 w-4" /> Browse Verified Job Listings
              </Button>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
