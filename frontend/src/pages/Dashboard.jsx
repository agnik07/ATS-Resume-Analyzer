import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/common/Navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Upload,
  FileText,
  Brain,
  Briefcase,
  Code2,
  Newspaper,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  TrendingUp,
  Award,
  Target,
  Zap,
  ShieldCheck,
  Building2,
  ChevronRight,
  Check,
  ExternalLink,
  Flame,
  Calendar,
  Layers,
  GraduationCap,
  Percent,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { getScoreColorClass, getScoreBgClass, getScoreFillHex } from '../lib/scoreUtils';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const res = await api.get('/student/dashboard');
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const cr = data?.career_readiness;
  const jobsData = data?.jobs;
  const dsaData = data?.dsa;
  const newsData = data?.hiring_intelligence;

  // Chart data for ATS 5-Pillar breakdown
  const pillarData = cr?.score_breakdown
    ? [
        { name: 'Formatting', score: cr.score_breakdown.formatting },
        { name: 'Keywords', score: cr.score_breakdown.keywords },
        { name: 'Content', score: cr.score_breakdown.content },
        { name: 'Validation', score: cr.score_breakdown.skill_validation },
        { name: 'ATS Compat', score: cr.score_breakdown.ats_compatibility },
      ]
    : [];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-card via-card/80 to-background border border-border shadow-sm"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 uppercase font-bold text-[10px]">
                <Sparkles className="h-3 w-3 mr-1 inline" /> Student Career Intelligence Console
              </Badge>
              <span className="text-xs text-muted-foreground">• Live Career Readiness Sync</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {user?.full_name?.split(' ')[0] || 'Candidate'}!
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Real-time monitoring across your ATS resume diagnostics, verified job opportunities, company-specific DSA preparation, and recruitment intelligence.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <Button
              onClick={() => navigate('/upload-resume')}
              className="rounded-xl gap-2 font-semibold text-xs shadow-md shadow-primary/20 px-4 py-2.5"
            >
              <Upload className="h-4 w-4" /> Scan Resume with ATS
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/skill-analysis')}
              className="rounded-xl gap-2 font-semibold text-xs px-4 py-2.5"
            >
              <Brain className="h-4 w-4 text-primary" /> Skill Gap & Roadmap
            </Button>
          </div>
        </motion.div>

        {/* ========================================================================= */}
        {/* MODULE 1: CAREER READINESS */}
        {/* ========================================================================= */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">Module 1: Career Readiness & Diagnostics</h2>
                <p className="text-xs text-muted-foreground">Deterministic 5-pillar ATS evaluation, JD matching & skill gap roadmap.</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/upload-resume')}
              className="text-xs font-semibold text-primary hover:underline gap-1"
            >
              Open Full Diagnostic <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Overall ATS Score & JD Match Card */}
            <div className="lg:col-span-4 p-6 rounded-3xl border border-border bg-card flex flex-col justify-between shadow-sm space-y-6">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Latest ATS Score
                  </span>
                  <Award className={`h-5 w-5 ${getScoreColorClass(cr?.latest_ats_score)}`} />
                </div>

                <div className="mt-3 flex items-baseline gap-2">
                  <span className={`text-5xl font-black font-mono ${getScoreColorClass(cr?.latest_ats_score)}`}>
                    {cr?.latest_ats_score !== null && cr?.latest_ats_score !== undefined
                      ? `${cr.latest_ats_score}`
                      : 'N/A'}
                  </span>
                  <span className="text-sm font-semibold text-muted-foreground">/ 100</span>
                </div>

                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  {cr?.latest_ats_interpretation ||
                    'Run your first resume scan to evaluate structural compatibility and semantic density.'}
                </p>

                {/* JD Match Percentage */}
                <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-foreground">Target JD Semantic Match</div>
                    <div className="text-[11px] text-muted-foreground">Keyword & qualification coverage</div>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-black font-mono text-primary">
                      {cr?.latest_jd_match !== null && cr?.latest_jd_match !== undefined
                        ? `${cr.latest_jd_match}%`
                        : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* 4-Week Roadmap Progress Meter */}
                <div className="mt-4 pt-4 border-t border-border space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-foreground flex items-center gap-1.5">
                      <GraduationCap className="h-4 w-4 text-primary" /> Roadmap Progress
                    </span>
                    <span className="font-mono font-bold text-primary">
                      {cr?.roadmap_progress?.percentage || 0}%
                    </span>
                  </div>
                  <Progress value={cr?.roadmap_progress?.percentage || 0} className="h-2 rounded-full" />
                  <div className="text-[11px] text-muted-foreground flex justify-between">
                    <span>{cr?.roadmap_progress?.completed_items || 0} items completed</span>
                    <span
                      onClick={() => navigate('/skill-analysis')}
                      className="text-primary hover:underline cursor-pointer font-medium"
                    >
                      View Roadmap
                    </span>
                  </div>
                </div>
              </div>

              {/* Skills to Improve Tags */}
              <div className="pt-2 border-t border-border space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  High-Priority Skills to Improve
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {cr?.skills_to_improve && cr.skills_to_improve.length > 0 ? (
                    cr.skills_to_improve.map((skill, sIdx) => (
                      <span
                        key={sIdx}
                        className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">Scan a job description to extract missing skills.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Middle: 5-Pillar Score Breakdown Chart */}
            <div className="lg:col-span-4 p-6 rounded-3xl border border-border bg-card flex flex-col justify-between shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" /> 5-Pillar ATS Compatibility Breakdown
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Audited across formatting, keyword density, content strength, validation, and ATS parsing.
                </p>

                <div className="h-48 w-full mt-4">
                  {pillarData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={pillarData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="currentColor" className="text-muted-foreground" />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="currentColor" className="text-muted-foreground" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            borderColor: 'hsl(var(--border))',
                            borderRadius: '0.75rem',
                            fontSize: '11px',
                          }}
                        />
                        <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                          {pillarData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getScoreFillHex(entry.score)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                      No score data yet. Run ATS scan to generate chart.
                    </div>
                  )}
                </div>
              </div>

              {/* Career Readiness History */}
              <div className="pt-3 border-t border-border space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Recent Evaluation History
                </span>
                <div className="space-y-1.5">
                  {cr?.history && cr.history.length > 0 ? (
                    cr.history.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        className="p-2 rounded-xl bg-muted/40 flex items-center justify-between text-xs"
                      >
                        <div className="truncate mr-2">
                          <span className="font-semibold text-foreground truncate block">{item.target_role}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(item.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <span className={`font-mono font-bold ${getScoreColorClass(item.overall_score)}`}>
                          {item.overall_score}/100
                        </span>
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">No prior scans recorded.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Recommended Next Actions */}
            <div className="lg:col-span-4 p-6 rounded-3xl border border-border bg-card flex flex-col justify-between shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" /> Recommended Next Actions
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  AI-prioritized steps to maximize interview qualification rates.
                </p>

                <div className="space-y-3 mt-4">
                  {cr?.recommended_actions && cr.recommended_actions.length > 0 ? (
                    cr.recommended_actions.map((action, aIdx) => (
                      <div
                        key={aIdx}
                        className="p-3.5 rounded-2xl border border-border bg-background hover:border-primary/40 transition-all space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-xs text-foreground leading-snug">
                            {action.title}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] uppercase font-bold bg-primary/10 text-primary border border-primary/20 shrink-0">
                            {action.priority}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                          {action.description}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(action.link)}
                          className="w-full rounded-xl text-xs font-semibold py-1 h-8 mt-1 gap-1"
                        >
                          {action.cta} <ArrowRight className="h-3 w-3" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      Upload your resume to receive customized action recommendations.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MODULE 2: JOBS & PIPELINE */}
        {/* ========================================================================= */}
        <div className="space-y-4 pt-4 border-t border-border/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">Module 2: Job Opportunities & Applications</h2>
                <p className="text-xs text-muted-foreground">Opportunities matched against your verified ATS credentials.</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/jobs')}
              className="text-xs font-semibold text-primary hover:underline gap-1"
            >
              Browse All Jobs ({jobsData?.total_active_jobs || 0}) <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Quick Metrics Bar for Jobs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl border border-border bg-card">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Total Active Jobs
              </span>
              <div className="text-2xl font-black font-mono text-foreground mt-1">
                {jobsData?.total_active_jobs || 0}
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-border bg-card">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Eligible Opportunities
              </span>
              <div className="text-2xl font-black font-mono text-emerald-500 mt-1">
                {jobsData?.eligible_jobs_count || 0}
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-border bg-card">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Applications Submitted
              </span>
              <div className="text-2xl font-black font-mono text-primary mt-1">
                {jobsData?.application_count || 0}
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-border bg-card">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                In Review / Shortlisted
              </span>
              <div className="text-2xl font-black font-mono text-amber-500 mt-1">
                {(jobsData?.status_overview?.reviewing || 0) + (jobsData?.status_overview?.shortlisted || 0)}
              </div>
            </div>
          </div>

          {/* Recommended Jobs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {jobsData?.recommended_jobs && jobsData.recommended_jobs.length > 0 ? (
              jobsData.recommended_jobs.map((job) => (
                <div
                  key={job.id}
                  onClick={() => navigate('/jobs')}
                  className="p-5 rounded-2xl border border-border bg-card hover:border-primary/50 transition-all cursor-pointer flex flex-col justify-between shadow-sm group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold text-muted-foreground truncate">
                        {job.company_name}
                      </span>
                      {job.is_eligible ? (
                        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] uppercase font-bold">
                          Eligible
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] uppercase text-muted-foreground">
                          Min ATS: {job.min_ats_score}
                        </Badge>
                      )}
                    </div>

                    <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {job.title}
                    </h4>

                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>{job.location}</span>
                      <span>•</span>
                      <span>{job.job_type}</span>
                    </div>

                    <div className="flex flex-wrap gap-1 pt-1">
                      {job.required_skills?.slice(0, 3).map((sk, idx) => (
                        <span key={idx} className="px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground">
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-primary font-semibold">
                    <span>Apply Now</span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-4 p-8 text-center text-xs text-muted-foreground rounded-2xl border border-border bg-card">
                No active jobs published yet. Check back shortly.
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MODULE 3: DSA TRACKER */}
        {/* ========================================================================= */}
        <div className="space-y-4 pt-4 border-t border-border/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Code2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">Module 3: Company-Specific DSA Tracker</h2>
                <p className="text-xs text-muted-foreground">Target company interview question master bank (3,310+ LeetCode problems).</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dsa-tracker')}
              className="text-xs font-semibold text-primary hover:underline gap-1"
            >
              Open Full Tracker <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Overall Progress Overview */}
            <div className="lg:col-span-5 p-6 rounded-3xl border border-border bg-card space-y-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Master Bank Solved
                  </span>
                  <div className="text-3xl font-black font-mono text-foreground mt-1">
                    {dsaData?.solved_questions || 0}{' '}
                    <span className="text-sm font-normal text-muted-foreground">
                      / {dsaData?.total_questions || 3310}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black font-mono text-primary">
                    {dsaData?.completion_rate || 0}%
                  </span>
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">Complete</div>
                </div>
              </div>

              <Progress value={dsaData?.completion_rate || 0} className="h-2 rounded-full" />

              {/* Difficulty Breakdown */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <div className="text-xs font-bold text-emerald-500">Easy</div>
                  <div className="text-lg font-black font-mono text-foreground mt-0.5">
                    {dsaData?.difficulty_breakdown?.easy || 0}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                  <div className="text-xs font-bold text-amber-500">Medium</div>
                  <div className="text-lg font-black font-mono text-foreground mt-0.5">
                    {dsaData?.difficulty_breakdown?.medium || 0}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
                  <div className="text-xs font-bold text-rose-500">Hard</div>
                  <div className="text-lg font-black font-mono text-foreground mt-0.5">
                    {dsaData?.difficulty_breakdown?.hard || 0}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Company-Specific Preparation Quick-Launch */}
            <div className="lg:col-span-7 p-6 rounded-3xl border border-border bg-card space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-foreground">Target Company Quick Practice</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Questions categorized with authentic interview frequency tags.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {dsaData?.top_companies?.map((comp) => (
                  <button
                    key={comp.slug}
                    onClick={() => navigate('/dsa-tracker', { state: { company: comp.name } })}
                    className="p-3.5 rounded-2xl border border-border bg-background hover:border-primary/50 hover:bg-muted/50 transition-all text-left flex items-center justify-between group"
                  >
                    <div>
                      <div className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">
                        {comp.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Practice Bank</div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MODULE 4: HIRING INTELLIGENCE */}
        {/* ========================================================================= */}
        <div className="space-y-4 pt-4 border-t border-border/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Newspaper className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">Module 4: Tech Hiring Intelligence Magazine</h2>
                <p className="text-xs text-muted-foreground">Recruitment drives, compensation updates, and workforce trends.</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/news')}
              className="text-xs font-semibold text-primary hover:underline gap-1"
            >
              Read Full Magazine <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {newsData?.recent_articles && newsData.recent_articles.length > 0 ? (
              newsData.recent_articles.map((article, aIdx) => (
                <div
                  key={aIdx}
                  onClick={() => navigate('/news')}
                  className="rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/50 transition-all cursor-pointer flex flex-col justify-between shadow-sm group"
                >
                  <div>
                    {article.image && (
                      <div className="h-36 bg-muted overflow-hidden">
                        <img
                          src={article.image}
                          alt={article.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <div className="p-4 space-y-2">
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span className="font-semibold text-foreground">{article.source || 'Tech Wire'}</span>
                        <span>•</span>
                        <span>{article.category || 'Recruitment'}</span>
                      </div>
                      <h4 className="font-bold text-xs text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                        {article.title}
                      </h4>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                        {article.description}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 pt-2 border-t border-border/40 flex items-center justify-between text-xs text-primary font-semibold">
                    <span>Read Analysis</span>
                    <ArrowRight className="h-3 w-3" />
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-3 p-8 text-center text-xs text-muted-foreground rounded-2xl border border-border bg-card">
                Loading live recruitment intelligence feed...
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
