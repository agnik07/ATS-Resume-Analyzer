import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/common/Navbar';
import { Button } from '@/components/ui/button';
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
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const res = await api.get('/student/dashboard');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (!score) return 'text-muted-foreground';
    if (score >= 85) return 'text-emerald-500';
    if (score >= 70) return 'text-blue-500';
    if (score >= 55) return 'text-amber-500';
    return 'text-rose-500';
  };

  const getScoreBg = (score) => {
    if (!score) return 'bg-muted';
    if (score >= 85) return 'bg-emerald-500/10 border-emerald-500/20';
    if (score >= 70) return 'bg-blue-500/10 border-blue-500/20';
    if (score >= 55) return 'bg-amber-500/10 border-amber-500/20';
    return 'bg-rose-500/10 border-rose-500/20';
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-primary/10 via-blue-500/5 to-background border border-primary/15"
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome back, {user?.full_name?.split(' ')[0] || 'Developer'}! 👋
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Here is your centralized AI recruitment & career intelligence overview.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => navigate('/upload-resume')} className="gap-2 shadow-md shadow-primary/20">
              <Upload className="h-4 w-4" /> Scan Resume with ATS
            </Button>
            <Button variant="outline" onClick={() => navigate('/skill-analysis')} className="gap-2">
              <Brain className="h-4 w-4" /> Analyze Skill Gap
            </Button>
          </div>
        </motion.div>

        {/* Quick Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* ATS Score Card */}
          <motion.div
            whileHover={{ y: -3 }}
            className={`p-6 rounded-2xl border ${getScoreBg(stats?.latest_ats_score)} flex flex-col justify-between`}
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Latest ATS Score
                </span>
                <div className={`text-4xl font-black mt-2 font-mono ${getScoreColor(stats?.latest_ats_score)}`}>
                  {stats?.latest_ats_score !== null && stats?.latest_ats_score !== undefined
                    ? `${stats.latest_ats_score}/100`
                    : 'N/A'}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-background/80 shadow-sm">
                <Award className={`h-6 w-6 ${getScoreColor(stats?.latest_ats_score)}`} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4 line-clamp-2">
              {stats?.latest_ats_interpretation || 'Upload your resume to receive deterministic 5-pillar ATS scoring.'}
            </p>
          </motion.div>

          {/* Resumes Parsed Card */}
          <motion.div
            whileHover={{ y: -3 }}
            className="p-6 rounded-2xl border border-border bg-card/60 backdrop-blur-sm flex flex-col justify-between"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Resumes Analyzed
                </span>
                <div className="text-4xl font-black mt-2 font-mono text-foreground">
                  {stats?.total_resumes ?? 0}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-primary/10 text-primary">
                <FileText className="h-6 w-6" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Structural entity extraction & semantic skill profiling active.
            </p>
          </motion.div>

          {/* Job Applications Card */}
          <motion.div
            whileHover={{ y: -3 }}
            className="p-6 rounded-2xl border border-border bg-card/60 backdrop-blur-sm flex flex-col justify-between"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Job Applications
                </span>
                <div className="text-4xl font-black mt-2 font-mono text-foreground">
                  {stats?.total_applications ?? 0}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
                <Briefcase className="h-6 w-6" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Applications linked with candidate ATS verification.
            </p>
          </motion.div>

          {/* Skill Gaps Card */}
          <motion.div
            whileHover={{ y: -3 }}
            className="p-6 rounded-2xl border border-border bg-card/60 backdrop-blur-sm flex flex-col justify-between"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Skill Benchmark
                </span>
                <div className="text-4xl font-black mt-2 font-mono text-purple-500">
                  {stats?.recent_skill_gaps?.length ?? 0}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-purple-500/10 text-purple-500">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Roles compared against FAANG & top product company benchmarks.
            </p>
          </motion.div>
        </div>

        {/* Feature Navigation Grid */}
        <div>
          <h2 className="text-xl font-bold tracking-tight mb-4">Core Intelligence Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* ATS Resume Scorer */}
            <motion.div
              whileHover={{ scale: 1.01 }}
              onClick={() => navigate('/upload-resume')}
              className="p-6 rounded-2xl border border-border bg-card hover:border-primary/50 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                  <FileText className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground">ATS Resume Scorer</h3>
                <p className="text-sm text-muted-foreground mt-1.5">
                  Get a comprehensive 5-pillar breakdown: Formatting, Keywords, Content Quality, Skill Validation, and System Compatibility.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-primary mt-6">
                Scan Resume <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>

            {/* Skill Gap Analysis */}
            <motion.div
              whileHover={{ scale: 1.01 }}
              onClick={() => navigate('/skill-analysis')}
              className="p-6 rounded-2xl border border-border bg-card hover:border-blue-500/50 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-4 group-hover:bg-blue-500 group-hover:text-white transition-all">
                  <Brain className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Skill Gap Engine</h3>
                <p className="text-sm text-muted-foreground mt-1.5">
                  Benchmark your profile against target roles at Google, Amazon, Microsoft, and Meta. Get a tailored 4-week learning roadmap.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-blue-500 mt-6">
                Compare Skills <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>

            {/* Job Opportunities */}
            <motion.div
              whileHover={{ scale: 1.01 }}
              onClick={() => navigate('/jobs')}
              className="p-6 rounded-2xl border border-border bg-card hover:border-emerald-500/50 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="h-12 w-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                  <Briefcase className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Verified Job Board</h3>
                <p className="text-sm text-muted-foreground mt-1.5">
                  Browse open positions posted by verified recruiters. Instant one-click application with verified ATS score submission.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-emerald-500 mt-6">
                Explore Jobs <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>

            {/* Company DSA Tracker */}
            <motion.div
              whileHover={{ scale: 1.01 }}
              onClick={() => navigate('/dsa-tracker')}
              className="p-6 rounded-2xl border border-border bg-card hover:border-amber-500/50 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="h-12 w-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4 group-hover:bg-amber-500 group-hover:text-white transition-all">
                  <Code2 className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Company DSA Tracker</h3>
                <p className="text-sm text-muted-foreground mt-1.5">
                  Master company-specific LeetCode problems curated for Amazon, Google, Microsoft, and Meta coding rounds.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-amber-500 mt-6">
                Start Practicing <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>

            {/* Career Psychometric Test */}
            <motion.div
              whileHover={{ scale: 1.01 }}
              onClick={() => navigate('/career-test')}
              className="p-6 rounded-2xl border border-border bg-card hover:border-purple-500/50 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="h-12 w-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center mb-4 group-hover:bg-purple-500 group-hover:text-white transition-all">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Career Path Test</h3>
                <p className="text-sm text-muted-foreground mt-1.5">
                  Discover whether your analytical thinking and coding style best fits Backend, AI/ML, Frontend, or Technical Product Management.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-purple-500 mt-6">
                Take Assessment <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>

            {/* Hiring Market News */}
            <motion.div
              whileHover={{ scale: 1.01 }}
              onClick={() => navigate('/news')}
              className="p-6 rounded-2xl border border-border bg-card hover:border-indigo-500/50 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="h-12 w-12 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-4 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                  <Newspaper className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Tech Hiring News</h3>
                <p className="text-sm text-muted-foreground mt-1.5">
                  Stay updated with live tech recruitment trends, funding announcements, and in-demand skills in the market.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-indigo-500 mt-6">
                Read Updates <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>
          </div>
        </div>

        {/* Recent Applications & Skill Gaps */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Applications */}
          <div className="p-6 rounded-2xl border border-border bg-card">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-foreground">Recent Job Applications</h3>
              <Button variant="ghost" size="sm" onClick={() => navigate('/jobs')}>
                View Jobs
              </Button>
            </div>
            {stats?.applications?.length > 0 ? (
              <div className="space-y-3">
                {stats.applications.map((app) => (
                  <div
                    key={app.id}
                    className="p-4 rounded-xl border border-border bg-background/50 flex justify-between items-center"
                  >
                    <div>
                      <div className="font-semibold text-sm">Application #{app.id.slice(-6)}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                        <span>ATS Score: {app.ats_score}</span>
                        <span>•</span>
                        <span>Match: {app.match_percentage}%</span>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase ${
                        app.status === 'shortlisted' || app.status === 'offered'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : app.status === 'rejected'
                          ? 'bg-rose-500/10 text-rose-500'
                          : 'bg-blue-500/10 text-blue-500'
                      }`}
                    >
                      {app.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No applications submitted yet. Browse the job board to apply!
              </div>
            )}
          </div>

          {/* Recent Skill Gaps */}
          <div className="p-6 rounded-2xl border border-border bg-card">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-foreground">Recent Skill Gap Reports</h3>
              <Button variant="ghost" size="sm" onClick={() => navigate('/skill-analysis')}>
                New Analysis
              </Button>
            </div>
            {stats?.recent_skill_gaps?.length > 0 ? (
              <div className="space-y-3">
                {stats.recent_skill_gaps.map((gap) => (
                  <div
                    key={gap.id}
                    className="p-4 rounded-xl border border-border bg-background/50 flex justify-between items-center"
                  >
                    <div>
                      <div className="font-semibold text-sm">
                        {gap.company} — {gap.role}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(gap.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-bold font-mono text-primary">
                        {gap.match_percentage}%
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase">Match</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No skill gap analyses run yet. Try comparing against Google or Amazon!
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
