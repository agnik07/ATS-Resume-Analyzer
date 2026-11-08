import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../lib/api';
import Navbar from '../components/common/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Brain,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  BookOpen,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight,
  TrendingUp,
  GraduationCap,
  Target,
  Code2,
  Clock,
  ShieldCheck,
  Check,
  Flame,
  BarChart3,
  Youtube,
  FileText,
  ChevronDown,
  ChevronUp,
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
import { getScoreColorClass, getScoreFillHex } from '../lib/scoreUtils';

export default function SkillAnalysis() {
  const location = useLocation();
  const navigate = useNavigate();

  // State pre-filled from navigation state if available
  const [company, setCompany] = useState(location.state?.company || '');
  const [role, setRole] = useState(location.state?.role || '');
  const [jobDescription, setJobDescription] = useState(location.state?.job_description || '');
  const [resumeId, setResumeId] = useState(location.state?.resume_id || null);
  const [atsReportId, setAtsReportId] = useState(location.state?.ats_report_id || null);

  const [presetCompanies, setPresetCompanies] = useState([]);
  const [presetRoles, setPresetRoles] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [analyses, setAnalyses] = useState([]);
  const [activeWeek, setActiveWeek] = useState(1);
  const [roadmapProgress, setRoadmapProgress] = useState({});

  // Load persistent roadmap progress whenever active analysis changes
  useEffect(() => {
    if (analysis) {
      loadRoadmapProgress(analysis.id || 'default');
    }
  }, [analysis]);

  const loadRoadmapProgress = async (roadmapId) => {
    try {
      const res = await api.get('/skill-gap/roadmap/progress', {
        params: { roadmap_id: roadmapId || 'default' },
      });
      if (res.data && res.data.completed_items) {
        const pMap = {};
        res.data.completed_items.forEach((id) => {
          pMap[id] = true;
        });
        setRoadmapProgress((prev) => ({ ...prev, ...pMap }));
      }
    } catch {
      try {
        const local = localStorage.getItem(`skillgap_roadmap_${roadmapId}`);
        if (local) setRoadmapProgress(JSON.parse(local));
      } catch {}
    }
  };

  const toggleRoadmapItem = async (itemId, itemType, weekNum, itemName) => {
    const nextVal = !roadmapProgress[itemId];
    const updated = { ...roadmapProgress, [itemId]: nextVal };
    setRoadmapProgress(updated);

    const rId = analysis?.id || 'default';
    try {
      localStorage.setItem(`skillgap_roadmap_${rId}`, JSON.stringify(updated));
    } catch {}

    try {
      await api.post('/skill-gap/roadmap/progress', {
        roadmap_id: rId,
        item_id: itemId,
        item_type: itemType,
        week_number: weekNum,
        completed: nextVal,
      });
      if (nextVal) {
        toast.success(`Completed "${itemName || 'Item'}"! 🎉`);
      } else {
        toast.info(`Unmarked "${itemName || 'Item'}".`);
      }
    } catch {
      // Offline fallback preserved in local storage
    }
  };

  const roadmapStats = React.useMemo(() => {
    if (!analysis?.roadmap_weeks) return { total: 0, completed: 0, percentage: 0 };
    let total = 0;
    let completed = 0;
    analysis.roadmap_weeks.forEach((w) => {
      (w.objectives || []).forEach((_, idx) => {
        total += 1;
        if (roadmapProgress[`w${w.week}-obj-${idx}`]) completed += 1;
      });
      (w.resources || []).forEach((res, idx) => {
        total += 1;
        const resId = res.id || `w${w.week}-res-${idx}`;
        if (roadmapProgress[resId]) completed += 1;
      });
    });
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percentage };
  }, [analysis, roadmapProgress]);

  useEffect(() => {
    fetchPresets();
    fetchAnalyses();

    // If passed pre-filled state with company & role, trigger analysis automatically
    if (location.state?.company && location.state?.role) {
      triggerAnalysisWithParams(
        location.state.company,
        location.state.role,
        location.state.job_description,
        location.state.resume_id,
        location.state.ats_report_id
      );
    }
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

  const triggerAnalysisWithParams = async (c, r, jd, resId, atsId) => {
    setAnalyzing(true);
    try {
      const payload = {
        company: c.trim(),
        role: r.trim(),
        job_description: jd?.trim() || undefined,
        resume_id: resId || undefined,
        ats_report_id: atsId || undefined,
      };
      const res = await api.post('/skill-gap/analyze', payload);
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

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!company || !role) {
      toast.error('Please enter both target company and role.');
      return;
    }
    await triggerAnalysisWithParams(company, role, jobDescription, resumeId, atsReportId);
  };

  // Chart data for skill gap display: g_i = max(0, d_i - w_i)
  const chartData = (analysis?.skill_gaps || []).slice(0, 10).map((item) => ({
    name: item.skill.length > 14 ? item.skill.slice(0, 13) + '…' : item.skill,
    fullName: item.skill,
    demand: item.demand_proficiency || 2.0,
    candidate: item.candidate_proficiency || 0.0,
    gap: item.gap,
    status: item.status,
  }));

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
              Career Readiness Engine
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mt-1">Skill Gap Analysis & Roadmaps</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Research-grade hybrid matching (C = 0.6 × M_rule + 0.4 × Sim × 100) against real company benchmarks without reparsing your resume.
          </p>
        </motion.div>

        {/* Input Form Card */}
        <div className="glass-card rounded-2xl p-6 sm:p-8 border border-border shadow-sm">
          <form onSubmit={handleAnalyze} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="target-company" className="text-sm font-semibold">
                  Target Company <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="target-company"
                  placeholder="e.g., Google, Amazon, Microsoft, Meta"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="bg-background/60"
                  required
                />
                {presetCompanies.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[11px] text-muted-foreground mr-1">Popular:</span>
                    {presetCompanies.slice(0, 6).map((compName) => (
                      <button
                        key={compName}
                        type="button"
                        onClick={() => setCompany(compName)}
                        className={`text-[11px] px-2 py-0.5 rounded-md border transition-colors ${
                          company.toLowerCase() === compName.toLowerCase()
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted/40 hover:bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        {compName}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="target-role" className="text-sm font-semibold">
                  Target Role <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="target-role"
                  placeholder="e.g., Full Stack Engineer, Backend Engineer"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="bg-background/60"
                  required
                />
                {presetRoles.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[11px] text-muted-foreground mr-1">Popular:</span>
                    {presetRoles.slice(0, 4).map((rName) => (
                      <button
                        key={rName}
                        type="button"
                        onClick={() => setRole(rName)}
                        className={`text-[11px] px-2 py-0.5 rounded-md border transition-colors ${
                          role.toLowerCase() === rName.toLowerCase()
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted/40 hover:bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        {rName}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-jd" className="text-sm font-semibold">
                Job Description (Primary source of required skills)
              </Label>
              <Textarea
                id="custom-jd"
                rows={3}
                placeholder="Paste specific job posting requirements to evaluate directly against the actual JD..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="bg-background/60 resize-none text-sm font-sans"
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
                  Running Skill Gap Engine & Roadmap Generator...
                </>
              ) : (
                <>
                  <Brain className="mr-2 h-5 w-5" />
                  Analyze Skill Gap & Generate 4-Week Roadmap
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
              <div className="p-6 rounded-2xl border border-border bg-card flex flex-col justify-center items-center text-center shadow-sm">
                <span className="text-xs uppercase font-bold text-muted-foreground tracking-wider">
                  Hybrid Skill Match Score
                </span>
                <div className={`text-5xl font-black font-mono my-2 ${getScoreColorClass(analysis.match_percentage)}`}>
                  {analysis.match_percentage.toFixed(0)}%
                </div>
                <div className="flex flex-wrap gap-1.5 justify-center mt-1">
                  <span className="text-xs font-semibold px-3 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {analysis.confidence_level} Confidence ({(analysis.confidence_score * 100).toFixed(0)}%)
                  </span>
                  {analysis.fallback_used && (
                    <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                      Source: {analysis.fallback_used}
                    </span>
                  )}
                </div>
              </div>

              <div className="lg:col-span-2 p-6 rounded-2xl border border-border bg-card flex flex-col justify-between shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-sm text-foreground">Technical Competencies Overview</h4>
                  <span className="text-xs text-muted-foreground">
                    {analysis.matched_skills.length} matched / {analysis.missing_skills.length} missing
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart
                    data={[
                      { name: 'Matched Skills', count: analysis.matched_skills.length, fill: '#0F6E56' },
                      { name: 'Missing Skills', count: analysis.missing_skills.length, fill: '#BA7517' },
                    ]}
                    layout="vertical"
                  >
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }} />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                      <Cell fill="#0F6E56" />
                      <Cell fill="#BA7517" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Matched vs Missing Badges */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Matched */}
              <div className="p-6 rounded-2xl border border-border bg-card shadow-sm">
                <h4 className="font-bold text-foreground flex items-center gap-2 mb-4">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  Matched Competencies ({analysis.matched_skills.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.matched_skills.map((s, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-primary/10 border border-primary/20 text-primary rounded-lg text-xs font-semibold flex items-center gap-1"
                    >
                      <Check className="h-3 w-3" /> {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Missing */}
              <div className="p-6 rounded-2xl border border-border bg-card shadow-sm">
                <h4 className="font-bold text-foreground flex items-center gap-2 mb-4">
                  <Flame className="h-5 w-5 text-[#993C1D] dark:text-[#F0997B]" />
                  Priority Missing Skills ({analysis.missing_skills.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.missing_skills.length > 0 ? (
                    analysis.missing_skills.map((s, idx) => {
                      const gapObj = analysis.skill_gaps?.find(g => g.skill.toLowerCase() === s.toLowerCase());
                      return (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-[#993C1D]/10 dark:bg-[#F0997B]/15 border border-[#993C1D]/20 dark:border-[#F0997B]/30 text-[#993C1D] dark:text-[#F0997B] rounded-lg text-xs font-semibold flex items-center gap-1.5"
                        >
                          <AlertTriangle className="h-3 w-3" />
                          {s}
                          {gapObj && (
                            <span className="text-[10px] font-mono opacity-80">
                              (Gap: {gapObj.gap.toFixed(1)})
                            </span>
                          )}
                        </span>
                      );
                    })
                  ) : (
                    <p className="text-xs text-muted-foreground">You match all core required competencies for this position!</p>
                  )}
                </div>
              </div>
            </div>

            {/* Formula Breakdown Chart: g_i = max(0, d_i - w_i) */}
            {chartData.length > 0 && (
              <div className="p-6 rounded-2xl border border-border bg-card shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-bold text-foreground flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      Skill Gap Formula Breakdown: $g_i = \max(0, d_i - w_i)$
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Target Role Demand ($d_i$) vs Candidate Validated Level ($w_i$).
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm bg-primary" /> Demand ($d_i$)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm bg-[#BA7517] dark:bg-[#EF9F27]" /> Candidate ($w_i$)
                    </span>
                  </div>
                </div>

                <div className="h-72 w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 25 }}>
                      <XAxis dataKey="name" angle={-25} textAnchor="end" height={50} tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 3]} ticks={[0, 1, 2, 3]} tick={{ fontSize: 11 }} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="p-3 bg-popover border border-border rounded-lg shadow-lg text-xs space-y-1">
                                <div className="font-bold text-foreground">{data.fullName}</div>
                                <div className="text-primary">Role Demand ($d_i$): {data.demand.toFixed(1)} / 3.0</div>
                                <div className="text-[#BA7517] dark:text-[#EF9F27]">Candidate Level ($w_i$): {data.candidate.toFixed(1)} / 3.0</div>
                                <div className="font-mono font-bold text-foreground pt-1 border-t border-border">
                                  Calculated Gap ($g_i$): {data.gap.toFixed(1)}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="demand" fill="#0F6E56" radius={[4, 4, 0, 0]} name="Demand Proficiency" />
                      <Bar dataKey="candidate" fill="#BA7517" radius={[4, 4, 0, 0]} name="Candidate Proficiency" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Structured 4-Week Learning Roadmap */}
            {analysis.roadmap_weeks && analysis.roadmap_weeks.length > 0 ? (
              <div className="p-6 sm:p-8 rounded-2xl border border-border bg-card shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold tracking-tight flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-primary" />
                      Personalized 4-Week Career Learning Roadmap
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Targeted milestones designed to bridge missing skills systematically. Check off objectives and resources as you complete them.
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl">
                    {[1, 2, 3, 4].map((w) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => setActiveWeek(w)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          activeWeek === w
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Week {w}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Persistent Roadmap Progress Summary */}
                <div className="p-4 rounded-xl border border-border bg-muted/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-primary" /> Overall 4-Week Roadmap Progress
                    </div>
                    <div className="text-sm font-semibold text-foreground">
                      {roadmapStats.completed} of {roadmapStats.total} learning tasks & verified resources completed
                    </div>
                  </div>
                  <div className="w-full sm:w-48 space-y-1">
                    <div className="flex justify-between text-xs font-mono font-bold">
                      <span className="text-muted-foreground">Completed</span>
                      <span className="text-primary">{roadmapStats.percentage}%</span>
                    </div>
                    <Progress value={roadmapStats.percentage} className="h-2 rounded-full" />
                  </div>
                </div>

                {(() => {
                  const weekData = analysis.roadmap_weeks.find((w) => w.week === activeWeek) || analysis.roadmap_weeks[0];
                  if (!weekData) return null;

                  return (
                    <div className="space-y-6">
                      <div className="p-4 rounded-xl bg-muted/30 border border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div>
                          <span className="text-xs font-bold uppercase text-primary tracking-wider">
                            Week {weekData.week} Focus
                          </span>
                          <h4 className="text-lg font-bold text-foreground mt-0.5">{weekData.theme}</h4>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {weekData.focus_skills?.map((skill, sIdx) => (
                            <span
                              key={sIdx}
                              className="px-2.5 py-1 rounded-md text-xs font-semibold bg-primary/10 text-primary border border-primary/20"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="p-5 rounded-xl border border-border bg-background/50 space-y-3">
                            <h5 className="text-xs font-bold uppercase text-foreground tracking-wider flex items-center gap-1.5">
                              <Target className="h-4 w-4 text-primary" /> Learning Objectives (Click to check off)
                            </h5>
                            <ul className="space-y-2.5">
                              {weekData.objectives?.map((obj, oIdx) => {
                                const objKey = `w${weekData.week}-obj-${oIdx}`;
                                const isDone = !!roadmapProgress[objKey];
                                return (
                                  <li
                                    key={oIdx}
                                    onClick={() => toggleRoadmapItem(objKey, 'objective', weekData.week, obj)}
                                    className={`text-xs p-2.5 rounded-lg border transition-all cursor-pointer flex items-start gap-2.5 ${
                                      isDone
                                        ? 'bg-primary/5 border-primary/30 text-muted-foreground line-through'
                                        : 'bg-card border-border/70 text-foreground hover:border-primary/40'
                                    }`}
                                  >
                                    <Checkbox
                                      checked={isDone}
                                      onCheckedChange={() => toggleRoadmapItem(objKey, 'objective', weekData.week, obj)}
                                      className="mt-0.5 shrink-0"
                                    />
                                    <span className="leading-relaxed">{obj}</span>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>

                          <div className="p-5 rounded-xl border border-border bg-background/50 space-y-3">
                            <h5 className="text-xs font-bold uppercase text-foreground tracking-wider flex items-center gap-1.5">
                              <Code2 className="h-4 w-4 text-primary" /> Practical Hands-on Exercises
                            </h5>
                            <ul className="space-y-2">
                              {weekData.practical_exercises?.map((ex, eIdx) => (
                                <li key={eIdx} className="text-xs text-muted-foreground flex items-start gap-2">
                                  <ArrowRight className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                                  <span>{ex}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="p-5 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
                            <h5 className="text-xs font-bold uppercase text-primary tracking-wider flex items-center gap-1.5">
                              <Sparkles className="h-4 w-4" /> Weekly Mini-Project
                            </h5>
                            <p className="text-xs text-foreground font-medium leading-relaxed">
                              {weekData.mini_project}
                            </p>
                          </div>

                          <div className="p-5 rounded-xl border border-border bg-background/50 space-y-3">
                            <h5 className="text-xs font-bold uppercase text-foreground tracking-wider flex items-center gap-1.5">
                              <Check className="h-4 w-4 text-primary" /> Expected Outcomes
                            </h5>
                            <ul className="space-y-2">
                              {weekData.learning_outcomes?.map((out, outIdx) => (
                                <li key={outIdx} className="text-xs text-muted-foreground flex items-start gap-2">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                                  <span>{out}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* Verified Resources for active week */}
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                          <h5 className="text-sm font-bold text-foreground flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-primary" />
                            Verified Learning Resources for Week {weekData.week}
                          </h5>
                          <span className="text-[11px] text-muted-foreground">
                            {weekData.resources?.filter((r, idx) => roadmapProgress[r.id || `w${weekData.week}-res-${idx}`]).length || 0} / {weekData.resources?.length || 0} completed
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {weekData.resources?.map((res, rIdx) => {
                            const resKey = res.id || `w${weekData.week}-res-${rIdx}`;
                            const isDone = !!roadmapProgress[resKey];
                            const isYouTube =
                              res.platform?.toLowerCase().includes('youtube') ||
                              res.url?.includes('youtube.com') ||
                              res.url?.includes('youtu.be');

                            return (
                              <div
                                key={rIdx}
                                className={`p-4 rounded-xl border transition-all shadow-sm flex flex-col justify-between space-y-3 ${
                                  isDone
                                    ? 'bg-primary/5 border-primary/30'
                                    : 'border-border bg-background hover:border-primary/40'
                                }`}
                              >
                                <div>
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <Checkbox
                                        checked={isDone}
                                        onCheckedChange={() =>
                                          toggleRoadmapItem(resKey, 'resource', weekData.week, res.title)
                                        }
                                        className="shrink-0"
                                      />
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                                        {isYouTube ? <Youtube className="h-3 w-3 text-red-500" /> : <BookOpen className="h-3 w-3" />}
                                        {res.platform}
                                      </span>
                                    </div>

                                    {res.verified ? (
                                      <span className="text-[10px] font-semibold text-primary flex items-center gap-1">
                                        <ShieldCheck className="h-3 w-3" /> Verified Resource
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-semibold text-muted-foreground">
                                        Educational Reference
                                      </span>
                                    )}
                                  </div>

                                  <h6
                                    className={`font-bold text-sm mt-2 line-clamp-1 ${
                                      isDone ? 'line-through text-muted-foreground' : 'text-foreground'
                                    }`}
                                  >
                                    {res.title}
                                  </h6>

                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                    {res.why_recommended}
                                  </p>

                                  {/* Learning objectives if available */}
                                  {res.learning_objectives && res.learning_objectives.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-border/40 space-y-1">
                                      <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                                        Learning Goals:
                                      </span>
                                      <ul className="space-y-0.5">
                                        {res.learning_objectives.slice(0, 2).map((goal, gIdx) => (
                                          <li key={gIdx} className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                                            <span className="h-1 w-1 rounded-full bg-primary shrink-0" />
                                            <span className="truncate">{goal}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>

                                <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
                                    {res.provider && <span>by {res.provider}</span>}
                                    {res.duration && (
                                      <>
                                        <span>•</span>
                                        <span className="flex items-center gap-1">
                                          <Clock className="h-3 w-3" /> {res.duration}
                                        </span>
                                      </>
                                    )}
                                    <span>•</span>
                                    <span className="text-foreground font-medium">
                                      {res.rating_display || 'Rating unavailable'}
                                    </span>
                                  </div>

                                  {res.url && (
                                    <a
                                      href={res.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-primary hover:underline font-semibold text-xs shrink-0"
                                    >
                                      Access Resource <ExternalLink className="h-3 w-3" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="p-8 rounded-2xl border border-border bg-card">
                <h3 className="text-xl font-bold text-foreground flex items-center gap-2 mb-4">
                  <Calendar className="h-5 w-5 text-primary" />
                  Actionable 4-Week Learning Roadmap
                </h3>
                <div className="prose prose-invert max-w-none text-muted-foreground whitespace-pre-wrap text-sm leading-relaxed">
                  {analysis.learning_roadmap}
                </div>
              </div>
            )}

            {/* Target Company DSA Interview Preparation */}
            {analysis.company_dsa_problems && analysis.company_dsa_problems.length > 0 && (
              <div className="p-6 sm:p-8 rounded-2xl border border-border bg-card shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-4">
                  <div>
                    <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                      <Code2 className="h-5 w-5 text-primary" />
                      Target Company DSA Interview Bank ({analysis.target_company})
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Curated questions mapped from our master DSA bank for {analysis.target_company}.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      navigate('/dsa-tracker', {
                        state: {
                          company: analysis.target_company,
                          role: analysis.target_role,
                          missing_skills: analysis.missing_skills || [],
                        },
                      })
                    }
                    className="rounded-xl text-xs gap-1.5 shrink-0 self-start sm:self-center"
                  >
                    Open Full DSA Tracker <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                  {analysis.company_dsa_problems.map((prob, idx) => {
                    const diff = (prob.difficulty || 'Medium').toLowerCase();
                    const diffBadge =
                      diff === 'easy'
                        ? 'bg-[#0F6E56]/10 text-[#0F6E56] border-[#0F6E56]/20'
                        : diff === 'hard'
                        ? 'bg-[#993C1D]/10 text-[#993C1D] border-[#993C1D]/20'
                        : 'bg-[#BA7517]/10 text-[#BA7517] border-[#BA7517]/20';

                    const practiceUrl = prob.leetcode_url || prob.url || prob.gfg_url;

                    return (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border border-border bg-background hover:border-primary/40 transition-colors shadow-sm flex flex-col justify-between space-y-3"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${diffBadge}`}>
                              {prob.difficulty}
                            </span>
                            <span className="text-[11px] font-mono text-muted-foreground">
                              {prob.topic || 'Algorithms'}
                            </span>
                          </div>
                          <h5 className="font-bold text-sm text-foreground mt-2">{prob.title}</h5>
                          <p className="text-xs text-muted-foreground mt-0.5">Company: {prob.company}</p>
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-border">
                          {practiceUrl && (
                            <a
                              href={practiceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary font-semibold hover:underline inline-flex items-center gap-1"
                            >
                              Practice Problem <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                          {prob.gfg_url && prob.leetcode_url && (
                            <a
                              href={prob.gfg_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-muted-foreground hover:text-foreground font-semibold inline-flex items-center gap-1 ml-auto"
                            >
                              GFG <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
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
            <h3 className="text-lg font-bold tracking-tight mb-4">Previous Career Skill Evaluations</h3>
            <div className="space-y-3">
              {analyses.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setAnalysis(item)}
                  className="p-5 rounded-xl border border-border bg-card hover:border-primary/50 transition-all cursor-pointer flex justify-between items-center shadow-sm"
                >
                  <div>
                    <h4 className="font-bold text-sm text-foreground">
                      {item.target_company} — {item.target_role}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Evaluated on {new Date(item.created_at).toLocaleDateString()} • {item.fallback_used}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-lg font-black font-mono text-primary">
                        {item.match_percentage.toFixed(0)}%
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
