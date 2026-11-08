import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Github,
  CheckCircle2,
  AlertTriangle,
  Code,
  GitBranch,
  Activity,
  ShieldCheck,
  Flame,
  FileCode,
  ExternalLink,
  Layers,
  Sparkles,
  Info,
  Clock,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

import { getScoreColorClass, getScoreBgClass, getScoreColor, getScoreBg } from '../../lib/scoreUtils';

export default function GitHubEvidenceDashboard({ githubEvidence, enhancedAtsScore, originalAtsScore }) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!githubEvidence || !githubEvidence.is_available) {
    return (
      <div className="p-6 rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Github className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold">
            {githubEvidence?.status_message || 'No public GitHub repository evidence detected.'}
          </span>
        </div>
      </div>
    );
  }

  const {
    github_profile: profile,
    github_evidence_score = 0,
    repositories_analyzed = 0,
    projects_verified_count = 0,
    total_projects_count = 0,
    skills_verified_count = 0,
    total_skills_count = 0,
    project_matches = [],
    skill_matches = [],
    activity_metrics = {},
    maturity_metrics = {},
    authenticity_analysis = {},
    cross_validation_matrix = [],
    mismatches = [],
  } = githubEvidence;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'VERIFIED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 border border-primary/20 text-primary">✓ VERIFIED</span>;
      case 'PARTIALLY_VERIFIED':
      case 'WEAK_EVIDENCE':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#BA7517]/10 dark:bg-[#EF9F27]/15 border border-[#BA7517]/20 dark:border-[#EF9F27]/30 text-[#BA7517] dark:text-[#EF9F27]">WEAK EVIDENCE</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#993C1D]/10 dark:bg-[#F0997B]/15 border border-[#993C1D]/20 dark:border-[#F0997B]/30 text-[#993C1D] dark:text-[#F0997B]">NOT FOUND</span>;
    }
  };

  const getRiskBadge = (risk) => {
    switch (risk) {
      case 'HIGH':
        return <span className="px-3 py-1 rounded-full text-xs font-black bg-[#993C1D]/15 dark:bg-[#F0997B]/20 border border-[#993C1D]/30 text-[#993C1D] dark:text-[#F0997B]">HIGH RISK</span>;
      case 'MODERATE':
        return <span className="px-3 py-1 rounded-full text-xs font-black bg-[#BA7517]/15 dark:bg-[#EF9F27]/20 border border-[#BA7517]/30 text-[#BA7517] dark:text-[#EF9F27]">MODERATE RISK</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-black bg-primary/15 border border-primary/30 text-primary">LOW RISK</span>;
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header Banner */}
      <div className="p-8 rounded-2xl border border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Github className="h-9 w-9" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase font-bold tracking-wider text-primary">
                  GitHub Evidence Layer
                </span>
                {profile?.username && (
                  <a
                    href={profile.profile_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    @{profile.username} <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              <h2 className="text-2xl font-black text-foreground mt-0.5">
                Authenticity & Development Evidence
              </h2>
              <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                Cross-validating candidate resume claims against real-world public commit history, repository trees, source imports, and activity metrics.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 bg-background/60 p-4 rounded-xl border border-border">
            <div className="text-center">
              <span className="text-[11px] text-muted-foreground uppercase font-semibold block">GitHub Evidence</span>
              <span className={`text-3xl font-black font-mono ${getScoreColor(github_evidence_score)}`}>
                {github_evidence_score}
              </span>
              <span className="text-[10px] text-muted-foreground font-normal"> / 100</span>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-center">
              <span className="text-[11px] text-muted-foreground uppercase font-semibold block">Enhanced ATS</span>
              <span className={`text-3xl font-black font-mono ${getScoreColor(enhancedAtsScore || originalAtsScore)}`}>
                {enhancedAtsScore || originalAtsScore}
              </span>
              <span className="text-[10px] text-muted-foreground font-normal"> / 100</span>
            </div>
          </div>
        </div>
      </div>

      {/* Discrepancy / Mismatch Alert Banner */}
      {mismatches.length > 0 && (
        <div className="p-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-foreground space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-500 text-sm">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            Resume ↔ GitHub Mismatches Detected ({mismatches.length})
          </div>
          <ul className="space-y-1.5 pl-7 list-disc text-xs text-muted-foreground">
            {mismatches.map((m, idx) => (
              <li key={idx}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-2 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview & Repos' },
          { id: 'projects', label: `Projects (${projects_verified_count}/${total_projects_count})` },
          { id: 'skills', label: `Skills (${skills_verified_count}/${total_skills_count})` },
          { id: 'activity', label: 'Activity & Maturity' },
          { id: 'authenticity', label: 'AI Risk & Authenticity' },
          { id: 'matrix', label: 'Cross-Validation Matrix' },
        ].map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab(tab.id)}
            className="text-xs font-semibold rounded-lg shrink-0"
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl border border-border bg-card">
              <span className="text-xs text-muted-foreground font-semibold uppercase block">Repositories Analyzed</span>
              <div className="text-3xl font-black font-mono mt-1 text-foreground">{repositories_analyzed}</div>
              <span className="text-[11px] text-muted-foreground mt-1 block">Public original repos</span>
            </div>
            <div className="p-5 rounded-xl border border-border bg-card">
              <span className="text-xs text-muted-foreground font-semibold uppercase block">Verified Projects</span>
              <div className="text-3xl font-black font-mono mt-1 text-emerald-500">
                {projects_verified_count} <span className="text-xs font-normal text-muted-foreground">/ {total_projects_count}</span>
              </div>
              <span className="text-[11px] text-muted-foreground mt-1 block">Supported on GitHub</span>
            </div>
            <div className="p-5 rounded-xl border border-border bg-card">
              <span className="text-xs text-muted-foreground font-semibold uppercase block">Verified Skills</span>
              <div className="text-3xl font-black font-mono mt-1 text-blue-500">
                {skills_verified_count} <span className="text-xs font-normal text-muted-foreground">/ {total_skills_count}</span>
              </div>
              <span className="text-[11px] text-muted-foreground mt-1 block">Code & dependency backed</span>
            </div>
            <div className="p-5 rounded-xl border border-border bg-card">
              <span className="text-xs text-muted-foreground font-semibold uppercase block">Development Pattern</span>
              <div className="text-lg font-bold mt-1 text-foreground">
                {maturity_metrics?.development_pattern || 'Incremental'}
              </div>
              <span className="text-[11px] text-muted-foreground mt-1 block">Commit distribution</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Project Matches */}
      {activeTab === 'projects' && (
        <div className="space-y-4">
          {project_matches.map((pm, idx) => (
            <div key={idx} className="p-6 rounded-2xl border border-border bg-card space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="font-bold text-base text-foreground">{pm.project_name}</h4>
                  {pm.repo_url && (
                    <a
                      href={pm.repo_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5"
                    >
                      <GitBranch className="h-3 w-3" /> {pm.matched_repo_name} <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <div>{getStatusBadge(pm.verification_status)}</div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-muted-foreground">Overall Project Evidence Score</span>
                  <span className={getScoreColor(pm.overall_score)}>{pm.overall_score}%</span>
                </div>
                <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                  <div className={`h-full ${getScoreBg(pm.overall_score)}`} style={{ width: `${pm.overall_score}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2">
                <div className="p-2.5 rounded-lg bg-background/50 border border-border">
                  <span className="text-muted-foreground block text-[10px]">Name Sim</span>
                  <span className="font-bold font-mono text-foreground">{pm.name_similarity}%</span>
                </div>
                <div className="p-2.5 rounded-lg bg-background/50 border border-border">
                  <span className="text-muted-foreground block text-[10px]">Description Sim</span>
                  <span className="font-bold font-mono text-foreground">{pm.description_similarity}%</span>
                </div>
                <div className="p-2.5 rounded-lg bg-background/50 border border-border">
                  <span className="text-muted-foreground block text-[10px]">Tech Overlap</span>
                  <span className="font-bold font-mono text-foreground">{pm.technology_overlap}%</span>
                </div>
                <div className="p-2.5 rounded-lg bg-background/50 border border-border">
                  <span className="text-muted-foreground block text-[10px]">Code Evidence</span>
                  <span className="font-bold font-mono text-foreground">{pm.code_evidence}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Skill Verification Matrix */}
      {activeTab === 'skills' && (
        <div className="p-6 rounded-2xl border border-border bg-card space-y-4">
          <h4 className="font-bold text-base text-foreground">Technical Skill Code Evidence</h4>
          <div className="divide-y divide-border">
            {skill_matches.map((sm, idx) => (
              <div key={idx} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-foreground text-sm">{sm.skill}</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {sm.evidence_sources.map((src, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-muted/60 text-muted-foreground text-[10px]">
                        {src}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono font-bold bg-primary/10 text-primary px-2.5 py-1 rounded-md">
                    {sm.usage_level}
                  </span>
                  <span className={`font-mono font-bold ${getScoreColor(sm.evidence_score)}`}>
                    {sm.evidence_score} / 100
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Activity & Maturity */}
      {activeTab === 'activity' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl border border-border bg-card space-y-4">
            <h4 className="font-bold text-base flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" /> Development Activity Score
            </h4>
            <div className="text-4xl font-black font-mono text-primary">
              {activity_metrics?.activity_score || 0} <span className="text-xs font-normal text-muted-foreground">/ 100</span>
            </div>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex justify-between py-1 border-b border-border">
                <span>Recent Activity (30d):</span>
                <span className="font-bold text-foreground">{activity_metrics?.commits_30d || 0} commits ({activity_metrics?.recent_activity_rating})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border">
                <span>Active Days (90d):</span>
                <span className="font-bold text-foreground">{activity_metrics?.active_days_90d || 0} days</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border">
                <span>Active Weeks (365d):</span>
                <span className="font-bold text-foreground">{activity_metrics?.active_weeks_365d || 0} weeks</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Total Public Commits:</span>
                <span className="font-bold text-foreground">{activity_metrics?.total_commits || 0}</span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl border border-border bg-card space-y-4">
            <h4 className="font-bold text-base flex items-center gap-2">
              <Flame className="h-5 w-5 text-amber-500" /> Development Maturity
            </h4>
            <div className="text-4xl font-black font-mono text-amber-500">
              {maturity_metrics?.maturity_score || 0} <span className="text-xs font-normal text-muted-foreground">/ 100</span>
            </div>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex justify-between py-1 border-b border-border">
                <span>Commit Burst Ratio:</span>
                <span className="font-bold text-foreground">{(maturity_metrics?.commit_burst_ratio || 0) * 100}%</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border">
                <span>Avg Repo Lifespan:</span>
                <span className="font-bold text-foreground">{maturity_metrics?.avg_repo_lifespan_days || 0} days</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border">
                <span>Testing Evidence:</span>
                <span className="font-bold text-foreground">{maturity_metrics?.has_testing_evidence ? 'Detected ✓' : 'Not Detected'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Pattern Classification:</span>
                <span className="font-bold text-foreground">{maturity_metrics?.development_pattern}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: AI Risk & Authenticity */}
      {activeTab === 'authenticity' && (
        <div className="p-6 rounded-2xl border border-border bg-card space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-base flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" /> AI-Assistance Risk & Authenticity Report
            </h4>
            <div>{getRiskBadge(authenticity_analysis?.ai_assistance_risk)}</div>
          </div>

          <p className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-lg border border-border">
            {authenticity_analysis?.explanation}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="space-y-2">
              <span className="font-bold text-amber-500 uppercase text-[11px] block">Risk Signals</span>
              {authenticity_analysis?.signals?.length > 0 ? (
                authenticity_analysis.signals.map((sig, i) => (
                  <div key={i} className="flex items-start gap-2 text-muted-foreground p-2 rounded bg-amber-500/5 border border-amber-500/10">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <span>{sig}</span>
                  </div>
                ))
              ) : (
                <span className="text-muted-foreground">No high-risk burst signals detected.</span>
              )}
            </div>

            <div className="space-y-2">
              <span className="font-bold text-emerald-500 uppercase text-[11px] block">Counter-Signals</span>
              {authenticity_analysis?.counter_signals?.length > 0 ? (
                authenticity_analysis.counter_signals.map((csig, i) => (
                  <div key={i} className="flex items-start gap-2 text-muted-foreground p-2 rounded bg-emerald-500/5 border border-emerald-500/10">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{csig}</span>
                  </div>
                ))
              ) : (
                <span className="text-muted-foreground">No counter-signals available.</span>
              )}
            </div>
          </div>

          <div className="text-[11px] text-muted-foreground italic border-t border-border pt-3">
            {authenticity_analysis?.disclaimer}
          </div>
        </div>
      )}

      {/* Tab 6: Cross-Validation Matrix */}
      {activeTab === 'matrix' && (
        <div className="p-6 rounded-2xl border border-border bg-card space-y-4">
          <h4 className="font-bold text-base text-foreground">Cross-Validation Matrix</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-2.5 px-3 font-semibold">Resume Claim</th>
                  <th className="py-2.5 px-3 font-semibold">GitHub Evidence</th>
                  <th className="py-2.5 px-3 font-semibold">Match Score</th>
                  <th className="py-2.5 px-3 font-semibold">Confidence</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cross_validation_matrix.map((row, idx) => (
                  <tr key={idx} className="hover:bg-muted/30">
                    <td className="py-3 px-3 font-bold text-foreground">{row.claim}</td>
                    <td className="py-3 px-3 text-muted-foreground">{row.github_evidence}</td>
                    <td className="py-3 px-3 font-mono font-bold">{row.match_score}%</td>
                    <td className="py-3 px-3">{row.confidence}</td>
                    <td className="py-3 px-3">{getStatusBadge(row.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
}
