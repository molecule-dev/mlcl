import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Environment / status pill — uppercase mono tracking-widest tag with
 * frosted-tint background and 1px ring. Used on every connection card
 * (Production / Staging / Dev) and on the connection drawer.
 *
 * Translated from the §2.3 catalog status-pill recipe, recoloured to
 * Quarry's per-environment + per-state semantics from DESIGN.md.
 */

export type EnvTone =
  'production' | 'staging' | 'dev' | 'readonly' | 'connected' | 'disconnected' | 'slow' | 'archived'

const TONE: Record<EnvTone, { bg: string; text: string; ring: string }> = {
  production: {
    bg: 'color-mix(in srgb, var(--color-disconnected) 12%, transparent)',
    text: 'var(--color-disconnected)',
    ring: 'color-mix(in srgb, var(--color-disconnected) 30%, transparent)',
  },
  staging: {
    bg: 'color-mix(in srgb, var(--color-warn) 12%, transparent)',
    text: 'var(--color-warn)',
    ring: 'color-mix(in srgb, var(--color-warn) 30%, transparent)',
  },
  dev: {
    bg: 'color-mix(in srgb, var(--mol-color-info) 12%, transparent)',
    text: 'var(--mol-color-info)',
    ring: 'color-mix(in srgb, var(--mol-color-info) 30%, transparent)',
  },
  readonly: {
    bg: 'color-mix(in srgb, var(--mol-color-info) 12%, transparent)',
    text: 'var(--mol-color-info)',
    ring: 'color-mix(in srgb, var(--mol-color-info) 30%, transparent)',
  },
  connected: {
    bg: 'color-mix(in srgb, var(--color-connected) 12%, transparent)',
    text: 'var(--color-connected)',
    ring: 'color-mix(in srgb, var(--color-connected) 30%, transparent)',
  },
  disconnected: {
    bg: 'color-mix(in srgb, var(--color-disconnected) 12%, transparent)',
    text: 'var(--color-disconnected)',
    ring: 'color-mix(in srgb, var(--color-disconnected) 30%, transparent)',
  },
  slow: {
    bg: 'color-mix(in srgb, var(--color-warn) 12%, transparent)',
    text: 'var(--color-warn)',
    ring: 'color-mix(in srgb, var(--color-warn) 30%, transparent)',
  },
  archived: {
    bg: 'color-mix(in srgb, var(--color-on-surface-variant) 15%, transparent)',
    text: 'var(--color-on-surface-variant)',
    ring: 'color-mix(in srgb, var(--color-on-surface-variant) 35%, transparent)',
  },
}

const DEFAULT_LABEL: Record<EnvTone, string> = {
  production: 'Production',
  staging: 'Staging',
  dev: 'Dev',
  readonly: 'Read only',
  connected: 'Connected',
  disconnected: 'Disconnected',
  slow: 'Slow',
  archived: 'Archived',
}

interface EnvBadgeProps {
  tone: EnvTone
  /** Override the auto-translated label. */
  label?: string
  /** Compact 9px variant for inline tags. */
  compact?: boolean
}

export function EnvBadge({ tone, label, compact = false }: EnvBadgeProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const palette = TONE[tone]
  const text = label ?? t(`envBadge.${tone}`, {}, { defaultValue: DEFAULT_LABEL[tone] })

  return (
    <span
      data-mol-id={`env-badge-${tone}`}
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
