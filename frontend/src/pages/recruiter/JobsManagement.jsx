import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../../lib/api';
import Navbar from '../../components/common/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Briefcase,
  Plus,
  Users,
  Award,
  X,
  Loader2,
  CheckCircle2,
  Building,
} from 'lucide-react';

export default function JobsManagement() {
  const [jobs, setJobs] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [companyId, setCompanyId] = useState('');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('Remote');
  const [jobType, setJobType] = useState('Full-time');
  const [experienceLevel, setExperienceLevel] = useState('Mid');
  const [salaryRange, setSalaryRange] = useState('$120k - $160k');
  const [description, setDescription] = useState('');
  const [skillsStr, setSkillsStr] = useState('React, FastAPI, PostgreSQL, Docker');
  const [minAts, setMinAts] = useState('65');

  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [jobsRes, compRes] = await Promise.all([
        api.get('/recruiter/jobs'),
        api.get('/recruiter/companies'),
      ]);
      setJobs(jobsRes.data || []);
      setCompanies(compRes.data || []);
      if (compRes.data?.length > 0) {
        setCompanyId(compRes.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load jobs data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateJob = async (e) => {
    e.preventDefault();
    if (!title || !description) {
      toast.error('Please fill in title and description.');
      return;
    }

    setSubmitting(true);
    try {
      let activeCompanyId = companyId;

      // Create company on-the-fly if needed
      if (!activeCompanyId && newCompanyName) {
        const compRes = await api.post('/recruiter/companies', { name: newCompanyName });
        activeCompanyId = compRes.data.id;
      } else if (!activeCompanyId && companies.length === 0) {
        const compRes = await api.post('/recruiter/companies', { name: 'My Tech Organization' });
        activeCompanyId = compRes.data.id;
      }

      const skillsList = skillsStr.split(',').map((s) => s.trim()).filter(Boolean);

      await api.post('/recruiter/jobs', {
        title: title.trim(),
        company_id: activeCompanyId,
        location,
        job_type: jobType,
        experience_level: experienceLevel,
        salary_range: salaryRange,
        description: description.trim(),
        required_skills: skillsList,
        min_ats_score: parseFloat(minAts) || 60.0,
      });

      toast.success('Job posting created successfully!');
      setShowModal(false);
      setTitle('');
      setDescription('');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create job posting.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Job Postings Management</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configure job parameters, required competencies, and minimum ATS screening thresholds.
            </p>
          </div>
          <Button onClick={() => setShowModal(true)} className="gap-2 shadow-md shadow-primary/20">
            <Plus className="h-4 w-4" /> Post New Job
          </Button>
        </div>

        {/* Jobs List */}
        {loading ? (
          <div className="py-16 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-xs text-muted-foreground mt-2">Loading posted jobs...</p>
          </div>
        ) : jobs.length > 0 ? (
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
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-foreground">
                      {job.job_type}
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

                  <div className="flex flex-wrap gap-1 mb-4">
                    {job.required_skills?.slice(0, 3).map((s, idx) => (
                      <span key={idx} className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={() => navigate(`/recruiter/jobs/${job.id}/candidates`)}
                  className="w-full gap-2 rounded-xl text-xs"
                >
                  <Users className="h-3.5 w-3.5" /> View Candidate Pipeline ({job.applicant_count})
                </Button>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 p-8 rounded-2xl border border-border bg-card">
            <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-lg font-bold text-foreground">No active job vacancies</h3>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              Click the button below to post your first engineering position.
            </p>
            <Button onClick={() => setShowModal(true)}>
              <Plus className="h-4 w-4 mr-1.5" /> Post a Job
            </Button>
          </div>
        )}

        {/* Job Creator Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-card border border-border rounded-2xl p-6 sm:p-8 max-w-xl w-full max-h-[90vh] overflow-y-auto space-y-5 shadow-2xl"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-foreground">Create Job Vacancy</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <form onSubmit={handleCreateJob} className="space-y-4">
                {companies.length > 0 ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="comp-select">Company Profile</Label>
                    <select
                      id="comp-select"
                      value={companyId}
                      onChange={(e) => setCompanyId(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-border bg-background text-sm"
                    >
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label htmlFor="new-comp">Company / Organization Name</Label>
                    <Input
                      id="new-comp"
                      placeholder="e.g., Stripe, Uber, Scale AI"
                      value={newCompanyName}
                      onChange={(e) => setNewCompanyName(e.target.value)}
                      required
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="job-title">Job Title</Label>
                  <Input
                    id="job-title"
                    placeholder="e.g., Senior Full-Stack Engineer"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="job-loc">Location</Label>
                    <Input
                      id="job-loc"
                      placeholder="e.g., Remote, Bengaluru, San Francisco"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="job-type">Type</Label>
                    <select
                      id="job-type"
                      value={jobType}
                      onChange={(e) => setJobType(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-border bg-background text-sm"
                    >
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Contract">Contract</option>
                      <option value="Internship">Internship</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="job-exp">Seniority Level</Label>
                    <select
                      id="job-exp"
                      value={experienceLevel}
                      onChange={(e) => setExperienceLevel(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-border bg-background text-sm"
                    >
                      <option value="Entry">Entry Level</option>
                      <option value="Mid">Mid Level</option>
                      <option value="Senior">Senior Level</option>
                      <option value="Lead">Lead / Architect</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="min-ats">Min ATS Threshold</Label>
                    <Input
                      id="min-ats"
                      type="number"
                      min="0"
                      max="100"
                      value={minAts}
                      onChange={(e) => setMinAts(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="job-skills">Required Competencies (Comma-separated)</Label>
                  <Input
                    id="job-skills"
                    placeholder="Python, FastAPI, React, PostgreSQL, Docker"
                    value={skillsStr}
                    onChange={(e) => setSkillsStr(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="job-desc">Job Description</Label>
                  <Textarea
                    id="job-desc"
                    rows={4}
                    placeholder="Describe role responsibilities, tech stack, and ideal candidate profile..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="resize-none text-xs"
                    required
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <Button variant="outline" type="button" onClick={() => setShowModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                    Publish Job Listing
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
}
