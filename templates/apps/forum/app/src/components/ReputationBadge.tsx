/**
 * ReputationBadge — karma pill awarded by tier (Newcomer → Legend).
 *
 * Pill-shaped (px-2.5 py-0.5), trophy/star icon left of score. Tier
 * threshold logic per DESIGN.md.
 *
 * Translated from blog/PostListItem.tsx status-pill treatment fused with
 * the personal-finance/AccountKpiBadge tier-color pattern.
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface ReputationBadgeProps {
  karma: number
  showTier?: boolean
  size?: 'sm' | 'md'
}

interface TierStyle {
  key: string
  defaultValue: string
  bg: string
  fg: string
  border?: string
  icon: string
}

function tierFor(karma: number): TierStyle {
  if (karma >= 10000) {
    return {
      key: 'reputationBadge.legend',
      defaultValue: 'Legend',
      bg: 'var(--color-rep-legend-bg)',
      fg: 'var(--color-rep-legend-fg)',
      border: 'var(--color-rep-legend-border)',
      icon: 'workspace_premium',
    }
  }
  if (karma >= 2000) {
    return {
      key: 'reputationBadge.veteran',
      defaultValue: 'Veteran',
      bg: 'var(--color-rep-veteran-bg)',
      fg: 'var(--color-rep-veteran-fg)',
      border: 'color-mix(in srgb, var(--color-rep-veteran-fg) 30%, transparent)',
      icon: 'military_tech',
    }
  }
  if (karma >= 500) {
    return {
      key: 'reputationBadge.contributor',
      defaultValue: 'Contributor',
      bg: 'var(--color-rep-contributor-bg)',
      fg: 'var(--color-rep-contributor-fg)',
      border: 'color-mix(in srgb, var(--color-rep-contributor-fg) 25%, transparent)',
      icon: 'verified',
    }
  }
  if (karma >= 100) {
    return {
      key: 'reputationBadge.member',
      defaultValue: 'Member',
      bg: 'var(--color-rep-member-bg)',
      fg: 'var(--color-rep-member-fg)',
      icon: 'star',
    }
  }
  return {
    key: 'reputationBadge.newcomer',
    defaultValue: 'Newcomer',
    bg: 'var(--color-rep-newcomer-bg)',
    fg: 'var(--color-rep-newcomer-fg)',
    icon: 'eco',
  }
}

function formatKarma(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`
  return String(value)
}

export function ReputationBadge({ karma, showTier = false, size = 'md' }: ReputationBadgeProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const tier = tierFor(karma)
  const isSmall = size === 'sm'

  return (
    <span
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'xs' }),
        cm.fontWeight('bold'),
        'rounded-full',
        isSmall ? 'px-2 py-0 text-[10px]' : 'px-2.5 py-0.5 text-xs',
      )}
      style={{
        backgroundColor: tier.bg,
        color: tier.fg,
        border: tier.border ? `1px solid ${tier.border}` : undefined,
      }}
    >
      <span className={cm.cn(isSmall ? 'text-sm' : 'text-base', 'material-symbols-outlined')}>
        {tier.icon}
      </span>
      <span className="tabular-nums">{formatKarma(karma)}</span>
      {showTier && (
        <span
          className={cm.cn(
            cm.fontWeight('semibold'),
            'opacity-70 uppercase tracking-widest text-[9px]',
          )}
        >
          {t(tier.key, {}, { defaultValue: tier.defaultValue })}
        </span>
      )}
    </span>
  )
}

export default ReputationBadge
