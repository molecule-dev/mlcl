import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Trophy card for an achievement — large emoji, tier-colored ring, name +
 * description, progress meter for locked items, unlocked-at timestamp for
 * unlocked items.
 *
 * Translated from project-management/KpiCard.tsx (border accent + hover lift +
 * icon chip pattern) with bespoke locked-state grayscale treatment.
 */

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'

interface AchievementBadgeCardProps {
  name: string
  description: string
  icon: string
  tier: AchievementTier
  unlocked: boolean
  unlockedAt: string | null
  thresholdDays: number
  progressDays: number
}

const TIER_COLOR: Record<AchievementTier, string> = {
  bronze: '#cd7f32',
  silver: '#c0c0c0',
  gold: '#fbbf24',
  platinum: '#a5b4fc',
  diamond: '#7dd3fc',
}

const TIER_LABEL: Record<AchievementTier, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
  diamond: 'Diamond',
}

export function AchievementBadgeCard({
  name,
  description,
  icon,
  tier,
  unlocked,
  unlockedAt,
  thresholdDays,
  progressDays,
}: AchievementBadgeCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const tierColor = TIER_COLOR[tier]
  const pct = Math.min(100, Math.round((progressDays / thresholdDays) * 100))

  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-2xl shadow-sm border-t-4 hover:-translate-y-0.5 transition-transform group',
        !unlocked && 'opacity-75',
      )}
      style={{ borderTopColor: unlocked ? tierColor : 'var(--color-achievement-locked)' }}
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 4))}>
        <div
          className={cm.cn(
            cm.h(14),
            cm.w(14),
            cm.flex({ align: 'center', justify: 'center' }),
            cm.roundedFull,
            'shadow-sm group-hover:scale-110 transition-transform text-3xl',
            !unlocked && 'grayscale',
          )}
          style={{
            backgroundColor: unlocked ? `${tierColor}33` : 'var(--color-surface-container)',
          }}
        >
          <span aria-hidden="true">{icon}</span>
        </div>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.sp('px', 3),
            cm.sp('py', 1),
            'text-[10px] uppercase tracking-widest rounded-full',
          )}
          style={{
            backgroundColor: unlocked ? `${tierColor}22` : 'var(--color-surface-container)',
            color: unlocked ? tierColor : 'var(--color-foreground-tertiary)',
          }}
        >
          {t(`achievementBadgeCard.tier.${tier}`, {}, { defaultValue: TIER_LABEL[tier] })}
        </span>
      </div>

      <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}>{name}</h3>
      <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
        {description}
      </p>

      {unlocked ? (
        <div
          className={cm.cn(
            cm.sp('mt', 4),
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
          )}
          style={{ color: tierColor }}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            verified
          </span>
          {t(
            'achievementBadgeCard.unlockedOn',
            { date: unlockedAt ? new Date(unlockedAt).toLocaleDateString() : '' },
            { defaultValue: 'Unlocked {{date}}' },
          )}
        </div>
      ) : (
        <div className={cm.cn(cm.sp('mt', 4))}>
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 1))}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'text-on-surface-variant uppercase tracking-widest',
              )}
            >
              {t(
                'achievementBadgeCard.progressLabel',
                { progress: progressDays, total: thresholdDays },
                { defaultValue: '{{progress}} / {{total}} days' },
              )}
            </span>
            <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), 'text-on-surface')}>
              {pct}%
            </span>
          </div>
          <div className={cm.cn('h-2 rounded-full bg-surface-container overflow-hidden')}>
            <div
              className={cm.cn('h-full rounded-full')}
              style={{
                width: `${pct}%`,
                background: `linear-gradient(90deg, var(--color-gradient-hero-start), var(--color-gradient-hero-end))`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
