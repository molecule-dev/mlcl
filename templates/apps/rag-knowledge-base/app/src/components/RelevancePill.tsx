import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface RelevancePillProps {
  /** Relevance value 0..1 (or 0..100 \u2014 both ranges auto-detected). */
  value: number
  /** When true, renders a small ring with the percent number centered. */
  variant?: 'pill' | 'ring'
}

type Tier = 'high' | 'medium' | 'low'

const TIER_COLOR: Record<Tier, string> = {
  high: 'var(--color-success)',
  medium: 'var(--color-warning)',
  low: 'var(--color-on-surface-variant)',
}

const TIER_ICON: Record<Tier, string> = {
  high: 'verified',
  medium: 'help',
  low: 'remove_circle',
}

/**
 * Relevance score badge \u2014 pill (default) or 32px ring \u2014 colored
 * green / amber / gray per DESIGN.md "Relevance Score Badge" thresholds
 * (High >=0.8, Medium >=0.5, Low <0.5).
 *
 * Translated from ai-document-processor's ConfidencePill pattern, with the
 * tier thresholds shifted to match Engram's relevance ramp.
 */
export function RelevancePill({ value, variant = 'pill' }: RelevancePillProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const pct = Math.max(0, Math.min(100, value <= 1 ? value * 100 : value))
  const tier: Tier = pct >= 80 ? 'high' : pct >= 50 ? 'medium' : 'low'
  const color = TIER_COLOR[tier]
  const display = pct.toFixed(pct >= 99.95 ? 0 : 1)

  if (variant === 'ring') {
    const stroke = 3
    const radius = 14 - stroke / 2
    const circumference = 2 * Math.PI * radius
    const offset = circumference * (1 - pct / 100)
    return (
      <span
        className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), 'relative')}
        style={{ width: 32, height: 32 }}
        aria-label={t(
          'relevancePill.ringAria',
          { value: display },
          { defaultValue: `${display}% relevance` },
        )}
      >
        <svg width="32" height="32" viewBox="0 0 32 32">
          <circle
            cx="16"
            cy="16"
            r={radius}
            fill="none"
            stroke="var(--color-outline-variant)"
            strokeWidth={stroke}
            opacity={0.4}
          />
          <circle
            cx="16"
            cy="16"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 16 16)"
          />
        </svg>
        <span
          className={cm.cn(cm.textSize('xs'), 'absolute font-semibold tabular-nums')}
          style={{ color }}
        >
          {Math.round(pct)}
        </span>
      </span>
    )
  }

  return (
    <span
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'xs' }),
        cm.sp('px', 2),
        cm.sp('py', 1),
        cm.textSize('xs'),
        'rounded-full font-semibold tabular-nums',
      )}
      style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
    >
      <span
        className={cm.cn('material-symbols-outlined')}
        style={{ fontSize: 12 }}
        aria-hidden="true"
      >
        {TIER_ICON[tier]}
      </span>
      {t('relevancePill.percent', { value: display }, { defaultValue: `${display}%` })}
    </span>
  )
}
