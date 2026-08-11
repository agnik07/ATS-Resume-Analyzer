import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import Navbar from '../components/common/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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

function saveProgress(progress) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch (e) {
    console.error('Failed to save DSA progress:', e);
  }
}

export default function DSATracker() {
  const [problems, setProblems] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('google');
  const [companySearchInput, setCompanySearchInput] = useState('');
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('FAANG & Big Tech');

  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [problemSearchQuery, setProblemSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingProblems, setLoadingProblems] = useState(false);
  const [progress, setProgress] = useState(getStoredProgress);

  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      fetchProblemsForCompany(selectedCompany);
    }
  }, [selectedCompany, selectedDifficulty]);

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

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const compRes = await api.get('/career/dsa/companies');
      const compList = compRes.data || [];
      setCompanies(compList);

      const initialComp = compList.length > 0 ? compList[0].slug : 'google';
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

  // Filtered problem list based on search query
  const filteredProblems = useMemo(() => {
    if (!problemSearchQuery.trim()) return problems;
    const q = problemSearchQuery.toLowerCase().trim();
    return problems.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        String(p.id).toLowerCase().includes(q)
    );
  }, [problems, problemSearchQuery]);

  const toggleProblem = (id) => {
    const next = { ...progress, [id]: !progress[id] };
    setProgress(next);
    saveProgress(next);
    if (!progress[id]) {
      toast.success('Problem marked as solved! 🎉');
    }
  };

  const solvedForCurrentCompany = useMemo(() => {
    return problems.filter((p) => progress[p.id]).length;
  }, [problems, progress]);

  const totalSolvedOverall = Object.values(progress).filter(Boolean).length;

  const currentCompanyMeta = useMemo(() => {
    return companies.find((c) => c.slug === selectedCompany) || {
      name: selectedCompany.replace('-', ' ').toUpperCase(),
      count: problems.length,
    };
  }, [companies, selectedCompany, problems]);

  const difficultyCounts = useMemo(() => {
    return {
      easy: problems.filter((p) => p.difficulty?.toLowerCase() === 'easy').length,
      medium: problems.filter((p) => p.difficulty?.toLowerCase() === 'medium').length,
      hard: problems.filter((p) => p.difficulty?.toLowerCase() === 'hard').length,
    };
  }, [problems]);

  const getDifficultyBadge = (diff) => {
    switch (diff?.toLowerCase()) {
      case 'easy':
        return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500';
      case 'medium':
        return 'bg-amber-500/10 border-amber-500/20 text-amber-500';
      case 'hard':
        return 'bg-rose-500/10 border-rose-500/20 text-rose-500';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header Banner */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-8 rounded-3xl glass-card border border-border bg-gradient-to-br from-card/90 via-card/50 to-background/50 backdrop-blur-xl shadow-xl space-y-6"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-primary/20 bg-primary/10 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" /> 3,300+ LeetCode Questions Across 660+ Companies
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Company-Specific DSA Preparation Bank
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Practice real coding interview questions asked by top tech employers. Filter by company frequency, search by question name/number, and track your progress.
              </p>
            </div>

            {/* Solved Progress Stats */}
            <div className="flex items-center gap-4 bg-muted/40 p-4 sm:p-5 rounded-2xl border border-border shrink-0">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-primary to-emerald-500 text-white flex items-center justify-center shadow-lg shadow-primary/20">
                <Trophy className="h-6 w-6" />
              </div>
              <div>
                <div className="text-2xl font-black font-mono text-foreground">
                  {solvedForCurrentCompany}{' '}
                  <span className="text-sm font-normal text-muted-foreground">/ {problems.length}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Solved for <span className="font-semibold text-foreground">{currentCompanyMeta.name}</span>
                </div>
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
                    placeholder="Search any company (e.g. Google, Stripe, Databricks, Citadel, Goldman Sachs)..."
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
                <span className="text-xs font-semibold text-primary">Active:</span>
                <span className="text-xs font-bold text-foreground">{currentCompanyMeta.name}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/20 text-primary font-bold">
                  {problems.length} Qs
                </span>
              </div>
            </div>

            {/* Reputed Company Category Tabs */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-3 border-b border-border/40 pb-2">
                {Object.keys(REPUTED_CATEGORIES).map((category) => (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`text-xs font-bold transition-colors pb-1 border-b-2 -mb-2.5 ${
                      activeCategory === category
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>

              {/* Category Quick-Pick Pills */}
              <div className="flex flex-wrap gap-2 pt-2">
                {REPUTED_CATEGORIES[activeCategory]?.map((comp) => {
                  const isActive = selectedCompany === comp.slug;
                  return (
                    <button
                      key={comp.slug}
                      onClick={() => selectCompanyHandler(comp.slug, comp.name)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border ${
                        isActive
                          ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20 font-bold'
                          : 'bg-card/80 text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
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

        {/* Breakdown Badges Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl border border-border bg-card flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground font-medium">Total Questions</div>
              <div className="text-xl font-bold font-mono text-foreground">{problems.length}</div>
            </div>
            <Layers className="h-5 w-5 text-primary" />
          </div>

          <div className="p-4 rounded-2xl border border-border bg-card flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground font-medium">Easy Problems</div>
              <div className="text-xl font-bold font-mono text-emerald-500">{difficultyCounts.easy}</div>
            </div>
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
          </div>

          <div className="p-4 rounded-2xl border border-border bg-card flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground font-medium">Medium Problems</div>
              <div className="text-xl font-bold font-mono text-amber-500">{difficultyCounts.medium}</div>
            </div>
            <div className="h-2 w-2 rounded-full bg-amber-500" />
          </div>

          <div className="p-4 rounded-2xl border border-border bg-card flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground font-medium">Hard Problems</div>
              <div className="text-xl font-bold font-mono text-rose-500">{difficultyCounts.hard}</div>
            </div>
            <div className="h-2 w-2 rounded-full bg-rose-500" />
          </div>
        </div>

        {/* Problem Search & Difficulty Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl border border-border bg-card">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${currentCompanyMeta.name} problems by title or # ID...`}
              value={problemSearchQuery}
              onChange={(e) => setProblemSearchQuery(e.target.value)}
              className="pl-10 bg-background"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1 shrink-0">
              <Filter className="h-3.5 w-3.5" /> Difficulty:
            </span>
            {['all', 'Easy', 'Medium', 'Hard'].map((diff) => (
              <button
                key={diff}
                onClick={() => setSelectedDifficulty(diff)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border shrink-0 ${
                  selectedDifficulty === diff
                    ? 'bg-primary/20 text-primary border-primary/40 font-bold'
                    : 'bg-muted/40 text-muted-foreground border-transparent hover:text-foreground'
                }`}
              >
                {diff.charAt(0).toUpperCase() + diff.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Problems List */}
        {loading || loadingProblems ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Loading interview questions for {currentCompanyMeta.name}...</p>
          </div>
        ) : filteredProblems.length === 0 ? (
          <div className="p-16 text-center border border-dashed border-border rounded-2xl bg-card/40 space-y-3">
            <Code2 className="h-10 w-10 text-muted-foreground mx-auto" />
            <h3 className="text-lg font-bold text-foreground">No questions found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              No DSA questions matched your filters for {currentCompanyMeta.name}. Try selecting a different difficulty or search term.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs text-muted-foreground px-2 font-medium">
              <span>Showing {filteredProblems.length} curated problems for {currentCompanyMeta.name}</span>
              <span>Overall Bank: {totalSolvedOverall} solved across all companies</span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {filteredProblems.map((prob) => {
                const isSolved = !!progress[prob.id];
                return (
                  <motion.div
                    key={prob.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isSolved
                        ? 'bg-emerald-500/5 border-emerald-500/30'
                        : 'bg-card hover:border-primary/40 border-border shadow-sm'
                    }`}
                  >
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                      <Checkbox
                        id={`check-${prob.id}`}
                        checked={isSolved}
                        onCheckedChange={() => toggleProblem(prob.id)}
                        className="mt-1 sm:mt-0"
                      />
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-bold text-muted-foreground">
                            #{prob.id}
                          </span>
                          <span
                            className={`font-semibold text-sm truncate ${
                              isSolved ? 'line-through text-muted-foreground' : 'text-foreground'
                            }`}
                          >
                            {prob.title}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md border text-[11px] font-bold ${getDifficultyBadge(
                              prob.difficulty
                            )}`}
                          >
                            {prob.difficulty}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          {prob.frequency && (
                            <span className="inline-flex items-center gap-1 text-amber-400 font-medium">
                              <Flame className="h-3.5 w-3.5" /> {prob.frequency} Frequency
                            </span>
                          )}
                          {prob.acceptance && (
                            <span className="inline-flex items-center gap-1 font-medium">
                              <Percent className="h-3 w-3" /> {prob.acceptance} Acceptance
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                        className="rounded-xl gap-1.5 text-xs hover:border-primary hover:text-primary font-medium"
                      >
                        <a href={prob.url} target="_blank" rel="noopener noreferrer">
                          Solve on LeetCode
                          <ExternalLink className="h-3.5 w-3.5 ml-0.5" />
                        </a>
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
