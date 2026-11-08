import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../../lib/api';
import Navbar from '../../components/common/Navbar';
import { Button } from '@/components/ui/button';
import {
  Briefcase,
  Users,
  Award,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingUp,
  XCircle,
  Gift,
  Plus,
  Layers,
  ChevronRight,
  BarChart3,
  Calendar,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { getScoreColorClass, getScoreBgClass } from '../../lib/scoreUtils';

export default function RecruiterDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await api.get('/recruiter/dashboard');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load recruiter dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const meetingPct = stats?.total_applications > 0
    ? Math.round((stats.meeting_threshold_candidates / stats.total_applications) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-8 rounded-2xl bg-card border border-border shadow-sm"
        >
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                Phase 4 Console
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-500" /> Deterministic Recruiter Intelligence
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Candidate Intelligence Console</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Screen, rank, and evaluate applicants against verified ATS thresholds without manually reading every resume.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => navigate('/recruiter/jobs')} className="gap-2 shadow-sm">
              <Plus className="h-4 w-4" /> Post New Vacancy
            </Button>
          </div>
        </motion.div>

        {/* 1. Recruiter KPI Overview Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* Active Jobs */}
          <div className="p-5 sm:p-6 rounded-2xl border border-border bg-card flex flex-col justify-between shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active Postings</span>
                <div className="text-3xl font-black font-mono mt-1 text-foreground">
                  {stats?.active_jobs ?? 0}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <Briefcase className="h-5 w-5" />
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-3 flex items-center justify-between">
              <span>{stats?.total_jobs ?? 0} total listings</span>
              <span className="text-[10px] text-primary font-medium hover:underline cursor-pointer" onClick={() => navigate('/recruiter/jobs')}>
                Manage &rarr;
              </span>
            </div>
          </div>

          {/* Total Applications */}
          <div className="p-5 sm:p-6 rounded-2xl border border-border bg-card flex flex-col justify-between shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Applications</span>
                <div className="text-3xl font-black font-mono mt-1 text-primary">
                  {stats?.total_applications ?? 0}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <span className="text-xs text-muted-foreground mt-3">Verified candidate submissions</span>
          </div>

          {/* Meeting ATS Threshold */}
          <div className="p-5 sm:p-6 rounded-2xl border border-border bg-card flex flex-col justify-between shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Meeting ATS Threshold</span>
                <div className="text-3xl font-black font-mono mt-1 text-emerald-500">
                  {stats?.meeting_threshold_candidates ?? 0}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-3 flex items-center justify-between">
              <span>Pass rate: <strong className="text-emerald-500">{meetingPct}%</strong></span>
              <span className="text-[10px] text-muted-foreground">ATS &ge; Job Min</span>
            </div>
          </div>

          {/* Average ATS Score */}
          <div className="p-5 sm:p-6 rounded-2xl border border-border bg-card flex flex-col justify-between shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Avg ATS Score</span>
                <div className={`text-3xl font-black font-mono mt-1 ${getScoreColorClass(stats?.avg_ats_score || 0)}`}>
                  {stats?.avg_ats_score ?? 0}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
                <Award className="h-5 w-5" />
              </div>
            </div>
            <span className="text-xs text-muted-foreground mt-3">Across applicant pool</span>
          </div>
        </div>

        {/* Pipeline Breakdown: Reviewing, Shortlisted, Rejected, Offered */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-border bg-card flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Under Review</span>
                <div className="text-xl font-bold font-mono">{stats?.reviewing_candidates ?? 0}</div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Shortlisted</span>
                <div className="text-xl font-bold font-mono text-purple-500">{stats?.shortlisted_candidates ?? 0}</div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                <Gift className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Offered</span>
                <div className="text-xl font-bold font-mono text-emerald-500">{stats?.offered_candidates ?? 0}</div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500">
                <XCircle className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Rejected</span>
                <div className="text-xl font-bold font-mono text-muted-foreground">{stats?.rejected_candidates ?? 0}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Application Trends Chart (Recharts) */}
        {stats?.application_trends?.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-6 rounded-2xl border border-border bg-card space-y-4 shadow-sm"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold tracking-tight">Application & Eligibility Trends</h3>
              </div>
              <span className="text-xs text-muted-foreground">Daily candidate volume vs threshold compliance</span>
            </div>

            <div className="h-64 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.application_trends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorThresh" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '0.75rem',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="applications"
                    name="Total Applications"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorApps)"
                  />
                  <Area
                    type="monotone"
                    dataKey="meeting_threshold"
                    name="Meeting Threshold"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorThresh)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {/* Job-wise Analytics and Pipelines */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Job-wise Analytics & Candidate Pipelines</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                ATS threshold compliance and candidate volumes per active opening.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/recruiter/jobs')}>
              Manage All Jobs
            </Button>
          </div>

          {stats?.job_analytics?.length > 0 ? (
            <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="p-4 font-semibold">Job Title</th>
                      <th className="p-4 font-semibold">Company</th>
                      <th className="p-4 font-semibold">Min ATS Threshold</th>
                      <th className="p-4 font-semibold">Total Applicants</th>
                      <th className="p-4 font-semibold">Meeting Threshold</th>
                      <th className="p-4 font-semibold">Shortlisted</th>
                      <th className="p-4 font-semibold">Avg ATS Score</th>
                      <th className="p-4 font-semibold text-right">Pipeline Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {stats.job_analytics.map((job) => {
                      const passRate = job.total_applications > 0
                        ? Math.round((job.meeting_threshold / job.total_applications) * 100)
                        : 0;

                      return (
                        <tr key={job.job_id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-4">
                            <div className="font-bold text-foreground">{job.title}</div>
                            <span
                              className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${
                                job.is_active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {job.is_active ? 'Active' : 'Closed'}
                            </span>
                          </td>
                          <td className="p-4 text-xs font-medium text-muted-foreground">
                            {job.company_name}
                          </td>
                          <td className="p-4 font-mono font-bold text-primary">
                            {job.min_ats_score}/100
                          </td>
                          <td className="p-4 font-mono font-bold">
                            {job.total_applications}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-emerald-500">
                                {job.meeting_threshold}
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                ({passRate}%)
                              </span>
                            </div>
                          </td>
                          <td className="p-4 font-mono font-bold text-purple-500">
                            {job.shortlisted_count}
                          </td>
                          <td className="p-4 font-mono font-bold">
                            <span className={getScoreColorClass(job.avg_ats_score)}>
                              {job.avg_ats_score}/100
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <Button
                              size="sm"
                              onClick={() => navigate(`/recruiter/jobs/${job.job_id}/candidates`)}
                              className="gap-1.5 text-xs shadow-sm"
                            >
                              View Pipeline <ArrowRight className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 p-8 rounded-2xl border border-border bg-card">
              <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="text-base font-bold text-foreground">No active job postings found</h3>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                Post your first opening to start collecting verified candidate submissions.
              </p>
              <Button onClick={() => navigate('/recruiter/jobs')} size="sm">
                <Plus className="h-4 w-4 mr-1.5" /> Post a Job
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
