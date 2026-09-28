import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Pricing tier card with billing cadence (monthly / annual) toggle
 * support, "Most popular" overlap badge, and per-tier feature checklist.
 *
 * Translated from blog/PricingTierCard + ai-chatbot-builder/PlanCard
 * (centered tier-card pattern, §27 thumbnail-picker variants) and
 * DESIGN.md Subscription Tier Selector spec (2px primary border when
 * selected, primary-tinted background, savings badge attached right of
 * annual price).
 */
export interface TierPlan {
  id: string
  name: string
  tagline: string
  monthlyPriceLabel: string
  annualPriceLabel: string
  annualSavingsLabel?: string
  cadenceUnitLabel?: string
  features: string[]
  popular?: boolean
  ctaKey: string
  ctaDefault: string
}

export type TierPlanCardCadence = 'monthly' | 'annual'

export interface TierPlanCardProps {
  plan: TierPlan
  cadence: TierPlanCardCadence
  selected?: boolean
  onSelect?: (planId: string) => void
}

export function TierPlanCard({ plan, cadence, selected, onSelect }: TierPlanCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const priceLabel = cadence === 'monthly' ? plan.monthlyPriceLabel : plan.annualPriceLabel
  const cadenceLabel = t(
    cadence === 'monthly' ? 'tierPlanCard.perMonth' : 'tierPlanCard.perYear',
    {},
    { defaultValue: cadence === 'monthly' ? '/ month' : '/ year' },
  )

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', gap: 'md' }),
        cm.sp('p', 8),
        'relative rounded-2xl border-2 transition-all duration-200',
        selected
          ? 'border-primary bg-primary-fixed/10 shadow-lg shadow-primary/10'
          : 'border-outline-variant/40 bg-surface-container-lowest hover:border-outline-variant',
        plan.popular ? 'lg:scale-[1.02]' : '',
      )}
    >
      {plan.popular && (
        <span
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 1),
            cm.fontWeight('bold'),
            cm.roundedFull,
            'absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-widest bg-secondary-container text-on-secondary-container shadow-sm whitespace-nowrap',
          )}
        >
          {t('status.mostPopular', {}, { defaultValue: 'Most popular' })}
        </span>
      )}

      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
        <h3 className={cm.cn('text-lg font-extrabold tracking-tight text-on-surface uppercase')}>
          {plan.name}
        </h3>
        <p className={cm.cn('text-sm font-medium text-on-surface-variant')}>{plan.tagline}</p>
      </div>

      <div className={cm.cn(cm.flex({ align: 'baseline', gap: 'sm', wrap: 'wrap' }))}>
        <span
          className={cm.cn('text-5xl font-extrabold tracking-tighter text-on-surface tabular-nums')}
        >
          {priceLabel}
        </span>
        <span
          className={cm.cn('text-sm font-bold uppercase tracking-widest text-on-surface-variant')}
        >
          {cadenceLabel}
        </span>
        {cadence === 'annual' && plan.annualSavingsLabel && (
          <span
            className={cm.cn(
              cm.sp('px', 2),
              cm.sp('py', 1),
              cm.fontWeight('bold'),
              cm.roundedFull,
              'text-[10px] uppercase tracking-widest bg-success-light text-success',
            )}
          >
            {t(
              'tierPlanCard.savingsBadge',
              { savings: plan.annualSavingsLabel },
              { defaultValue: 'Save {{savings}}' },
            )}
          </span>
        )}
      </div>

      <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), cm.sp('mt', 2))}>
        {plan.features.map((feature) => (
          <li
            key={feature}
            className={cm.cn(cm.flex({ align: 'start', gap: 'sm' }), 'text-sm text-on-surface')}
          >
            <span
              className={cm.cn('material-symbols-outlined text-base shrink-0 text-success')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              check_circle
            </span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => onSelect?.(plan.id)}
        className={cm.cn(
          cm.sp('py', 3),
          cm.sp('px', 6),
          cm.fontWeight('bold'),
          cm.roundedFull,
          cm.sp('mt', 4),
          'transition-all duration-200 active:scale-[0.98]',
          selected
            ? 'bg-on-surface text-surface-container-lowest hover:bg-on-surface/90'
            : 'bg-primary text-on-primary hover:bg-primary-hover hover:shadow-md',
        )}
      >
        {selected
          ? t('nav.currentPlan', {}, { defaultValue: 'Current plan' })
          : t(plan.ctaKey, {}, { defaultValue: plan.ctaDefault })}
      </button>
    </div>
  )
}

export default TierPlanCard
