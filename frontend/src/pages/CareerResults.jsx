import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../lib/api';
import Navbar from '../components/common/Navbar';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Brain, FileText, CheckCircle2, ArrowRight } from 'lucide-react';

export default function CareerResults() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      const res = await api.get('/career/test/results');
      setResults(res.data || []);
    } catch (error) {
      console.error('Failed to load career results:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const latest = results[0];

  if (!latest) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-8 text-center">
          <div className="max-w-md space-y-4">
            <Sparkles className="h-12 w-12 mx-auto text-primary" />
            <h2 className="text-2xl font-bold">No Assessment Results Found</h2>
            <p className="text-sm text-muted-foreground">Take the 10-question career test to find your optimal path.</p>
            <Button onClick={() => navigate('/career-test')}>Take Career Assessment</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold tracking-tight">Your Career Path Analysis</h1>
          <p className="text-muted-foreground mt-1">
            Synthesized based on your engineering approach and architectural preferences.
          </p>
        </motion.div>

        {/* Highlight Path Banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card rounded-2xl p-8 sm:p-12 text-center border border-primary/20 bg-gradient-to-tr from-primary/10 via-blue-500/5 to-background shadow-xl"
        >
          <Sparkles className="h-14 w-14 mx-auto mb-4 text-primary" />
          <span className="text-xs uppercase font-bold text-primary tracking-widest">Recommended Career Trajectory</span>
          <h2 className="text-3xl sm:text-4xl font-black text-foreground mt-2 mb-3">{latest.career_path}</h2>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">{latest.explanation}</p>
        </motion.div>

        {/* Strengths and Suggested Skills */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl border border-border bg-card">
            <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              Core Natural Strengths
            </h3>
            <div className="flex flex-wrap gap-2">
              {latest.strengths?.map((s, idx) => (
                <span key={idx} className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-lg text-xs font-semibold">
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="p-6 rounded-2xl border border-border bg-card">
            <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Recommended Focus Technologies
            </h3>
            <div className="flex flex-wrap gap-2">
              {latest.suggested_skills?.map((s, idx) => (
                <span key={idx} className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-xs font-semibold">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Action Navigation */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <Button onClick={() => navigate('/skill-analysis')} className="flex-1 py-6 gap-2 rounded-xl text-sm font-semibold">
            <Brain className="h-4 w-4" /> Compare Skills for this Path
          </Button>
          <Button variant="outline" onClick={() => navigate('/career-test')} className="flex-1 py-6 gap-2 rounded-xl text-sm font-semibold">
            Retake Assessment
          </Button>
        </div>
      </main>
    </div>
  );
}
