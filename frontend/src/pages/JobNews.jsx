import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../lib/api';
import Navbar from '../components/common/Navbar';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Newspaper, ExternalLink, Loader2, RefreshCw } from 'lucide-react';

export default function JobNews() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNews = async () => {
    setLoading(true);
    try {
      const res = await api.get('/career/news', { params: { count: 15 } });
      setArticles(res.data.articles || []);
    } catch (err) {
      toast.error('Failed to load recruitment news.');
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tech Hiring & Recruitment News</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Live updates on engineering hiring, compensation benchmarks, and industry trends.
            </p>
          </div>
          <Button variant="outline" size="icon" onClick={fetchNews} disabled={loading} className="rounded-xl">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </motion.div>

        {loading ? (
          <div className="py-16 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-16 p-8 rounded-2xl border border-border bg-card">
            <Newspaper className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-base font-bold text-foreground">No news articles available</h3>
            <p className="text-xs text-muted-foreground mt-1">Please try refreshing in a few moments.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {articles.map((a, i) => (
              <motion.a
                key={i}
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="p-6 rounded-2xl border border-border bg-card block hover:border-primary/50 transition-all group"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base group-hover:text-primary transition-colors line-clamp-2">
                      {a.title}
                    </h3>
                    {a.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-2 leading-relaxed">
                        {a.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-3">
                      <span className="font-semibold text-foreground">{a.source}</span>
                      {a.publishedAt && (
                        <>
                          <span>•</span>
                          <span>{new Date(a.publishedAt).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </motion.a>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
