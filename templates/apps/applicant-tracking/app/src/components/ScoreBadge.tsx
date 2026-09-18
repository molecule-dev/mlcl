/**
 * AI score badge — tabular-num value with semantic tier color
 * (high ≥ 80 = green, medium ≥ 60 = amber, low = red).
 *
 * Translated from personal-finance's status pills — same compact pill anatomy
 * with color tied to a numeric threshold.
 */
import { getClassMap } from '@molecule/app-ui'

interface ScoreBadgeProps {
  score: number
  size?: 'sm' | 'md'
}

function tier(score: number): 'high' | 'medium' | 'low' {
  if (score >= 80) return 'high'
  if (score >= 60) return 'medium'
  return 'low'
}

const TIER_BG: Record<'high' | 'medium' | 'low', string> = {
  high: 'var(--color-score-high-light)',
  medium: 'var(--color-score-medium-light)',
  low: 'var(--color-score-low-light)',
}

const TIER_FG: Record<'high' | 'medium' | 'low', string> = {
  high: 'var(--color-score-high)',
  medium: 'var(--color-score-medium)',
  low: 'var(--color-score-low)',
}

export function ScoreBadge({ score, size = 'sm' }: ScoreBadgeProps) {
  const cm = getClassMap()
  const t = tier(score)
  return (
    <span
      className={cm.cn(
        cm.sp('px', 2),
        cm.sp('py', 1),
        size === 'md' ? 'text-xs' : 'text-[10px]',
        'inline-flex items-center gap-1 font-black uppercase tracking-widest rounded-full tabular-nums',
      )}
      style={{ backgroundColor: TIER_BG[t], color: TIER_FG[t] }}
    >
      <span aria-hidden="true">AI</span>
      <span>{score}</span>
    </span>
  )
}
