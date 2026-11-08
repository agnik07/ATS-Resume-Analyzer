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
  ShieldCheck,
  Calendar,
  Lock,
  Unlock,
  AlertTriangle,
  RefreshCw,
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
  const [responsibilitiesStr, setResponsibilitiesStr] = useState('');
  const [qualificationsStr, setQualificationsStr] = useState('');
  const [skillsStr, setSkillsStr] = useState('React, FastAPI, PostgreSQL, Docker');
  const [minAts, setMinAts] = useState('70');
  const [enforceThreshold, setEnforceThreshold] = useState(true);
  const [discloseThreshold, setDiscloseThreshold] = useState(true);
  const [deadlineStr, setDeadlineStr] = useState('');

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
    if (!title.trim() || !description.trim()) {
      toast.error('Please fill in title and description.');
      return;
    }

    const scoreVal = parseFloat(minAts);
    if (isNaN(scoreVal) || scoreVal < 0 || scoreVal > 100) {
      toast.error('Minimum ATS score threshold must be between 0 and 100.');
      return;
    }

    setSubmitting(true);
    try {
      let activeCompanyId = companyId;

      if (!activeCompanyId && newCompanyName) {
        const compRes = await api.post('/recruiter/companies', { name: newCompanyName.trim() });
        activeCompanyId = compRes.data.id;
      } else if (!activeCompanyId && companies.length === 0) {
        const compRes = await api.post('/recruiter/companies', { name: 'My Tech Organization' });
        activeCompanyId = compRes.data.id;
      }

      const skillsList = skillsStr.split(',').map((s) => s.trim()).filter(Boolean);
      const respList = responsibilitiesStr.split('\n').map((s) => s.trim()).filter(Boolean);
      const qualList = qualificationsStr.split('\n').map((s) => s.trim()).filter(Boolean);

      await api.post('/recruiter/jobs', {
        title: title.trim(),
        company_id: activeCompanyId,
        location: location.trim(),
        job_type: jobType,
        experience_level: experienceLevel,
        salary_range: salaryRange.trim(),
        description: description.trim(),
        responsibilities: respList,
        qualifications: qualList,
        required_skills: skillsList,
        min_ats_score: scoreVal,
        enforce_threshold: enforceThreshold,
        disclose_threshold: discloseThreshold,
        deadline: deadlineStr ? new Date(deadlineStr).toISOString() : undefined,
      });

      toast.success('Job posting created with ATS threshold screening!');
      setShowModal(false);
      setTitle('');
      setDescription('');
      setResponsibilitiesStr('');
      setQualificationsStr('');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create job posting.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleJobStatus = async (job) => {
    const newStatus = job.is_active ? 'closed' : 'active';
    try {
      await api.patch(`/recruiter/jobs/${job.id}`, {
        status: newStatus,
        is_active: !job.is_active,
      });
      toast.success(`Job marked as ${newStatus}.`);
      fetchData();
    } catch (err) {
      toast.error('Failed to update job status.');
    }
  };

  const handleUpdateThresholdPrompt = async (job) => {
    const val = prompt(`Enter new minimum ATS score threshold for "${job.title}" (0-100):`, job.min_ats_score);
    if (val === null) return;
    const num = parseFloat(val);
    if (isNaN(num) || num < 0 || num > 100) {
      toast.error('Threshold must be a valid number between 0 and 100.');
      return;
    }
    try {
      await api.patch(`/recruiter/jobs/${job.id}`, { min_ats_score: num });
      toast.success(`ATS threshold updated to ${num}/100.`);
      fetchData();
    } catch (err) {
      toast.error('Failed to update threshold.');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                Recruiter Portal
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight mt-1">Job Vacancies & ATS Screening</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configure job parameters, required competencies, and minimum ATS eligibility thresholds.
            </p>
          </div>
          <Button onClick={() => setShowModal(true)} className="gap-2 shadow-md shadow-primary/20">
            <Plus className="h-4 w-4" /> Publish New Vacancy
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
                className="p-6 rounded-2xl border border-border bg-card flex flex-col justify-between shadow-sm space-y-4"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-xs uppercase font-bold text-primary">{job.company_name}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        job.is_active
                          ? 'bg-[#0F6E56]/10 text-[#0F6E56] dark:text-[#5DCAA5] border-[#0F6E56]/20'
                          : 'bg-muted text-muted-foreground border-border'
                      }`}
                    >
                      {job.is_active ? 'Active' : 'Closed'}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-foreground mt-1">{job.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {job.location} • {job.experience_level} • {job.job_type}
                  </p>

                  <div className="flex items-center justify-between my-3 p-3 rounded-xl bg-muted/40 border border-border text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-bold">Applicants</span>
                      <strong className="text-base font-mono text-foreground">{job.applicant_count}</strong>
                    </div>
                    <div className="text-right">
                      <span className="text-muted-foreground block text-[10px] uppercase font-bold">Min ATS Threshold</span>
                      <button
                        onClick={() => handleUpdateThresholdPrompt(job)}
                        className="text-base font-mono font-bold text-primary hover:underline"
                        title="Click to edit threshold"
                      >
                        {job.min_ats_score}/100 ✎
                      </button>
                    </div>
                  </div>

                  {job.deadline && (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 mb-2">
                      <Calendar className="h-3 w-3" /> Deadline: {new Date(job.deadline).toLocaleDateString()}
                    </p>
                  )}

                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {job.description}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border text-xs">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/recruiter/candidates?job_id=${job.id}`)}
                    className="gap-1.5 text-xs"
                  >
                    <Users className="h-3.5 w-3.5" /> View Applicants ({job.applicant_count})
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleJobStatus(job)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    {job.is_active ? 'Close Job' : 'Reopen Job'}
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 p-8 rounded-2xl border border-border bg-card space-y-3">
            <Briefcase className="h-12 w-12 mx-auto text-muted-foreground" />
            <h3 className="text-lg font-bold text-foreground">No vacancies published yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Create your first job posting to define ATS screening criteria and receive verified candidates.
            </p>
            <Button onClick={() => setShowModal(true)} className="gap-2 mt-2">
              <Plus className="h-4 w-4" /> Publish New Vacancy
            </Button>
          </div>
        )}

        {/* Create Job Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-card border border-border rounded-2xl p-6 sm:p-8 max-w-2xl w-full max-h-[92vh] overflow-y-auto space-y-5 shadow-2xl"
            >
              <div className="flex justify-between items-start border-b border-border pb-3">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Publish Vacancy with ATS Threshold</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Configure automated ATS screening to ensure candidate quality before submission.
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowModal(false)} className="h-8 w-8 p-0 rounded-full">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <form onSubmit={handleCreateJob} className="space-y-4 text-xs">
                {/* Company Selector */}
                {companies.length > 0 ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="comp-select" className="text-xs font-semibold">Associated Company</Label>
                    <select
                      id="comp-select"
                      value={companyId}
                      onChange={(e) => setCompanyId(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-border bg-background text-xs"
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
                    <Label htmlFor="new-comp" className="text-xs font-semibold">Company / Organization Name</Label>
                    <Input
                      id="new-comp"
                      placeholder="e.g., Google, Uber, Scale AI"
                      value={newCompanyName}
                      onChange={(e) => setNewCompanyName(e.target.value)}
                      required
                      className="text-xs"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="job-title" className="text-xs font-semibold">Job Title</Label>
                  <Input
                    id="job-title"
                    placeholder="e.g., Senior Backend Engineer"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="job-loc" className="text-xs font-semibold">Location</Label>
                    <Input
                      id="job-loc"
                      placeholder="e.g., Remote, Bengaluru, San Francisco"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="job-type" className="text-xs font-semibold">Employment Type</Label>
                    <select
                      id="job-type"
                      value={jobType}
                      onChange={(e) => setJobType(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-border bg-background text-xs"
                    >
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Contract">Contract</option>
                      <option value="Internship">Internship</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="job-exp" className="text-xs font-semibold">Experience Level</Label>
                    <select
                      id="job-exp"
                      value={experienceLevel}
                      onChange={(e) => setExperienceLevel(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-border bg-background text-xs"
                    >
                      <option value="Entry">Entry Level</option>
                      <option value="Mid">Mid Level</option>
                      <option value="Senior">Senior Level</option>
                      <option value="Lead">Lead / Architect</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="min-ats" className="text-xs font-semibold">
                      Min ATS Score (0-100) <span className="text-primary">*</span>
                    </Label>
                    <Input
                      id="min-ats"
                      type="number"
                      min="0"
                      max="100"
                      value={minAts}
                      onChange={(e) => setMinAts(e.target.value)}
                      required
                      className="text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="job-deadline" className="text-xs font-semibold">Deadline (Optional)</Label>
                    <Input
                      id="job-deadline"
                      type="date"
                      value={deadlineStr}
                      onChange={(e) => setDeadlineStr(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                </div>

                {/* Threshold Options */}
                <div className="flex items-center gap-6 p-3 rounded-xl bg-muted/40 border border-border">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enforceThreshold}
                      onChange={(e) => setEnforceThreshold(e.target.checked)}
                      className="rounded text-primary focus:ring-primary"
                    />
                    <span className="font-semibold text-foreground">Strictly enforce threshold (Lock below {minAts})</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={discloseThreshold}
                      onChange={(e) => setDiscloseThreshold(e.target.checked)}
                      className="rounded text-primary focus:ring-primary"
                    />
                    <span className="text-muted-foreground">Disclose minimum score to students</span>
                  </label>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="job-skills" className="text-xs font-semibold">Required Technical Skills (Comma-separated)</Label>
                  <Input
                    id="job-skills"
                    placeholder="Python, FastAPI, React, PostgreSQL, Docker"
                    value={skillsStr}
                    onChange={(e) => setSkillsStr(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="job-desc" className="text-xs font-semibold">Job Overview & Description</Label>
                  <Textarea
                    id="job-desc"
                    rows={3}
                    placeholder="Describe role responsibilities, tech stack, and ideal candidate profile..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="resize-none text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="job-resp" className="text-xs font-semibold">Key Responsibilities (One per line)</Label>
                    <Textarea
                      id="job-resp"
                      rows={3}
                      placeholder="• Build scalable microservices&#10;• Optimize database query latency&#10;• Lead code reviews"
                      value={responsibilitiesStr}
                      onChange={(e) => setResponsibilitiesStr(e.target.value)}
                      className="resize-none text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="job-qual" className="text-xs font-semibold">Qualifications & Requirements (One per line)</Label>
                    <Textarea
                      id="job-qual"
                      rows={3}
                      placeholder="• 3+ years experience with Python & FastAPI&#10;• Experience with Docker and CI/CD&#10;• Strong communication skills"
                      value={qualificationsStr}
                      onChange={(e) => setQualificationsStr(e.target.value)}
                      className="resize-none text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-border">
                  <Button variant="outline" type="button" onClick={() => setShowModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting} className="gap-2 font-bold shadow-md shadow-primary/20">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                    Publish Vacancy
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
