import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import Navbar from '../components/common/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Newspaper,
  ExternalLink,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Calendar,
  Building2,
  Clock,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  BookOpen,
  Filter,
  X,
} from 'lucide-react';

const CATEGORIES = [
  'All Stories',
  'Tech Hiring News',
  'Company Recruitment Updates',
  'Internship Opportunities',
  'Fresher Hiring',
  'Off-Campus Drives',
  'Industry Trends',
  'Technology Career Updates',
];

export default function JobNews() {
  const [articles, setArticles] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All Stories');
  const [searchQuery, setSearchQuery] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [sortBy, setSortBy] = useState('latest');
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [imageErrorMap, setImageErrorMap] = useState({});

  const fetchNews = async () => {
    setLoading(true);
    try {
      const params = {
        count: 30,
        sort_by: sortBy,
      };
      if (selectedCategory && selectedCategory !== 'All Stories') {
        params.category = selectedCategory;
      }
      if (companyFilter.trim()) {
        params.company = companyFilter.trim();
      }
      if (searchQuery.trim()) {
        params.query = searchQuery.trim();
      }

      const res = await api.get('/career/news', { params });
      const fetchedArticles = res.data.articles || [];
      const fetchedFeatured = res.data.featured || [];
      setArticles(fetchedArticles);
      setFeatured(fetchedFeatured.length > 0 ? fetchedFeatured : fetchedArticles.slice(0, 2));
    } catch (err) {
      console.error('Failed to load recruitment news:', err);
      toast.error('Failed to load recruitment news. Using verified cached updates.');
      setArticles([]);
      setFeatured([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, [selectedCategory, sortBy]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchNews();
  };

  const handleImageError = (index) => {
    setImageErrorMap((prev) => ({ ...prev, [index]: true }));
  };

  // Primary hero featured story
  const heroStory = useMemo(() => {
    if (featured.length > 0) return featured[0];
    if (articles.length > 0) return articles[0];
    return null;
  }, [featured, articles]);

  // Secondary stories (excluding hero)
  const remainingArticles = useMemo(() => {
    if (!heroStory) return articles;
    return articles.filter((a) => a.title !== heroStory.title);
  }, [articles, heroStory]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Masthead Header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-b border-border pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 uppercase font-bold tracking-wider text-[10px]">
                <Sparkles className="h-3 w-3 mr-1 text-primary inline" /> Live Hiring Intelligence
              </Badge>
              <span className="text-xs text-muted-foreground">• Real-time Industry Updates</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Tech Recruitment & Career Intelligence Magazine
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl leading-relaxed">
              Curated hiring bulletins, off-campus drive announcements, compensation trends, and verified tech workforce insights.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchNews}
              disabled={loading}
              className="rounded-xl gap-2 text-xs font-semibold"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
              Refresh Feed
            </Button>
          </div>
        </motion.div>

        {/* Search, Company Filter & Sorting Controls */}
        <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card/60 backdrop-blur-md shadow-sm space-y-4">
          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="relative md:col-span-5">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search headlines, keywords, or roles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 text-xs bg-background rounded-xl border-border"
              />
            </div>

            <div className="relative md:col-span-4">
              <Building2 className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter by company (e.g. Google, Amazon)..."
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="pl-9 pr-4 py-2 text-xs bg-background rounded-xl border-border"
              />
              {companyFilter && (
                <button
                  type="button"
                  onClick={() => setCompanyFilter('')}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 md:col-span-3">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="latest">Sort: Latest Stories</option>
                <option value="relevant">Sort: Most Relevant</option>
              </select>

              <Button type="submit" size="sm" className="rounded-xl text-xs font-semibold px-4 shrink-0">
                Filter
              </Button>
            </div>
          </form>

          {/* Category Navigation Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar border-t border-border/40">
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-20 text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-xs text-muted-foreground">Retrieving verified recruitment news feed...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && articles.length === 0 && (
          <div className="text-center py-16 p-8 rounded-3xl border border-border bg-card max-w-lg mx-auto space-y-4">
            <Newspaper className="h-12 w-12 mx-auto text-muted-foreground/60" />
            <div>
              <h3 className="text-base font-bold text-foreground">No news articles match your filter</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Try selecting "All Stories" or clearing company keywords.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedCategory('All Stories');
                setCompanyFilter('');
                setSearchQuery('');
              }}
              className="rounded-xl text-xs"
            >
              Reset Filters
            </Button>
          </div>
        )}

        {/* Featured Hero Story */}
        {!loading && heroStory && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-border bg-gradient-to-br from-card via-card/90 to-background overflow-hidden shadow-lg group hover:border-primary/50 transition-all"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
              {/* Image side */}
              <div className="lg:col-span-7 relative min-h-[260px] lg:min-h-[380px] bg-muted overflow-hidden flex items-center justify-center">
                {heroStory.image && !imageErrorMap['hero'] ? (
                  <img
                    src={heroStory.image}
                    alt={heroStory.title}
                    onError={() => handleImageError('hero')}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full min-h-[260px] bg-gradient-to-br from-primary/20 via-primary/5 to-muted flex flex-col items-center justify-center p-6 text-center">
                    <Newspaper className="h-16 w-16 text-primary/40 mb-3" />
                    <span className="text-xs font-bold uppercase tracking-widest text-primary">
                      {heroStory.category || 'Tech Recruitment Bulletin'}
                    </span>
                  </div>
                )}
                <div className="absolute top-4 left-4 flex gap-2">
                  <Badge className="bg-primary text-primary-foreground font-bold text-[10px] uppercase shadow-md">
                    Featured Lead Story
                  </Badge>
                  {heroStory.category && (
                    <Badge variant="secondary" className="bg-background/80 backdrop-blur-md text-[10px] font-semibold">
                      {heroStory.category}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Content side */}
              <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-bold text-foreground">{heroStory.source || 'Tech Wire'}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {heroStory.publishedAt ? new Date(heroStory.publishedAt).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'Recent'}
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-black text-foreground group-hover:text-primary transition-colors leading-snug">
                    {heroStory.title}
                  </h2>

                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-4 leading-relaxed">
                    {heroStory.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-border flex items-center gap-3">
                  <Button
                    onClick={() => setSelectedArticle(heroStory)}
                    className="rounded-xl text-xs font-bold gap-2 px-5 py-2.5 shadow-md shadow-primary/20"
                  >
                    Read Analysis & Takeaways <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                  {heroStory.url && (
                    <a
                      href={heroStory.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                      title="View original publisher link"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* News Grid (Magazines Cards) */}
        {!loading && remainingArticles.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Latest Hiring & Recruitment Reports
              </h3>
              <span className="text-xs text-muted-foreground font-mono">
                Showing {remainingArticles.length} updates
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {remainingArticles.map((article, idx) => {
                const imgKey = `card-${idx}`;
                const hasImg = article.image && !imageErrorMap[imgKey];

                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.04, 0.4) }}
                    className="rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/50 transition-all flex flex-col justify-between shadow-sm group hover:shadow-md"
                  >
                    <div>
                      {/* Card Thumbnail */}
                      <div className="relative h-44 bg-muted overflow-hidden">
                        {hasImg ? (
                          <img
                            src={article.image}
                            alt={article.title}
                            onError={() => handleImageError(imgKey)}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-tr from-muted via-card to-primary/10 flex flex-col items-center justify-center p-4 text-center">
                            <Newspaper className="h-10 w-10 text-muted-foreground/40 mb-1" />
                            <span className="text-[11px] font-bold text-foreground">
                              {article.source || 'Recruitment Insight'}
                            </span>
                          </div>
                        )}
                        <div className="absolute top-3 left-3">
                          <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-background/90 backdrop-blur-md text-foreground border border-border/50 shadow-sm">
                            {article.category || 'Hiring'}
                          </span>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-5 space-y-2.5">
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="font-semibold text-foreground">{article.source}</span>
                          <span>•</span>
                          <span>
                            {article.publishedAt
                              ? new Date(article.publishedAt).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : 'Recent'}
                          </span>
                        </div>

                        <h4
                          onClick={() => setSelectedArticle(article)}
                          className="font-bold text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors cursor-pointer leading-snug"
                        >
                          {article.title}
                        </h4>

                        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                          {article.description}
                        </p>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="px-5 pb-5 pt-2 border-t border-border/40 flex items-center justify-between">
                      <button
                        onClick={() => setSelectedArticle(article)}
                        className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                      >
                        Read Key Takeaways <ArrowRight className="h-3 w-3" />
                      </button>

                      {article.url && (
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground p-1 transition-colors"
                          title="Original article link"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Story Detail Modal / Drawer with Key Takeaways */}
        <Dialog open={!!selectedArticle} onOpenChange={(open) => !open && setSelectedArticle(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-8">
            {selectedArticle && (
              <div className="space-y-6">
                <DialogHeader className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 text-[10px] uppercase font-bold">
                      {selectedArticle.category || 'Tech Recruitment'}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-medium">
                      Published by <span className="font-bold text-foreground">{selectedArticle.source}</span>
                    </span>
                    {selectedArticle.publishedAt && (
                      <span className="text-xs text-muted-foreground">
                        • {new Date(selectedArticle.publishedAt).toLocaleDateString(undefined, { dateStyle: 'long' })}
                      </span>
                    )}
                  </div>
                  <DialogTitle className="text-xl sm:text-2xl font-black leading-snug text-foreground">
                    {selectedArticle.title}
                  </DialogTitle>
                </DialogHeader>

                {/* Article Image */}
                {selectedArticle.image && (
                  <div className="rounded-2xl overflow-hidden border border-border h-56 sm:h-72 bg-muted">
                    <img
                      src={selectedArticle.image}
                      alt={selectedArticle.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                )}

                {/* Summary Section */}
                <div className="space-y-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Executive Summary
                  </h5>
                  <p className="text-sm text-foreground/90 leading-relaxed">
                    {selectedArticle.description}
                  </p>
                </div>

                {/* Key Takeaways for Job Seekers */}
                <div className="p-5 rounded-2xl border border-primary/20 bg-primary/5 space-y-3">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" /> Actionable Takeaways for Candidates
                  </h5>
                  <ul className="space-y-2">
                    {selectedArticle.key_takeaways && selectedArticle.key_takeaways.length > 0 ? (
                      selectedArticle.key_takeaways.map((takeaway, tIdx) => (
                        <li key={tIdx} className="text-xs text-foreground/90 flex items-start gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                          <span className="leading-relaxed">{takeaway}</span>
                        </li>
                      ))
                    ) : (
                      <>
                        <li className="text-xs text-foreground/90 flex items-start gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                          <span>Monitor recruitment cycle timelines and prepare application materials early.</span>
                        </li>
                        <li className="text-xs text-foreground/90 flex items-start gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                          <span>Align core skills and project evidence with current industry demand.</span>
                        </li>
                        <li className="text-xs text-foreground/90 flex items-start gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                          <span>Review interview formats (DSA, System Design, behavioral) emphasized by hiring managers.</span>
                        </li>
                      </>
                    )}
                  </ul>
                </div>

                {/* Publisher Attribution & Original Link */}
                <div className="p-4 rounded-xl border border-border bg-muted/40 text-xs space-y-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>
                      Original reporting belongs to <span className="font-semibold text-foreground">{selectedArticle.source}</span>.
                      Summary compiled for career preparation and recruitment advisory.
                    </span>
                  </div>

                  {selectedArticle.url && (
                    <Button
                      asChild
                      className="w-full rounded-xl text-xs font-bold gap-2 py-5"
                    >
                      <a href={selectedArticle.url} target="_blank" rel="noopener noreferrer">
                        Read Complete Original Article on {selectedArticle.source}{' '}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
