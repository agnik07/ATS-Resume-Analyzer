import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
} from 'lucide-react';

export default function CandidateSearch() {
  const { jobId } = useParams();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('ats_score');
  const [statusFilter, setStatusFilter] = useState('');
  const [minAts, setMinAts] = useState('');

  // Selected candidate modal state
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [candidateDetails, setCandidateDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [recruiterNotes, setRecruiterNotes] = useState('');
  const [appStatus, setAppStatus] = useState('applied');
  const [savingStatus, setSavingStatus] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchCandidates();
  }, [jobId, sortBy, statusFilter, minAts]);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const params = { sort_by: sortBy };
      if (statusFilter) params.status_filter = statusFilter;
      if (minAts) params.min_ats = parseFloat(minAts);

      const res = await api.get(`/recruiter/jobs/${jobId}/candidates`, { params });
      setCandidates(res.data || []);
    } catch (err) {
      console.error('Failed to load candidate list:', err);
      toast.error('Failed to load candidate applications.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCandidate = async (appId) => {
    setSelectedCandidate(appId);
    setLoadingDetails(true);
    try {
      const res = await api.get(`/recruiter/applications/${appId}`);
      setCandidateDetails(res.data);
      setAppStatus(res.data.status);
      setRecruiterNotes(res.data.recruiter_notes || '');
    } catch (err) {
      toast.error('Failed to load candidate profile.');
      setSelectedCandidate(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleGenerateAiSummary = async () => {
    if (!selectedCandidate) return;
    setGeneratingAi(true);
    try {
      const res = await api.post(`/recruiter/applications/${selectedCandidate}/ai-summary`);
      setCandidateDetails((prev) => ({
        ...prev,
        ai_candidate_summary: res.data.executive_summary,
        ai_interview_questions: res.data.technical_interview_questions,
      }));
      toast.success('AI executive summary & interview questions generated!');
      fetchCandidates();
    } catch (err) {
      toast.error('Failed to generate AI candidate summary.');
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleSaveStatus = async () => {
    if (!selectedCandidate) return;
    setSavingStatus(true);
    try {
      await api.patch(`/recruiter/applications/${selectedCandidate}/status`, {
        status: appStatus,
        recruiter_notes: recruiterNotes,
      });
      toast.success('Candidate status updated successfully!');
      fetchCandidates();
    } catch (err) {
      toast.error('Failed to update candidate status.');
    } finally {
      setSavingStatus(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 85) return 'text-emerald-500';
    if (score >= 70) return 'text-blue-500';
    if (score >= 55) return 'text-amber-500';
    return 'text-rose-500';
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Candidate Pipeline & ATS Ranking</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Deterministic ranking of applicant pool based on 5-pillar ATS evaluation and verified skill evidence.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/recruiter/jobs')}>
            Back to Job Postings
          </Button>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-4 rounded-xl border border-border bg-card flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Sort By:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="p-1.5 rounded-lg border border-border bg-background text-xs"
              >
                <option value="ats_score">ATS Score (Highest First)</option>
                <option value="match_percentage">Skill Match %</option>
                <option value="applied_at">Date Applied</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="p-1.5 rounded-lg border border-border bg-background text-xs"
              >
                <option value="">All Applicants</option>
                <option value="applied">Applied</option>
                <option value="reviewing">Reviewing</option>
                <option value="shortlisted">Shortlisted</option>
                <option value="rejected">Rejected</option>
                <option value="offered">Offered</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Min ATS Score:</span>
            <Input
              type="number"
              placeholder="e.g. 70"
              value={minAts}
              onChange={(e) => setMinAts(e.target.value)}
              className="w-24 h-8 text-xs bg-background/50"
            />
          </div>
        </div>

        {/* Candidates Table */}
        {loading ? (
          <div className="py-16 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-xs text-muted-foreground mt-2">Loading and ranking candidate pool...</p>
          </div>
        ) : candidates.length > 0 ? (
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-4 font-semibold">Rank</th>
                    <th className="p-4 font-semibold">Candidate Name</th>
                    <th className="p-4 font-semibold">Email</th>
                    <th className="p-4 font-semibold">ATS Score</th>
                    <th className="p-4 font-semibold">Skill Match</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {candidates.map((c, idx) => (
                    <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4 font-mono font-bold text-muted-foreground">#{idx + 1}</td>
                      <td className="p-4 font-bold text-foreground">{c.student_name}</td>
                      <td className="p-4 text-xs text-muted-foreground">{c.student_email}</td>
                      <td className="p-4 font-mono font-bold">
                        <span className={`text-base ${getScoreColor(c.ats_score)}`}>{c.ats_score}/100</span>
                      </td>
                      <td className="p-4 font-mono font-bold text-primary">{c.match_percentage}%</td>
                      <td className="p-4">
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase ${
                            c.status === 'shortlisted' || c.status === 'offered'
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : c.status === 'rejected'
                              ? 'bg-rose-500/10 text-rose-500'
                              : 'bg-blue-500/10 text-blue-500'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <Button size="sm" variant="outline" onClick={() => handleOpenCandidate(c.id)} className="gap-1 text-xs">
                          Evaluate <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-16 p-8 rounded-2xl border border-border bg-card">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-lg font-bold text-foreground">No applicants found matching filter</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Try adjusting your minimum ATS score threshold or status filter.
            </p>
          </div>
        )}

        {/* Candidate Evaluation Modal */}
        {selectedCandidate && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-card border border-border rounded-2xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl"
            >
              {loadingDetails ? (
                <div className="py-16 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                </div>
              ) : candidateDetails ? (
                <>
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">{candidateDetails.student.full_name}</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">{candidateDetails.student.email}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedCandidate(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Top Score Banner */}
                  <div className="p-4 rounded-xl border border-border bg-background/50 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground">ATS Score</span>
                      <div className={`text-3xl font-black font-mono ${getScoreColor(candidateDetails.ats_score)}`}>
                        {candidateDetails.ats_score}/100
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground">Skill Match %</span>
                      <div className="text-3xl font-black font-mono text-primary">
                        {candidateDetails.match_percentage}%
                      </div>
                    </div>
                  </div>

                  {/* Skills Grid */}
                  <div>
                    <h4 className="font-bold text-xs uppercase text-muted-foreground mb-2">Claimed Technical Competencies</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {candidateDetails.resume?.skills?.map((s, idx) => (
                        <span key={idx} className="px-2.5 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* AI Summary Section */}
                  <div className="p-5 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-sm text-primary flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4" />
                        AI Executive Summary & Interview Questions
                      </h4>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleGenerateAiSummary}
                        disabled={generatingAi}
                        className="text-xs gap-1.5"
                      >
                        {generatingAi ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                        {candidateDetails.ai_candidate_summary ? 'Regenerate' : 'Generate with Groq'}
                      </Button>
                    </div>

                    {candidateDetails.ai_candidate_summary ? (
                      <div className="space-y-3 text-xs leading-relaxed">
                        <p className="text-foreground">{candidateDetails.ai_candidate_summary}</p>
                        {candidateDetails.ai_interview_questions?.length > 0 && (
                          <div className="pt-2 border-t border-primary/15 space-y-1.5">
                            <span className="font-bold text-foreground">Suggested Technical Interview Questions:</span>
                            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                              {candidateDetails.ai_interview_questions.map((q, idx) => (
                                <li key={idx}>{q}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Click "Generate with Groq" to synthesize an executive profile summary and targeted technical interview questions.
                      </p>
                    )}
                  </div>

                  {/* Status and Notes Update */}
                  <div className="p-4 rounded-xl border border-border bg-background/50 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="candidate-status">Pipeline Status</Label>
                        <select
                          id="candidate-status"
                          value={appStatus}
                          onChange={(e) => setAppStatus(e.target.value)}
                          className="w-full p-2 rounded-lg border border-border bg-background text-xs"
                        >
                          <option value="applied">Applied</option>
                          <option value="reviewing">Reviewing</option>
                          <option value="shortlisted">Shortlisted</option>
                          <option value="rejected">Rejected</option>
                          <option value="offered">Offered</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="recruiter-notes">Recruiter Notes</Label>
                      <Textarea
                        id="recruiter-notes"
                        rows={2}
                        placeholder="Add private evaluation notes for hiring committee..."
                        value={recruiterNotes}
                        onChange={(e) => setRecruiterNotes(e.target.value)}
                        className="text-xs resize-none"
                      />
                    </div>

                    <div className="flex justify-end pt-1">
                      <Button size="sm" onClick={handleSaveStatus} disabled={savingStatus} className="text-xs gap-1.5">
                        {savingStatus ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        Save Evaluation
                      </Button>
                    </div>
                  </div>
                </>
              ) : null}
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
}
