import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import Navbar from '../components/common/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Code2,
  ExternalLink,
  Loader2,
  CheckCircle2,
  Search,
  Building2,
  Sparkles,
  Trophy,
  Filter,
  Flame,
  Percent,
  X,
  ChevronDown,
  TrendingUp,
  Layers,
  Target,
  ShieldCheck,
  Check,
  BarChart3,
  HelpCircle,
} from 'lucide-react';

const PROGRESS_KEY = 'skillgap-dsa-progress-v2';

const REPUTED_CATEGORIES = {
  'FAANG & Big Tech': [
    { slug: 'google', name: 'Google' },
    { slug: 'amazon', name: 'Amazon' },
    { slug: 'meta', name: 'Meta' },
    { slug: 'microsoft', name: 'Microsoft' },
    { slug: 'apple', name: 'Apple' },
    { slug: 'netflix', name: 'Netflix' },
  ],
  'Fintech & Quant': [
    { slug: 'stripe', name: 'Stripe' },
    { slug: 'goldman-sachs', name: 'Goldman Sachs' },
    { slug: 'bloomberg', name: 'Bloomberg' },
    { slug: 'citadel', name: 'Citadel' },
    { slug: 'morgan-stanley', name: 'Morgan Stanley' },
    { slug: 'paypal', name: 'PayPal' },
  ],
  'Top Tech & Unicorns': [
    { slug: 'uber', name: 'Uber' },
    { slug: 'airbnb', name: 'Airbnb' },
    { slug: 'tiktok', name: 'TikTok' },
    { slug: 'snowflake', name: 'Snowflake' },
    { slug: 'databricks', name: 'Databricks' },
    { slug: 'spotify', name: 'Spotify' },
    { slug: 'adobe', name: 'Adobe' },
    { slug: 'salesforce', name: 'Salesforce' },
    { slug: 'palantir-technologies', name: 'Palantir' },
  ],
};

function getStoredProgress() {
  try {
    const s = localStorage.getItem(PROGRESS_KEY);
    return s ? JSON.parse(s) : {};
  } catch {
    return {};
  }
}

function saveStoredProgress(progress) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch (e) {
    console.error('Failed to save DSA progress:', e);
  }
}

export default function DSATracker() {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Navigation target-aware intent
  const navState = location.state || {};
  const targetCompanyFromNav = navState.company || searchParams.get('company') || '';
  const targetRoleFromNav = navState.role || searchParams.get('role') || '';
  const missingSkillsFromNav = navState.missing_skills || [];

  const [problems, setProblems] = useState([]);
  const [recommendedProblems, setRecommendedProblems] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [availableTopics, setAvailableTopics] = useState([]);

  const [selectedCompany, setSelectedCompany] = useState('google');
  const [companySearchInput, setCompanySearchInput] = useState('');
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('FAANG & Big Tech');

  // Filters
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [completionFilter, setCompletionFilter] = useState('all'); // all, solved, unsolved
  const [problemSearchQuery, setProblemSearchQuery] = useState('');

  const [loading, setLoading] = useState(true);
  const [loadingProblems, setLoadingProblems] = useState(false);
  const [loadingRecommended, setLoadingRecommended] = useState(false);
  const [progress, setProgress] = useState(getStoredProgress);

  const dropdownRef = useRef(null);

  // Initialize data and load user progress from Supabase
  useEffect(() => {
    fetchInitialData();
    loadRemoteProgress();
  }, []);

  // Sync target company from navigation when available
  useEffect(() => {
    if (targetCompanyFromNav && companies.length > 0) {
      const slugMatch = targetCompanyFromNav.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const found = companies.find(
        (c) => c.slug === slugMatch || c.name.toLowerCase() === targetCompanyFromNav.toLowerCase()
      );
      if (found) {
        setSelectedCompany(found.slug);
      }
    }
  }, [targetCompanyFromNav, companies]);

  // Fetch company problems when company or difficulty changes
  useEffect(() => {
    if (selectedCompany) {
      fetchProblemsForCompany(selectedCompany);
    }
  }, [selectedCompany, selectedDifficulty]);

  // Fetch target-aware recommendations if company or role is specified
  useEffect(() => {
    if (targetCompanyFromNav || targetRoleFromNav) {
      fetchTargetRecommendations();
    }
  }, [targetCompanyFromNav, targetRoleFromNav]);

  // Close company dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsCompanyDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadRemoteProgress = async () => {
    try {
      const res = await api.get('/career/dsa/progress');
      if (res.data && res.data.solved_ids) {
        const remoteMap = {};
        res.data.solved_ids.forEach((id) => {
          remoteMap[id] = true;
        });
        setProgress((prev) => {
          const merged = { ...prev, ...remoteMap };
          saveStoredProgress(merged);
          return merged;
        });
      }
    } catch {
      // Local storage fallback continues to work
    }
  };

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [compRes, topicsRes] = await Promise.allSettled([
        api.get('/career/dsa/companies'),
        api.get('/career/dsa/topics'),
      ]);

      const compList = compRes.status === 'fulfilled' ? compRes.value.data || [] : [];
      setCompanies(compList);

      if (topicsRes.status === 'fulfilled' && topicsRes.value.data) {
        setAvailableTopics(topicsRes.value.data.topics || []);
      }

      const initialComp = targetCompanyFromNav
        ? targetCompanyFromNav.toLowerCase().replace(/[^a-z0-9]+/g, '-')
        : compList.length > 0
        ? compList[0].slug
        : 'google';

      setSelectedCompany(initialComp);
      await fetchProblemsForCompany(initialComp);
    } catch (err) {
      console.error('Failed to load DSA metadata:', err);
      toast.error('Failed to load master DSA question bank.');
    } finally {
      setLoading(false);
    }
  };

  const fetchProblemsForCompany = async (companySlug) => {
    setLoadingProblems(true);
    try {
      const res = await api.get('/career/dsa/problems', {
        params: {
          company: companySlug,
          difficulty: selectedDifficulty !== 'all' ? selectedDifficulty : undefined,
          limit: 300,
        },
      });
      setProblems(res.data || []);
    } catch (err) {
      console.error('Failed to load company problems:', err);
    } finally {
      setLoadingProblems(false);
    }
  };

  const fetchTargetRecommendations = async () => {
    setLoadingRecommended(true);
    try {
      const res = await api.get('/career/dsa/recommended', {
        params: {
          target_company: targetCompanyFromNav || undefined,
          target_role: targetRoleFromNav || undefined,
          missing_skills: missingSkillsFromNav.length ? missingSkillsFromNav.join(',') : undefined,
          limit: 15,
        },
      });
      setRecommendedProblems(res.data.recommended || []);
    } catch (err) {
      console.error('Failed to load target recommendations:', err);
    } finally {
      setLoadingRecommended(false);
    }
  };

  // Toggle solved status with Supabase persistence
  const toggleProblem = async (problemId, problemTitle = '', companySlug = '', difficulty = '') => {
    const nextSolved = !progress[problemId];
    const next = { ...progress, [problemId]: nextSolved };
    setProgress(next);
    saveStoredProgress(next);

    try {
      await api.post('/career/dsa/progress', {
        problem_id: String(problemId),
        problem_title: problemTitle,
        company_slug: companySlug || selectedCompany,
        difficulty: difficulty || 'Medium',
        solved: nextSolved,
      });
      if (nextSolved) {
        toast.success(`Marked "${problemTitle || `Problem #${problemId}`}" as solved! 🎉`);
      } else {
        toast.info(`Unmarked "${problemTitle || `Problem #${problemId}`}".`);
      }
    } catch {
      // Progress preserved locally
    }
  };

  // Filtered companies based on search input
  const filteredCompanySuggestions = useMemo(() => {
    if (!companySearchInput.trim()) return companies.slice(0, 50);
    const q = companySearchInput.toLowerCase().trim();
    return companies
      .filter((c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q))
      .slice(0, 50);
  }, [companies, companySearchInput]);

  const selectCompanyHandler = (slug, name) => {
    setSelectedCompany(slug);
    setCompanySearchInput('');
    setIsCompanyDropdownOpen(false);
    toast.info(`Loaded questions for ${name || slug}`);
  };

  // Filtered problem list
  const filteredProblems = useMemo(() => {
    return problems.filter((p) => {
      // Search query
      if (problemSearchQuery.trim()) {
        const q = problemSearchQuery.toLowerCase().trim();
        const matchesTitle = p.title?.toLowerCase().includes(q);
        const matchesId = String(p.id).toLowerCase().includes(q);
        if (!matchesTitle && !matchesId) return false;
      }

      // Topic filter
      if (selectedTopic !== 'all') {
        const pTopic = (p.topic || '').toLowerCase();
        if (pTopic !== selectedTopic.toLowerCase()) return false;
      }

      // Completion filter
      const isSolved = !!progress[p.id];
      if (completionFilter === 'solved' && !isSolved) return false;
      if (completionFilter === 'unsolved' && isSolved) return false;

      return true;
    });
  }, [problems, problemSearchQuery, selectedTopic, completionFilter, progress]);

  // Overall & Company Statistics
  const currentCompanyMeta = useMemo(() => {
    return (
      companies.find((c) => c.slug === selectedCompany) || {
        name: selectedCompany.replace('-', ' ').toUpperCase(),
        count: problems.length,
      }
    );
  }, [companies, selectedCompany, problems]);

  const stats = useMemo(() => {
    const totalCompany = problems.length;
    const solvedCompany = problems.filter((p) => progress[p.id]).length;
    const unsolvedCompany = totalCompany - solvedCompany;
    const completionRate = totalCompany > 0 ? Math.round((solvedCompany / totalCompany) * 100) : 0;

    const easyProblems = problems.filter((p) => p.difficulty?.toLowerCase() === 'easy');
    const easySolved = easyProblems.filter((p) => progress[p.id]).length;

    const mediumProblems = problems.filter((p) => p.difficulty?.toLowerCase() === 'medium');
    const mediumSolved = mediumProblems.filter((p) => progress[p.id]).length;

    const hardProblems = problems.filter((p) => p.difficulty?.toLowerCase() === 'hard');
    const hardSolved = hardProblems.filter((p) => progress[p.id]).length;

    const totalSolvedOverall = Object.values(progress).filter(Boolean).length;

    return {
      totalCompany,
      solvedCompany,
      unsolvedCompany,
      completionRate,
      easyTotal: easyProblems.length,
      easySolved,
      mediumTotal: mediumProblems.length,
      mediumSolved,
      hardTotal: hardProblems.length,
      hardSolved,
      totalSolvedOverall,
    };
  }, [problems, progress]);

  const getDifficultyBadge = (diff) => {
    switch (diff?.toLowerCase()) {
      case 'easy':
        return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500';
      case 'medium':
        return 'bg-amber-500/10 border-amber-500/30 text-amber-500';
      case 'hard':
        return 'bg-rose-500/10 border-rose-500/30 text-rose-500';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Target-Aware Recommendation Banner (if coming from Career Readiness) */}
        {(targetCompanyFromNav || targetRoleFromNav) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-3xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-card backdrop-blur-xl shadow-lg space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary text-primary-foreground text-[10px] font-bold uppercase">
                    <Target className="h-3 w-3 mr-1 inline" /> Targeted Career Roadmap Active
                  </Badge>
                  <span className="text-xs text-muted-foreground">Authentic Provenance Linked</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-foreground">
                  Targeted DSA Preparation for{' '}
                  <span className="text-primary">{targetCompanyFromNav || 'Top Tech'}</span>
                  {targetRoleFromNav && ` (${targetRoleFromNav})`}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Questions mapped directly to verified interview tags for {targetCompanyFromNav} from our 3,310 master problem dataset.
                </p>
              </div>

              {recommendedProblems.length > 0 && (
                <div className="px-4 py-2 rounded-xl bg-background/80 border border-border text-center shrink-0">
                  <div className="text-lg font-black font-mono text-primary">
                    {recommendedProblems.filter((p) => progress[p.id]).length} / {recommendedProblems.length}
                  </div>
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">Target Ready</div>
                </div>
              )}
            </div>

            {/* Target Curated Questions Cards */}
            {recommendedProblems.length > 0 && (
              <div className="pt-2 border-t border-border/40">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" /> Curated High-Frequency Target Problems
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {recommendedProblems.slice(0, 6).map((prob) => {
                    const isSolved = !!progress[prob.id];
                    return (
                      <div
                        key={prob.id}
                        className={`p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
                          isSolved
                            ? 'bg-primary/5 border-primary/40'
                            : 'bg-card border-border hover:border-primary/30'
                        }`}
                      >
                        <Checkbox
                          checked={isSolved}
                          onCheckedChange={() =>
                            toggleProblem(prob.id, prob.title, prob.company_tag || targetCompanyFromNav, prob.difficulty)
                          }
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getDifficultyBadge(prob.difficulty)}`}>
                              {prob.difficulty}
                            </span>
                            <span className="text-[10px] font-semibold text-emerald-500 flex items-center gap-0.5">
                              <ShieldCheck className="h-3 w-3" />
                              {prob.is_company_tagged ? `Verified (${prob.company_tag})` : 'Recommended'}
                            </span>
                          </div>
                          <div className={`text-xs font-bold mt-1.5 truncate ${isSolved ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                            {prob.title}
                          </div>
                          <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
                            <span>{prob.topic || 'Algorithms'}</span>
                            {prob.url && (
                              <a
                                href={prob.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline font-semibold flex items-center gap-0.5"
                              >
                                LeetCode <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Header Hero Banner */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-8 rounded-3xl glass-card border border-border bg-gradient-to-br from-card/90 via-card/50 to-background/50 backdrop-blur-xl shadow-xl space-y-6"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-primary/20 bg-primary/10 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" /> 3,310+ LeetCode Questions Across 660+ Verified Tech Employers
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Company-Specific DSA Question Bank & Progress Tracker
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Master verified algorithmic interview questions asked by top tech giants. Real data provenance preserved directly from company interview rounds.
              </p>
            </div>

            {/* Overall Progress Counter */}
            <div className="flex items-center gap-4 bg-muted/40 p-4 sm:p-5 rounded-2xl border border-border shrink-0">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-primary to-emerald-500 text-white flex items-center justify-center shadow-lg shadow-primary/20">
                <Trophy className="h-6 w-6" />
              </div>
              <div>
                <div className="text-2xl font-black font-mono text-foreground">
                  {stats.solvedCompany}{' '}
                  <span className="text-sm font-normal text-muted-foreground">/ {stats.totalCompany}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Solved for <span className="font-semibold text-foreground">{currentCompanyMeta.name}</span>
                  <span className="ml-2 font-mono text-primary font-bold">({stats.completionRate}%)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Progress Visualizations */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-border/50">
            {/* Overall Company Progress Bar */}
            <div className="p-4 rounded-2xl border border-border bg-card/60 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-foreground">Company Mastery</span>
                <span className="font-mono font-bold text-primary">{stats.completionRate}%</span>
              </div>
              <Progress value={stats.completionRate} className="h-2 rounded-full" />
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>{stats.solvedCompany} solved</span>
                <span>{stats.unsolvedCompany} remaining</span>
              </div>
            </div>

            {/* Easy Progress */}
            <div className="p-4 rounded-2xl border border-border bg-card/60 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-emerald-500">Easy</span>
                <span className="font-mono text-xs">
                  {stats.easySolved} / {stats.easyTotal}
                </span>
              </div>
              <Progress
                value={stats.easyTotal > 0 ? (stats.easySolved / stats.easyTotal) * 100 : 0}
                className="h-2 rounded-full bg-emerald-500/10 [&>div]:bg-emerald-500"
              />
              <div className="text-[11px] text-muted-foreground">
                {stats.easyTotal > 0 ? Math.round((stats.easySolved / stats.easyTotal) * 100) : 0}% completed
              </div>
            </div>

            {/* Medium Progress */}
            <div className="p-4 rounded-2xl border border-border bg-card/60 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-amber-500">Medium</span>
                <span className="font-mono text-xs">
                  {stats.mediumSolved} / {stats.mediumTotal}
                </span>
              </div>
              <Progress
                value={stats.mediumTotal > 0 ? (stats.mediumSolved / stats.mediumTotal) * 100 : 0}
                className="h-2 rounded-full bg-amber-500/10 [&>div]:bg-amber-500"
              />
              <div className="text-[11px] text-muted-foreground">
                {stats.mediumTotal > 0 ? Math.round((stats.mediumSolved / stats.mediumTotal) * 100) : 0}% completed
              </div>
            </div>

            {/* Hard Progress */}
            <div className="p-4 rounded-2xl border border-border bg-card/60 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-rose-500">Hard</span>
                <span className="font-mono text-xs">
                  {stats.hardSolved} / {stats.hardTotal}
                </span>
              </div>
              <Progress
                value={stats.hardTotal > 0 ? (stats.hardSolved / stats.hardTotal) * 100 : 0}
                className="h-2 rounded-full bg-rose-500/10 [&>div]:bg-rose-500"
              />
              <div className="text-[11px] text-muted-foreground">
                {stats.hardTotal > 0 ? Math.round((stats.hardSolved / stats.hardTotal) * 100) : 0}% completed
              </div>
            </div>
          </div>

          {/* Company Search Bar Section */}
          <div className="pt-2 border-t border-border/50 space-y-4">
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
              {/* Dedicated Company Searchbar with Autocomplete */}
              <div className="relative flex-1" ref={dropdownRef}>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-3.5 h-4 w-4 text-primary" />
                  <Input
                    placeholder="Search any company (e.g. Google, Amazon, Stripe, Databricks, Citadel, Microsoft)..."
                    value={companySearchInput}
                    onChange={(e) => {
                      setCompanySearchInput(e.target.value);
                      setIsCompanyDropdownOpen(true);
                    }}
                    onFocus={() => setIsCompanyDropdownOpen(true)}
                    className="pl-10 pr-10 py-5 rounded-xl bg-background border-border shadow-inner text-sm font-medium"
                  />
                  {companySearchInput && (
                    <button
                      onClick={() => setCompanySearchInput('')}
                      className="absolute right-3.5 top-3.5 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Dropdown Suggestions List */}
                <AnimatePresence>
                  {isCompanyDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="absolute z-50 left-0 right-0 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl p-2 space-y-1"
                    >
                      <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40">
                        Select from {companies.length} Companies
                      </div>

                      {filteredCompanySuggestions.length === 0 ? (
                        <div className="p-4 text-center text-xs text-muted-foreground">
                          No matching company found.
                        </div>
                      ) : (
                        filteredCompanySuggestions.map((comp) => {
                          const isSelected = selectedCompany === comp.slug;
                          return (
                            <button
                              key={comp.slug}
                              onClick={() => selectCompanyHandler(comp.slug, comp.name)}
                              className={`w-full px-3.5 py-2.5 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-all ${
                                isSelected
                                  ? 'bg-primary text-primary-foreground font-bold'
                                  : 'text-foreground hover:bg-muted/70'
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                <Building2 className="h-3.5 w-3.5 opacity-70" />
                                {comp.name}
                              </span>
                              <span
                                className={`text-[11px] px-2 py-0.5 rounded-md font-mono ${
                                  isSelected
                                    ? 'bg-primary-foreground/20 text-primary-foreground'
                                    : 'bg-muted text-muted-foreground'
                                }`}
                              >
                                {comp.count} questions
                              </span>
                            </button>
                          );
                        })
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Active Company Pill Display */}
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
                <Building2 className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold text-foreground">{currentCompanyMeta.name}</span>
                <span className="text-[11px] font-mono text-primary font-bold">
                  ({problems.length} questions)
                </span>
              </div>
            </div>

            {/* Quick Category Tabs */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
                {Object.keys(REPUTED_CATEGORIES).map((catName) => (
                  <button
                    key={catName}
                    onClick={() => setActiveCategory(catName)}
                    className={`px-3 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap ${
                      activeCategory === catName
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/40 hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    {catName}
                  </button>
                ))}
              </div>

              {/* Quick Company Badges for selected category */}
              <div className="flex flex-wrap gap-2 pt-1">
                {REPUTED_CATEGORIES[activeCategory]?.map((comp) => {
                  const isSelected = selectedCompany === comp.slug;
                  return (
                    <button
                      key={comp.slug}
                      onClick={() => selectCompanyHandler(comp.slug, comp.name)}
                      className={`text-xs px-3 py-1.5 rounded-xl border transition-all font-medium flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-primary text-primary-foreground border-primary font-bold shadow-sm'
                          : 'bg-card hover:bg-muted text-muted-foreground hover:text-foreground border-border'
                      }`}
                    >
                      {comp.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Filters and Search Bar for Problems */}
        <div className="p-5 rounded-2xl border border-border bg-card/60 backdrop-blur-md shadow-sm space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
            {/* Search Input */}
            <div className="relative lg:col-span-4">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search problem title or #ID..."
                value={problemSearchQuery}
                onChange={(e) => setProblemSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 text-xs bg-background rounded-xl border-border"
              />
            </div>

            {/* Topic Filter */}
            <div className="lg:col-span-3">
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All Algorithmic Topics</option>
                {availableTopics.map((topic) => (
                  <option key={topic} value={topic}>
                    {topic}
                  </option>
                ))}
              </select>
            </div>

            {/* Difficulty Filter */}
            <div className="lg:col-span-3">
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All Difficulties</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            {/* Completion Status Filter */}
            <div className="lg:col-span-2">
              <select
                value={completionFilter}
                onChange={(e) => setCompletionFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">Status: All</option>
                <option value="solved">Status: Solved</option>
                <option value="unsolved">Status: Unsolved</option>
              </select>
            </div>
          </div>
        </div>

        {/* Problems List Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <Code2 className="h-4 w-4 text-primary" />
              Verified LeetCode Questions for {currentCompanyMeta.name}
            </h3>
            <span className="text-xs text-muted-foreground font-mono">
              Showing {filteredProblems.length} of {problems.length} problems
            </span>
          </div>

          {loadingProblems ? (
            <div className="py-20 text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-xs text-muted-foreground">Loading company questions from master bank...</p>
            </div>
          ) : filteredProblems.length === 0 ? (
            <div className="text-center py-16 p-8 rounded-3xl border border-border bg-card max-w-md mx-auto space-y-3">
              <Code2 className="h-10 w-10 mx-auto text-muted-foreground/60" />
              <h4 className="text-base font-bold text-foreground">No questions match your filter criteria</h4>
              <p className="text-xs text-muted-foreground">
                Try selecting "All Difficulties" or clearing the topic filter.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedDifficulty('all');
                  setSelectedTopic('all');
                  setCompletionFilter('all');
                  setProblemSearchQuery('');
                }}
                className="rounded-xl text-xs"
              >
                Reset All Filters
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredProblems.map((prob, idx) => {
                const isSolved = !!progress[prob.id];
                const practiceUrl = prob.leetcode_url || prob.url || `https://leetcode.com/problems/${prob.slug || prob.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/`;

                return (
                  <motion.div
                    key={prob.id || idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.02, 0.3) }}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isSolved
                        ? 'bg-primary/5 border-primary/30 shadow-sm'
                        : 'bg-card border-border hover:border-primary/40 shadow-sm'
                    }`}
                  >
                    {/* Left: Checkbox & Problem Info */}
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      <Checkbox
                        checked={isSolved}
                        onCheckedChange={() =>
                          toggleProblem(prob.id, prob.title, selectedCompany, prob.difficulty)
                        }
                        className="mt-1 shrink-0"
                      />

                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-bold text-muted-foreground">
                            #{prob.id}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getDifficultyBadge(
                              prob.difficulty
                            )}`}
                          >
                            {prob.difficulty}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                            {prob.topic || 'Algorithms'}
                          </span>
                          <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/20 bg-emerald-500/5">
                            <ShieldCheck className="h-3 w-3 mr-1 inline" />
                            Asked at {currentCompanyMeta.name}
                          </Badge>
                        </div>

                        <h4
                          className={`text-sm sm:text-base font-bold truncate ${
                            isSolved ? 'line-through text-muted-foreground' : 'text-foreground'
                          }`}
                        >
                          {prob.title}
                        </h4>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {prob.acceptance && (
                            <span className="flex items-center gap-1">
                              <Percent className="h-3 w-3" /> Acceptance: {prob.acceptance}
                            </span>
                          )}
                          {prob.frequency && (
                            <span className="flex items-center gap-1 text-primary font-medium">
                              <Flame className="h-3 w-3" /> Frequency: {prob.frequency}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <Button
                        size="sm"
                        variant={isSolved ? 'outline' : 'default'}
                        onClick={() =>
                          toggleProblem(prob.id, prob.title, selectedCompany, prob.difficulty)
                        }
                        className="rounded-xl text-xs font-semibold gap-1.5"
                      >
                        {isSolved ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-500" /> Solved
                          </>
                        ) : (
                          'Mark Solved'
                        )}
                      </Button>

                      {practiceUrl && (
                        <Button
                          asChild
                          size="sm"
                          variant="ghost"
                          className="rounded-xl text-xs font-semibold gap-1 text-primary hover:text-primary"
                        >
                          <a href={practiceUrl} target="_blank" rel="noopener noreferrer">
                            LeetCode <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
