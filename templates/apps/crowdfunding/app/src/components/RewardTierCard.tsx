import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface RewardTier {
  id: string
  title: string
  description: string
  price_cents: number
  delivery_estimate?: string
  backer_count: number
  limit?: number | null
  remaining?: number | null
}

interface RewardTierCardProps {
  tier: RewardTier
  selected?: boolean
  onSelect?: (id: string) => void
  /** Render in 'preview' mode without a select button (used on detail page). */
  variant?: 'select' | 'preview'
}

function fmtUsd(cents: number) {
  return `$${Math.round(cents / 100).toLocaleString()}`
}

/**
 * Reward tier card — bordered surface that promotes to a 2px primary
 * border when selected. Includes price, title, description, delivery
 * estimate, and a backer count + remaining-slots row.
 *
 * Pattern from DESIGN.md "Reward Tier Card" spec; visual treatment
 * translated from crm/DealCard.tsx (selected state, hover lift).
 */
export function RewardTierCard({
  tier,
  selected = false,
  onSelect,
  variant = 'select',
}: RewardTierCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const soldOut = tier.remaining === 0
  const isLimited = typeof tier.limit === 'number' && tier.limit > 0

  const inner = (
    <div className={cm.stack(3)}>
      <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
        <span
          className={cm.cn(
            cm.textSize('2xl'),
            cm.fontWeight('bold'),
            'text-primary-dark tabular-nums',
            soldOut ? 'line-through opacity-60' : '',
          )}
        >
          {fmtUsd(tier.price_cents)}
        </span>
        {soldOut ? (
          <span
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.roundedFull,
              'uppercase tracking-widest bg-surface-container text-on-surface-variant',
            )}
          >
            {t('rewardTierCard.soldOut', {}, { defaultValue: 'Sold out' })}
          </span>
        ) : isLimited ? (
          <span
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.roundedFull,
              'uppercase tracking-widest bg-accent-700 text-white',
            )}
          >
            {t(
              'rewardTierCard.remaining',
              { count: tier.remaining ?? 0 },
              { defaultValue: (tier.remaining ?? 0) === 1 ? '1 left' : '{{count}} left' },
            )}
          </span>
        ) : null}
      </div>

      <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'text-on-surface')}>
        {tier.title}
      </h3>

      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
        {tier.description}
      </p>

      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('pt', 3),
          cm.textSize('xs'),
          'border-t border-outline-variant text-on-surface-variant',
        )}
      >
        <span>
          {t(
            'rewardTierCard.backerCount',
            { count: tier.backer_count },
            {
              defaultValue: tier.backer_count === 1 ? '1 backer' : '{{count}} backers',
            },
          )}
        </span>
        {tier.delivery_estimate && (
          <span className="italic">
            {t(
              'rewardTierCard.delivery',
              { date: tier.delivery_estimate },
              { defaultValue: 'Est. {{date}}' },
            )}
          </span>
        )}
      </div>
    </div>
  )

  const baseClass = cm.cn(
    cm.sp('p', 5),
    'rounded-lg block w-full text-left bg-surface-container-lowest border transition-all duration-200',
    selected
      ? 'border-primary ring-2 ring-primary/30'
      : 'border-outline-variant hover:border-primary hover:-translate-y-0.5 hover:shadow-md',
    soldOut ? 'opacity-60 cursor-not-allowed' : '',
  )

  if (variant === 'preview' || !onSelect) {
    return (
      <article className={baseClass} data-mol-id={`reward-tier-${tier.id}`}>
        {inner}
      </article>
    )
  }

  return (
    <button
      type="button"
      disabled={soldOut}
      onClick={() => onSelect(tier.id)}
      className={baseClass}
      data-mol-id={`reward-tier-${tier.id}`}
      aria-pressed={selected}
    >
      {inner}
    </button>
  )
}

export default RewardTierCard
