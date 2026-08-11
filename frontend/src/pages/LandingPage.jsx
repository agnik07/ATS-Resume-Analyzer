import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Target, Brain, TrendingUp, Sparkles, Shield, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      {/* Navigation */}
      <nav className="p-6 md:px-12 flex justify-between items-center border-b border-border/50 backdrop-blur-md">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-primary to-blue-600 flex items-center justify-center text-primary-foreground shadow-md shadow-primary/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">
            SkillGap <span className="text-primary">AI</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button variant="outline" onClick={() => navigate('/auth')} className="rounded-xl">
            Sign In
          </Button>
          <Button onClick={() => navigate('/auth')} className="rounded-xl shadow-md shadow-primary/20">
            Get Started <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        </div>
      </nav>

      {/* Hero Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/20 bg-primary/10 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Deterministic ATS Engine & Career Acceleration
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight">
            Bridge Your Skill Gap. <br />
            <span className="bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
              Land Your Dream Job.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Deterministic 5-pillar ATS resume scoring, project-to-skill embedding validation, benchmark skill gap analysis, and recruiter intelligence in a single unified platform.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button
              size="lg"
              onClick={() => navigate('/auth')}
              className="w-full sm:w-auto px-8 py-6 rounded-xl text-base font-semibold shadow-lg shadow-primary/25 gap-2"
            >
              <Sparkles className="h-5 w-5" /> Start Free Analysis
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/auth')}
              className="w-full sm:w-auto px-8 py-6 rounded-xl text-base font-semibold"
            >
              Recruiter Portal
            </Button>
          </div>
        </motion.div>

        {/* Feature Cards Grid */}
        <div className="max-w-6xl w-full mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 text-left">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-6 rounded-2xl border border-border bg-card/60 backdrop-blur-sm"
          >
            <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
              <Shield className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Deterministic 5-Pillar ATS</h3>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Mathematical scoring across Formatting, Keywords, Content Quality, Project Skill Validation, and System Compatibility with 0% hallucinations.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-6 rounded-2xl border border-border bg-card/60 backdrop-blur-sm"
          >
            <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-4">
              <Brain className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Single-Source Skill Gap</h3>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Benchmark your substantiated skills against Google, Amazon, Microsoft, and Meta roles. Receive actionable 4-week learning roadmaps.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-6 rounded-2xl border border-border bg-card/60 backdrop-blur-sm"
          >
            <div className="h-12 w-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center mb-4">
              <Target className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Recruiter Intelligence</h3>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Post job vacancies with minimum ATS screening criteria, rank applicant pipelines deterministically, and generate Groq AI summaries.
            </p>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-xs text-muted-foreground border-t border-border/40">
        © 2026 SkillGap AI • Unified AI-Powered Recruitment & Career Intelligence Platform
      </footer>
    </div>
  );
}
