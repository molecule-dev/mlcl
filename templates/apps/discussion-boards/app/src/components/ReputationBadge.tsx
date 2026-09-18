/**
 * Reputation tier pill — small inline badge that reflects a member's
 * standing in the Stoa community. Tiers are derived from the score with
 * the thresholds defined in DESIGN.md (Newcomer / Contributor / Regular /
 * Trusted / Elder). Sits flush next to usernames in thread rows, post
 * sidebars, and profile cards.
 *
 * Translated from personal-finance's status-pill treatment (uppercase
 * tracking-widest, font-black, rounded-full).
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type ReputationTier = 'newcomer' | 'contributor' | 'regular' | 'trusted' | 'elder'

const tierFromScore = (score: number): ReputationTier => {
  if (score >= 5000) return 'elder'
  if (score >= 1500) return 'trusted'
  if (score >= 400) return 'regular'
  if (score >= 50) return 'contributor'
  return 'newcomer'
}

const TIER_PRESENTATION: Record<ReputationTier, { fg: string; bg: string; ring: string }> = {
  newcomer: { fg: 'text-foreground-secondary', bg: 'bg-border/70', ring: '' },
  contributor: { fg: 'text-info', bg: 'bg-info-light', ring: '' },
  regular: { fg: 'text-primary', bg: 'bg-primary/15', ring: '' },
  trusted: { fg: 'text-warning', bg: 'bg-warning-light', ring: '' },
  elder: { fg: 'text-warning', bg: 'bg-warning-light', ring: 'ring-1 ring-[var(--color-pinned)]' },
}

interface ReputationBadgeProps {
  score: number
  tier?: ReputationTier
  showScore?: boolean
}

export function ReputationBadge({ score, tier, showScore = false }: ReputationBadgeProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const resolved = tier ?? tierFromScore(score)
  const presentation = TIER_PRESENTATION[resolved]
  const labelKey = `reputationBadge.tier.${resolved}`
  const labels: Record<ReputationTier, string> = {
    newcomer: 'Newcomer',
    contributor: 'Contributor',
    regular: 'Regular',
    trusted: 'Trusted',
    elder: 'Elder',
  }
  return (
    <span
      className={cm.cn(
        cm.sp('px', 2),
        cm.fontWeight('bold'),
        cm.roundedFull,
        'inline-flex items-center gap-1 py-0.5 text-[10px] uppercase tracking-widest',
        presentation.fg,
        presentation.bg,
        presentation.ring,
      )}
    >
      <span className={cm.cn('material-symbols-outlined text-[12px]')} aria-hidden>
        military_tech
      </span>
      {t(labelKey, {}, { defaultValue: labels[resolved] })}
      {showScore && (
        <span className={cm.cn('font-black tabular-nums opacity-80')}>
          {' '}
          {score >= 1000 ? `${(score / 1000).toFixed(1)}k` : score}
        </span>
      )}
    </span>
  )
}

export default ReputationBadge
