import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Environment pill — uppercase mono tracking-widest tag with a
 * frosted-tint background and 1px ring. Used on every flag row and on
 * the FlagDetail header. Production / Staging / Development / Custom
 * map to the per-DESIGN.md tints.
 *
 * Translated from database-admin's EnvBadge component, recoloured to
 * Pennant's flag-killed (production) / rollout-partial (staging) /
 * flag-on (development) / accent (custom) palette.
 */

export type EnvTone = 'production' | 'staging' | 'development' | 'custom'

const TONE: Record<EnvTone, { bg: string; text: string; ring: string }> = {
  production: {
    bg: 'color-mix(in srgb, var(--color-flag-killed) 12%, transparent)',
    text: 'var(--color-error-chip-text)',
    ring: 'color-mix(in srgb, var(--color-flag-killed) 30%, transparent)',
  },
  staging: {
    bg: 'color-mix(in srgb, var(--color-rollout-partial) 12%, transparent)',
    text: 'var(--color-rollout-partial)',
    ring: 'color-mix(in srgb, var(--color-rollout-partial) 30%, transparent)',
  },
  development: {
    bg: 'var(--color-emerald-chip-bg)',
    text: 'var(--color-emerald-chip-text)',
    ring: 'var(--color-success-banner-border)',
  },
  custom: {
    bg: 'var(--color-accent-chip-bg)',
    text: 'var(--color-accent-chip-text)',
    ring: 'color-mix(in srgb, var(--color-accent) 30%, transparent)',
  },
}

const DEFAULT_LABEL: Record<EnvTone, string> = {
  production: 'Production',
  staging: 'Staging',
  development: 'Development',
  custom: 'Custom',
}

interface EnvironmentBadgeProps {
  tone: EnvTone
  /** Override the auto-translated label. */
  label?: string
  /** Compact 9px variant for inline tags inside a tight row. */
  compact?: boolean
}

export function EnvironmentBadge({ tone, label, compact = false }: EnvironmentBadgeProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const palette = TONE[tone]
  const text = label ?? t(`environmentBadge.${tone}`, {}, { defaultValue: DEFAULT_LABEL[tone] })

  return (
    <span
      data-mol-id={`environment-badge-${tone}`}
      className={cm.cn(
        'inline-flex items-center font-mono font-black uppercase tracking-widest rounded-full',
        compact ? 'px-1.5 py-0 text-[9px]' : 'px-2.5 py-0.5 text-[10px]',
      )}
      style={{
        backgroundColor: palette.bg,
        color: palette.text,
        boxShadow: `inset 0 0 0 1px ${palette.ring}`,
      }}
    >
      {text}
    </span>
  )
}
