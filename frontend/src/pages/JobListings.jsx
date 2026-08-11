import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
  Loader2,
  X,
  Building,
} from 'lucide-react';

export default function JobListings() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [applying, setApplying] = useState(false);
  const [appliedJobs, setAppliedJobs] = useState(new Set());

  useEffect(() => {
    fetchJobs();
    fetchAppliedJobs();
  }, []);

  const fetchJobs = async (query = '') => {
    setLoading(true);
    try {
      const res = await api.get('/jobs', {
        params: query ? { query } : {},
      });
      setJobs(res.data || []);
    } catch (err) {
      console.error('Failed to load jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAppliedJobs = async () => {
    try {
      const res = await api.get('/student/applications');
      const appliedSet = new Set((res.data || []).map((a) => a.job_id));
      setAppliedJobs(appliedSet);
    } catch (err) {
      console.error('Failed to load applied status:', err);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchJobs(searchQuery);
  };

  const handleApply = async () => {
    if (!selectedJob) return;
    setApplying(true);
    try {
      const res = await api.post(`/jobs/${selectedJob.id}/apply`, {
        cover_letter: coverLetter.trim() || undefined,
      });
      toast.success(`Application submitted! ATS Score: ${res.data.ats_score}, Match: ${res.data.match_percentage}%`);
      setAppliedJobs(new Set([...appliedJobs, selectedJob.id]));
      setSelectedJob(null);
      setCoverLetter('');
    } catch (err) {
      const detail = err.response?.data?.detail || 'Application failed. Make sure you have uploaded a resume.';
      toast.error(detail);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold tracking-tight">Verified Tech Opportunities</h1>
          <p className="text-muted-foreground mt-1">
            Apply with your substantiated resume profile and verified ATS evaluation score.
          </p>
        </motion.div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-3 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by role, company, or skill (e.g., React, Python, Google)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background/50"
            />
          </div>
          <Button type="submit">Search</Button>
        </form>

        {/* Job Cards Grid */}
        {loading ? (
          <div className="py-16 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground mt-2">Loading open positions...</p>
          </div>
        ) : jobs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map((job) => {
              const isApplied = appliedJobs.has(job.id);
              return (
                <motion.div
                  key={job.id}
                  whileHover={{ y: -3 }}
                  className="p-6 rounded-2xl border border-border bg-card flex flex-col justify-between shadow-sm hover:border-primary/50 transition-all"
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                          {job.company_name}
                        </span>
                        <h3 className="text-lg font-bold text-foreground mt-1">{job.title}</h3>
                      </div>
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-muted text-foreground">
                        {job.job_type}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground my-3">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" /> {job.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> {job.experience_level}
                      </span>
                      {job.salary_range && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3.5 w-3.5" /> {job.salary_range}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-3 mb-4">
                      {job.description}
                    </p>

                    <div className="flex flex-wrap gap-1.5 mb-6">
                      {job.required_skills?.slice(0, 4).map((s, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-medium"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Award className="h-3.5 w-3.5 text-primary" /> Min ATS: {job.min_ats_score}
                    </div>
                    {isApplied ? (
                      <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" /> Applied
                      </span>
                    ) : (
                      <Button size="sm" onClick={() => setSelectedJob(job)}>
                        View & Apply
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 p-8 rounded-2xl border border-border bg-card">
            <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-lg font-bold text-foreground">No matching job listings found</h3>
            <p className="text-xs text-muted-foreground mt-1">Try broadening your search query or check back soon.</p>
          </div>
        )}

        {/* Application Modal */}
        {selectedJob && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-card border border-border rounded-2xl p-6 sm:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-5"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs uppercase font-semibold text-primary">{selectedJob.company_name}</span>
                  <h2 className="text-xl font-bold text-foreground mt-0.5">{selectedJob.title}</h2>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedJob(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="text-xs text-muted-foreground space-y-2">
                <div className="flex gap-4">
                  <span><strong>Location:</strong> {selectedJob.location}</span>
                  <span><strong>Experience:</strong> {selectedJob.experience_level}</span>
                </div>
                <div><strong>Description:</strong></div>
                <p className="whitespace-pre-wrap leading-relaxed">{selectedJob.description}</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="modal-cover-letter">Cover Note (Optional)</Label>
                <Textarea
                  id="modal-cover-letter"
                  rows={3}
                  placeholder="Introduce yourself to the hiring team..."
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  className="bg-background/50 text-xs resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setSelectedJob(null)}>
                  Cancel
                </Button>
                <Button onClick={handleApply} disabled={applying} className="gap-2">
                  {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Submit Application
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
}
