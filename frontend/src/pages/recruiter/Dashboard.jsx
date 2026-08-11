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
  TrendingUp,
  Plus,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
} from 'lucide-react';

export default function RecruiterDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRecruiterData();
  }, []);

  const fetchRecruiterData = async () => {
    try {
      const [dashRes, jobsRes] = await Promise.all([
        api.get('/recruiter/dashboard'),
        api.get('/recruiter/jobs'),
      ]);
      setMetrics(dashRes.data);
      setJobs(jobsRes.data || []);
    } catch (err) {
      console.error('Failed to load recruiter data:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-blue-500/10 via-primary/5 to-background border border-blue-500/15"
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Recruitment Intelligence Console</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Screen, rank, and evaluate applicants using deterministic ATS verification and AI candidate insights.
            </p>
          </div>
          <Button onClick={() => navigate('/recruiter/jobs')} className="gap-2 shadow-md shadow-primary/20">
            <Plus className="h-4 w-4" /> Create New Job Listing
          </Button>
        </motion.div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="p-6 rounded-2xl border border-border bg-card flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs uppercase font-semibold text-muted-foreground">Total Postings</span>
                <div className="text-3xl font-black font-mono mt-1">{metrics?.total_jobs ?? 0}</div>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
                <Briefcase className="h-5 w-5" />
              </div>
            </div>
            <span className="text-xs text-muted-foreground mt-3">{metrics?.active_jobs ?? 0} active openings</span>
          </div>

          <div className="p-6 rounded-2xl border border-border bg-card flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs uppercase font-semibold text-muted-foreground">Candidate Pipeline</span>
                <div className="text-3xl font-black font-mono mt-1 text-primary">{metrics?.total_candidates ?? 0}</div>
              </div>
              <div className="p-3 rounded-xl bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <span className="text-xs text-muted-foreground mt-3">Verified candidate submissions</span>
          </div>

          <div className="p-6 rounded-2xl border border-border bg-card flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs uppercase font-semibold text-muted-foreground">Average ATS Score</span>
                <div className="text-3xl font-black font-mono mt-1 text-emerald-500">
                  {metrics?.average_candidate_ats_score ?? 0}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500">
                <Award className="h-5 w-5" />
              </div>
            </div>
            <span className="text-xs text-muted-foreground mt-3">Across all applicants</span>
          </div>

          <div className="p-6 rounded-2xl border border-border bg-card flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs uppercase font-semibold text-muted-foreground">Shortlisted</span>
                <div className="text-3xl font-black font-mono mt-1 text-purple-500">
                  {metrics?.status_distribution?.shortlisted ?? 0}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-purple-500/10 text-purple-500">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
            <span className="text-xs text-muted-foreground mt-3">Candidates advanced to interview</span>
          </div>
        </div>

        {/* Active Jobs & Candidate Pipelines */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold tracking-tight">Active Job Openings & Pipelines</h2>
            <Button variant="outline" size="sm" onClick={() => navigate('/recruiter/jobs')}>
              Manage All Jobs
            </Button>
          </div>

          {jobs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.map((job) => (
                <motion.div
                  key={job.id}
                  whileHover={{ y: -3 }}
                  className="p-6 rounded-2xl border border-border bg-card flex flex-col justify-between shadow-sm"
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="text-xs uppercase font-semibold text-primary">{job.company_name}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          job.is_active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {job.is_active ? 'Active' : 'Archived'}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-foreground mt-1">{job.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {job.location} • {job.experience_level}
                    </p>

                    <div className="flex items-center gap-4 my-4 p-3 rounded-xl bg-muted/50 text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase">Applicants</span>
                        <strong className="text-base font-mono text-foreground">{job.applicant_count}</strong>
                      </div>
                      <div className="border-l border-border pl-4">
                        <span className="text-muted-foreground block text-[10px] uppercase">Min ATS</span>
                        <strong className="text-base font-mono text-primary">{job.min_ats_score}</strong>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={() => navigate(`/recruiter/jobs/${job.id}/candidates`)}
                    className="w-full gap-2 rounded-xl text-xs"
                  >
                    View & Rank Candidates <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 p-8 rounded-2xl border border-border bg-card">
              <Briefcase className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <h3 className="text-base font-bold text-foreground">No job postings created yet</h3>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                Post your first opening to begin receiving verified candidate submissions.
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
