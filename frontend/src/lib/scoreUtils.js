/**
 * Unified Score & Status Color System
 * 
 * Single semantic scale across all cards, ATS scores, skill benchmarks:
 * - Good (70+): Teal (#0F6E56 light / #5DCAA5 dark)
 * - Needs work (40-69): Amber (#BA7517 light / #EF9F27 dark)
 * - Poor (<40): Coral/Red (#993C1D light / #F0997B dark)
 */

export function getScoreColorClass(score) {
  if (score === null || score === undefined) return 'text-muted-foreground';
  if (score >= 70) return 'text-[#0F6E56] dark:text-[#5DCAA5]';
  if (score >= 40) return 'text-[#BA7517] dark:text-[#EF9F27]';
  return 'text-[#993C1D] dark:text-[#F0997B]';
}

export function getScoreBgClass(score) {
  if (score === null || score === undefined) return 'bg-muted/50 border-border text-muted-foreground';
  if (score >= 70) {
    return 'bg-[#0F6E56]/10 text-[#0F6E56] border-[#0F6E56]/20 dark:bg-[#5DCAA5]/15 dark:text-[#5DCAA5] dark:border-[#5DCAA5]/30';
  }
  if (score >= 40) {
    return 'bg-[#BA7517]/10 text-[#BA7517] border-[#BA7517]/20 dark:bg-[#EF9F27]/15 dark:text-[#EF9F27] dark:border-[#EF9F27]/30';
  }
  return 'bg-[#993C1D]/10 text-[#993C1D] border-[#993C1D]/20 dark:bg-[#F0997B]/15 dark:text-[#F0997B] dark:border-[#F0997B]/30';
}

export function getScoreFillHex(score, isDark = false) {
  if (score === null || score === undefined) return isDark ? '#9B9B97' : '#6B6B68';
  if (score >= 70) return isDark ? '#5DCAA5' : '#0F6E56';
  if (score >= 40) return isDark ? '#EF9F27' : '#BA7517';
  return isDark ? '#F0997B' : '#993C1D';
}

export function getScoreStatusLabel(score) {
  if (score === null || score === undefined) return 'N/A';
  if (score >= 70) return 'Good';
  if (score >= 40) return 'Needs Work';
  return 'Poor';
}

export const getScoreColor = getScoreColorClass;
export const getScoreBg = getScoreBgClass;

