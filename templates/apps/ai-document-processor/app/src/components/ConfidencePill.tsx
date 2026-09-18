import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface ConfidencePillProps {
  /** Confidence value 0..1 (or 0..100 — both ranges are auto-detected). */
  value: number
  /** When true, renders as a small ring with the percent number centered. */
  variant?: 'pill' | 'ring'
  /** Override sentence around the value, e.g. `"{{value}}% accuracy"`. */
  label?: string
}

type Tier = 'high' | 'medium' | 'low'

const TIER_COLOR: Record<Tier, string> = {
  high: 'var(--color-success)',
  medium: 'var(--color-warning)',
  low: 'var(--color-error)',
}

function tierFor(pct: number): Tier {
  if (pct >= 90) return 'high'
  if (pct >= 70) return 'medium'
  return 'low'
}

/**
 * Confidence indicator — pill (default) or 32px ring — colored green / amber / red
 * per DESIGN.md "OCR Confidence" thresholds (>=90, >=70, <70).
 *
 * Translated from banking-dashboard's tabular-numeric balance pill pattern; ring
 * variant inspired by ai-chatbot-builder's KPI rings.
 */
export function ConfidencePill({ value, variant = 'pill', label }: ConfidencePillProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const pct = Math.max(0, Math.min(100, value <= 1 ? value * 100 : value))
  const tier = tierFor(pct)
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
          'confidencePill.ringAria',
          { value: display },
          { defaultValue: `${display}% confidence` },
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
      style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}
    >
      <span
        className={cm.cn('material-symbols-outlined')}
        style={{ fontSize: 12 }}
        aria-hidden="true"
      >
        {tier === 'high' ? 'verified' : tier === 'medium' ? 'help' : 'warning'}
      </span>
      {label
        ? t(
            'confidencePill.labeled',
            { value: display },
            { defaultValue: label.replace('{{value}}', display) },
          )
        : t('confidencePill.percent', { value: display }, { defaultValue: `${display}%` })}
    </span>
  )
}
