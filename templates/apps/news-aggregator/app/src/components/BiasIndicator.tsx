import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface BiasIndicatorProps {
  /** -1 (far left) → 0 (center) → +1 (far right). */
  value: number
  /** "compact" → small badge with dot; "spectrum" → full horizontal scale. */
  variant?: 'compact' | 'spectrum'
  /** Render the spectrum without the trailing label text. */
  hideLabel?: boolean
}

const TONE_BG = [
  // -1.0 → -0.6 → ... → 1.0
  'bg-blue-600',
  'bg-blue-400',
  'bg-slate-400',
  'bg-amber-400',
  'bg-red-500',
] as const

function bucketFor(value: number): number {
  if (value <= -0.6) return 0
  if (value <= -0.2) return 1
  if (value < 0.2) return 2
  if (value < 0.6) return 3
  return 4
}

const BUCKET_LABELS = ['Left', 'Lean Left', 'Center', 'Lean Right', 'Right'] as const
const BUCKET_KEYS = ['left', 'leanLeft', 'center', 'leanRight', 'right'] as const

/**
 * Resolves a bias value to its bucket's i18n key + English fallback so
 * sibling surfaces (StoryDetail coverage pills, SourceDetail stat card)
 * share the exact same thresholds and translated labels as the indicator.
 * Render with `t(\`biasIndicator.\${key}\`, {}, { defaultValue: defaultLabel })`.
 */
export function biasBucket(value: number): {
  key: (typeof BUCKET_KEYS)[number]
  defaultLabel: (typeof BUCKET_LABELS)[number]
} {
  const bucket = bucketFor(Math.max(-1, Math.min(1, value)))
  return { key: BUCKET_KEYS[bucket], defaultLabel: BUCKET_LABELS[bucket] }
}

/**
 * Bias awareness indicator — Vantage's signature multi-source feature.
 * "compact" renders a labeled dot pill (used in story-list bylines), and
 * "spectrum" renders a horizontal scale with a triangular cursor (used on
 * story-detail and source-detail pages).
 *
 * No direct sibling translation — Vantage-specific to DESIGN.md's "Source
 * attribution and bias indicators" constraint. Visual treatment borrows
 * from the polished status-pill recipe (10px font-black uppercase, rounded
 * pill) used across crm/ActivityFeed and personal-finance status badges.
 */
export function BiasIndicator({ value, variant = 'compact', hideLabel }: BiasIndicatorProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const clamped = Math.max(-1, Math.min(1, value))
  const bucket = bucketFor(clamped)
  const label = t(
    `biasIndicator.${BUCKET_KEYS[bucket]}`,
    {},
    { defaultValue: BUCKET_LABELS[bucket] },
  )
  const cursorPct = ((clamped + 1) / 2) * 100

  if (variant === 'compact') {
    return (
      <span
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          cm.sp('px', 2),
          cm.roundedFull,
          'text-[10px] font-black uppercase tracking-widest bg-surface-container-low text-on-surface-variant',
        )}
        aria-label={t(
          'biasIndicator.ariaCompact',
          { label },
          { defaultValue: 'Average bias: {{label}}' },
        )}
      >
        <span
          className={cm.cn(cm.w(2), cm.h(2), cm.roundedFull, TONE_BG[bucket])}
          aria-hidden="true"
        />
        {label}
      </span>
    )
  }

  return (
    <div
      className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), cm.w('full'))}
      role="img"
      aria-label={t(
        'biasIndicator.ariaSpectrum',
        { label },
        { defaultValue: 'Source bias spectrum, average leans {{label}}' },
      )}
    >
      <div
        className={
          'relative h-2 rounded-full overflow-hidden bg-gradient-to-r from-blue-600 via-slate-300 to-red-500'
        }
      >
        <div
          className={'absolute -top-1 w-3 h-4 rounded-sm bg-on-surface shadow-md'}
          style={{ left: `calc(${cursorPct}% - 6px)` }}
          aria-hidden="true"
        />
      </div>
      <div
        className={cm.cn(
          cm.flex({ justify: 'between' }),
          cm.textSize('xs'),
          'text-on-surface-variant font-semibold uppercase tracking-widest',
        )}
      >
        <span>{t('biasIndicator.left', {}, { defaultValue: 'Left' })}</span>
        {!hideLabel && <span className="text-on-surface font-bold">{label}</span>}
        <span>{t('biasIndicator.right', {}, { defaultValue: 'Right' })}</span>
      </div>
    </div>
  )
}

export default BiasIndicator
