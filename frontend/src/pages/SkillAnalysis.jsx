import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../lib/api';
import Navbar from '../components/common/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Brain,
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Book,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

export default function SkillAnalysis() {
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [presetCompanies, setPresetCompanies] = useState([]);
  const [presetRoles, setPresetRoles] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [analyses, setAnalyses] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPresets();
    fetchAnalyses();
  }, []);

  const fetchPresets = async () => {
    try {
      const [compRes, roleRes] = await Promise.all([
        api.get('/skill-gap/companies'),
        api.get('/skill-gap/roles'),
      ]);
      setPresetCompanies(compRes.data || []);
      setPresetRoles(roleRes.data || []);
    } catch (err) {
      console.error('Failed to load presets:', err);
    }
  };

  const fetchAnalyses = async () => {
    try {
      const res = await api.get('/skill-gap/reports');
      setAnalyses(res.data || []);
    } catch (err) {
      console.error('Failed to load past analyses:', err);
    }
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!company || !role) {
      toast.error('Please enter both target company and role.');
      return;
    }

    setAnalyzing(true);
    try {
      const res = await api.post('/skill-gap/analyze', {
        company: company.trim(),
        role: role.trim(),
        job_description: jobDescription.trim() || undefined,
      });

      setAnalysis(res.data);
      toast.success('Skill gap analysis complete!');
      fetchAnalyses();
    } catch (err) {
      const detail = err.response?.data?.detail || 'Analysis failed. Please ensure you have uploaded a resume first.';
      toast.error(detail);
      if (err.response?.status === 400 && detail.includes('resume')) {
        setTimeout(() => navigate('/upload-resume'), 1500);
      }
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold tracking-tight">AI Skill Gap Engine & Career Roadmaps</h1>
          <p className="text-muted-foreground mt-1">
            Compare your substantiated skills against real industry benchmarks without reparsing your resume.
          </p>
        </motion.div>

        {/* Input Form Card */}
        <div className="glass-card rounded-2xl p-8 border border-border">
          <form onSubmit={handleAnalyze} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="target-company">Target Company</Label>
                <Input
                  id="target-company"
                  placeholder="e.g., Google, Amazon, Microsoft, Meta"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="bg-background/50"
                  required
                />
                {/* Presets */}
                {presetCompanies.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {presetCompanies.slice(0, 5).map((compName) => (
                      <button
                        key={compName}
                        type="button"
                        onClick={() => setCompany(compName)}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-muted hover:bg-primary/10 hover:text-primary transition-colors"
                      >
                        {compName}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="target-role">Target Role</Label>
                <Input
                  id="target-role"
                  placeholder="e.g., Software Engineer, Data Scientist"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="bg-background/50"
                  required
                />
                {/* Presets */}
                {presetRoles.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {presetRoles.slice(0, 4).map((rName) => (
                      <button
                        key={rName}
                        type="button"
                        onClick={() => setRole(rName)}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-muted hover:bg-primary/10 hover:text-primary transition-colors"
                      >
                        {rName}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-jd">Custom Job Description (Optional)</Label>
              <Textarea
                id="custom-jd"
                rows={3}
                placeholder="Paste specific job posting requirements to compare directly..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="bg-background/50 resize-none text-sm"
              />
            </div>

            <Button
              type="submit"
              disabled={analyzing}
              className="w-full py-6 rounded-xl text-base font-semibold shadow-lg shadow-primary/20"
            >
              {analyzing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Running Skill Gap Vector Match...
                </>
              ) : (
                <>
                  <Brain className="mr-2 h-5 w-5" />
                  Analyze Skill Gap & Generate Roadmap
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Results View */}
        {analysis && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            {/* Top Match Bar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl border border-border bg-card flex flex-col justify-center items-center text-center">
                <span className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">
                  Skill Match Score
                </span>
                <div className="text-5xl font-black font-mono text-primary my-2">
                  {analysis.match_percentage}%
                </div>
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary">
                  {analysis.confidence_level} Match Confidence
                </span>
              </div>

              <div className="lg:col-span-2 p-6 rounded-2xl border border-border bg-card flex flex-col justify-between">
                <h4 className="font-bold text-sm text-foreground mb-2">Skills Overview Breakdown</h4>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart
                    data={[
                      { name: 'Matched Skills', count: analysis.matched_skills.length, fill: '#10b981' },
                      { name: 'Missing Skills', count: analysis.missing_skills.length, fill: '#f43f5e' },
                    ]}
                    layout="vertical"
                  >
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px' }} />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                      <Cell fill="#10b981" />
                      <Cell fill="#f43f5e" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Matched vs Missing Badges */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Matched */}
              <div className="p-6 rounded-2xl border border-border bg-card">
                <h4 className="font-bold text-foreground flex items-center gap-2 mb-4">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  Matched Competencies ({analysis.matched_skills.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.matched_skills.map((s, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-lg text-xs font-semibold"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Missing */}
              <div className="p-6 rounded-2xl border border-border bg-card">
                <h4 className="font-bold text-foreground flex items-center gap-2 mb-4">
                  <XCircle className="h-5 w-5 text-rose-500" />
                  Missing Required Skills ({analysis.missing_skills.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.missing_skills.length > 0 ? (
                    analysis.missing_skills.map((s, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-lg text-xs font-semibold"
                      >
                        {s}
                      </span>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">You match all core required competencies for this position!</p>
                  )}
                </div>
              </div>
            </div>

            {/* 4-Week Learning Roadmap */}
            <div className="p-8 rounded-2xl border border-border bg-card">
              <h3 className="text-xl font-bold text-foreground flex items-center gap-2 mb-4">
                <Calendar className="h-5 w-5 text-primary" />
                Actionable 4-Week Learning Roadmap
              </h3>
              <div className="prose prose-invert max-w-none text-muted-foreground whitespace-pre-wrap text-sm leading-relaxed">
                {analysis.learning_roadmap}
              </div>
            </div>

            {/* Curated Resources */}
            {analysis.learning_resources && Object.keys(analysis.learning_resources).length > 0 && (
              <div className="p-8 rounded-2xl border border-border bg-card">
                <h3 className="text-xl font-bold text-foreground flex items-center gap-2 mb-6">
                  <Book className="h-5 w-5 text-primary" />
                  Recommended Free Learning Resources
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(analysis.learning_resources).map(([skill, resources]) => (
                    <div key={skill} className="p-4 rounded-xl border border-border bg-background/50 space-y-3">
                      <div className="font-bold text-sm uppercase tracking-wider text-foreground">
                        {skill}
                      </div>
                      <div className="space-y-2">
                        {resources.map((r, i) => (
                          <a
                            key={i}
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-2.5 rounded-lg bg-muted/60 hover:bg-primary/10 hover:text-primary transition-colors text-xs"
                          >
                            <span className="font-medium truncate pr-2">
                              [{r.platform}] {r.title}
                            </span>
                            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                          </a>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Target Company DSA Preparation Bank */}
            {analysis.company_dsa_problems && analysis.company_dsa_problems.length > 0 && (
              <div className="p-8 rounded-2xl border border-border bg-card space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-amber-400" />
                      Target Company DSA Interview Bank ({analysis.target_company})
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Top frequently asked LeetCode questions for {analysis.target_company} technical rounds.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate('/dsa-tracker')}
                    className="rounded-xl text-xs gap-1.5 shrink-0"
                  >
                    Open Full DSA Tracker <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {analysis.company_dsa_problems.map((prob) => {
                    const diffColor =
                      prob.difficulty === 'Easy'
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                        : prob.difficulty === 'Medium'
                        ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                        : 'bg-rose-500/10 text-rose-500 border-rose-500/20';

                    return (
                      <a
                        key={prob.id}
                        href={prob.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-4 rounded-xl border border-border bg-background/60 hover:border-primary/50 transition-all flex items-center justify-between gap-3 group"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-muted-foreground">
                              #{prob.id}
                            </span>
                            <span className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                              {prob.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <span className={`px-2 py-0.2 rounded border text-[10px] font-bold ${diffColor}`}>
                              {prob.difficulty}
                            </span>
                            {prob.frequency && <span>🔥 {prob.frequency} Freq</span>}
                            {prob.acceptance && <span>✓ {prob.acceptance}</span>}
                          </div>
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Previous Analyses List */}
        {!analysis && analyses.length > 0 && (
          <div>
            <h3 className="text-lg font-bold tracking-tight mb-4">Previous Skill Analyses</h3>
            <div className="space-y-3">
              {analyses.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setAnalysis(item)}
                  className="p-5 rounded-xl border border-border bg-card hover:border-primary/50 transition-all cursor-pointer flex justify-between items-center"
                >
                  <div>
                    <h4 className="font-bold text-sm text-foreground">
                      {item.target_company} — {item.target_role}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Analyzed on {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-lg font-black font-mono text-primary">
                        {item.match_percentage}%
                      </div>
                      <span className="text-[10px] uppercase text-muted-foreground">Match</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
