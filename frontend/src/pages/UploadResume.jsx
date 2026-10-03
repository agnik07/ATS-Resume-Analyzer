import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import Navbar from '../components/common/Navbar';
import GitHubEvidenceDashboard from '../components/github/GitHubEvidenceDashboard';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
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
} from 'lucide-react';

import { getScoreColorClass, getScoreBgClass } from '../lib/scoreUtils';

export default function UploadResume() {
  const [file, setFile] = useState(null);
  const [jdFile, setJdFile] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [expandedIssue, setExpandedIssue] = useState(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const navigate = useNavigate();

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

  const handleUploadAndAnalyze = async () => {
    if (!file) {
      toast.error('Please select a resume file first.');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    if (jdFile) {
      formData.append('jd_file', jdFile);
    }
    if (jobDescription.trim()) {
      formData.append('job_description', jobDescription.trim());
    }

    try {
      const res = await api.post('/ats/upload-and-analyze', formData);
      setAnalysisResult(res.data);
      toast.success('Resume analyzed successfully!');
    } catch (err) {
      const detail = err.response?.data?.detail || 'Resume analysis failed. Please try again.';
      toast.error(detail);
    } finally {
      setUploading(false);
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
      link.setAttribute('download', `ATS_Report_${analysisResult.filename}.pdf`);
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

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold tracking-tight">AI-Powered ATS Resume Scorer</h1>
          <p className="text-muted-foreground mt-1">
            Deterministic 5-pillar evaluation: Formatting, Keywords, Content Quality, Skill Validation, and System Parseability.
          </p>
        </motion.div>

        {!analysisResult ? (
          /* Upload Card */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 glass-card rounded-2xl p-8 border border-border">
              <div
                className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-primary/50 transition-colors bg-background/50"
                onClick={() => document.getElementById('resume-file-input').click()}
              >
                <input
                  id="resume-file-input"
                  type="file"
                  accept=".pdf,.docx,.doc,.txt,.md"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Upload className="h-14 w-14 mx-auto mb-3 text-primary" />
                <h3 className="text-lg font-semibold">
                  {file ? file.name : 'Click to select or drag and drop your resume'}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Supported formats: PDF (.pdf), Word (.docx), or Text (.txt/.md) — Max 10MB
                </p>
                {file && (
                  <span className="inline-block mt-3 px-3 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB Selected
                  </span>
                )}
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="jd-textarea">Target Job Description (Optional)</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1.5"
                    onClick={() => document.getElementById('jd-file-input').click()}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    {jdFile ? jdFile.name : 'Upload JD Document (PDF/DOCX/TXT)'}
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
                  placeholder="Paste target job description OR upload a JD file above to match keywords, verify requirements, and evaluate domain experience..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="bg-background/50 resize-none text-sm"
                />
              </div>

              <Button
                onClick={handleUploadAndAnalyze}
                disabled={!file || uploading}
                className="w-full mt-6 py-6 text-base font-semibold rounded-xl shadow-lg shadow-primary/20"
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Running 5-Pillar ATS Analysis Pipeline...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-5 w-5" />
                    Analyze Resume with ATS Engine
                  </>
                )}
              </Button>
            </div>

            {/* Information Sidebar */}
            <div className="space-y-4">
              <div className="p-6 rounded-2xl border border-border bg-card">
                <h3 className="font-bold text-base flex items-center gap-2 mb-3">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Deterministic ATS Standard
                </h3>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-foreground">1. Formatting (20%):</span> Standard headers, bullet points, and section layout.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-foreground">2. Keywords (25%):</span> Technical terms & industry skill density.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-foreground">3. Content (25%):</span> Strong action verbs and quantifiable metrics (%/$/users).
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-foreground">4. Skill Validation (15%):</span> Cosine similarity evidence matching against projects.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-foreground">5. Compatibility (15%):</span> Privacy risk elimination and character parseability.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          /* Report Results View */
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            {/* Top Score Banner */}
            <div className="p-8 rounded-2xl border border-border bg-card flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
              <div className="flex items-center gap-6">
                <div className="relative flex items-center justify-center">
                  <div className="w-28 h-28 rounded-full border-4 border-border flex items-center justify-center">
                    <span className={`text-4xl font-black font-mono ${getScoreColorClass(analysisResult.overall_score)}`}>
                      {analysisResult.overall_score}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">
                      Overall ATS Compatibility
                    </span>
                    {analysisResult.role_type && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold bg-primary/10 text-primary border border-primary/20">
                        {analysisResult.role_type === 'consultant' ? 'Consultant / Management' : 'Technical Engineer'}
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mt-0.5">
                    {analysisResult.overall_score >= 70 ? 'ATS Optimized' : analysisResult.overall_score >= 40 ? 'Competitive Resume' : 'Needs Optimization'}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                    {analysisResult.interpretation}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <Button onClick={handleDownloadPdf} disabled={downloadingPdf} variant="outline" className="gap-2">
                  {downloadingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Download PDF Report
                </Button>
                <Button onClick={() => navigate('/skill-analysis')} className="gap-2 shadow-sm">
                  <Brain className="h-4 w-4" /> Compare Skill Gap
                </Button>
              </div>
            </div>

            {/* Score Modifiers (Points & Penalties) */}
            {(Object.keys(analysisResult.bonuses || {}).length > 0 || Object.keys(analysisResult.penalties || {}).length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Bonuses */}
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

                {/* Penalties */}
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
              </div>
            )}

            {/* 5-Pillar Breakdown Cards */}
            <div>
              <h3 className="text-xl font-bold tracking-tight mb-4">5-Pillar Score Breakdown</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                  { name: 'Formatting', score: analysisResult.component_scores.formatting, max: 20 },
                  { name: 'Keywords', score: analysisResult.component_scores.keywords, max: 25 },
                  { name: 'Content Quality', score: analysisResult.component_scores.content, max: 25 },
                  { name: 'Skill Evidence', score: analysisResult.component_scores.skill_validation, max: 15 },
                  { name: 'ATS Parseability', score: analysisResult.component_scores.ats_compatibility, max: 15 },
                ].map((pillar) => {
                  const pct = (pillar.score / pillar.max) * 100;
                  return (
                    <div key={pillar.name} className="p-5 rounded-xl border border-border bg-card flex flex-col justify-between">
                      <div>
                        <span className="text-xs text-muted-foreground font-semibold uppercase">{pillar.name}</span>
                        <div className="text-2xl font-black font-mono mt-1">
                          {pillar.score} <span className="text-xs text-muted-foreground font-normal">/ {pillar.max}</span>
                        </div>
                      </div>
                      <div className="w-full bg-muted h-2 rounded-full mt-3 overflow-hidden">
                        <div className={`h-full ${pct >= 70 ? 'bg-primary' : pct >= 40 ? 'bg-[#BA7517] dark:bg-[#EF9F27]' : 'bg-[#993C1D] dark:bg-[#F0997B]'} rounded-full`} style={{ width: `${pct}%` }} />
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
              <div className="p-6 rounded-2xl border border-border bg-card">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-foreground flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    Validated Skills ({analysisResult.skill_validation_details?.validated?.length || 0})
                  </h4>
                  <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
                    {analysisResult.skill_validation_details?.validation_pct?.toFixed(0)}% Backed by Projects
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
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
              <div className="p-6 rounded-2xl border border-border bg-card">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-foreground flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-[#BA7517] dark:text-[#EF9F27]" />
                    Unvalidated Skills ({analysisResult.skill_validation_details?.unvalidated?.length || 0})
                  </h4>
                  <span className="text-xs text-muted-foreground">Lacks Project Mentions</span>
                </div>
                <div className="flex flex-wrap gap-2">
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
                    <p className="text-xs text-muted-foreground">All listed skills are supported by project or work experience!</p>
                  )}
                </div>
              </div>
            </div>

            {/* Strengths and Critical Issues */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl border border-border bg-card">
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

              <div className="p-6 rounded-2xl border border-border bg-card">
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

            {/* Bottom Actions */}
            <div className="flex justify-center gap-4 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setFile(null);
                  setAnalysisResult(null);
                }}
              >
                Scan Another Resume
              </Button>
              <Button onClick={() => navigate('/skill-analysis')} className="gap-2">
                <Brain className="h-4 w-4" /> Run Skill Gap Analysis
              </Button>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
