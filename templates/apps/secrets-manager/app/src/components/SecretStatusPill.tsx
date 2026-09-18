import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Secret-state pill — uppercase mono tracking-widest tag with a frosted
 * tint background and 1px ring keyed to Arcanum's per-state palette
 * (active / expiring / expired / revoked / inherited / masked / env).
 *
 * Translated from database-admin's EnvBadge.tsx (catalog §2.3 status
 * pill) recoloured to Arcanum's DESIGN.md "Semantic" palette: emerald
 * for `active`, amber for `expiring`, orange for `expired`, red for
 * `revoked`, sky-blue for `inherited`, slate for `masked`, plus the
 * three environment tones DEV / STAGING / PROD used by the
 * EnvironmentSwitcher.
 */

export type SecretStatusTone =
  | 'active'
  | 'expiring'
  | 'expired'
  | 'revoked'
  | 'inherited'
  | 'masked'
  | 'dev'
  | 'staging'
  | 'production'
  | 'pending'

const TONE: Record<SecretStatusTone, { bg: string; text: string; ring: string }> = {
  active: {
    bg: 'color-mix(in srgb, var(--color-secret-active) 12%, transparent)',
    text: 'var(--color-secret-active)',
    ring: 'color-mix(in srgb, var(--color-secret-active) 32%, transparent)',
  },
  expiring: {
    bg: 'color-mix(in srgb, var(--color-secret-expiring) 12%, transparent)',
    text: 'var(--color-secret-expiring)',
    ring: 'color-mix(in srgb, var(--color-secret-expiring) 32%, transparent)',
  },
  expired: {
    bg: 'color-mix(in srgb, var(--color-secret-expired) 12%, transparent)',
    text: 'var(--color-secret-expired)',
    ring: 'color-mix(in srgb, var(--color-secret-expired) 32%, transparent)',
  },
  revoked: {
    bg: 'color-mix(in srgb, var(--color-secret-revoked) 12%, transparent)',
    text: 'var(--color-secret-revoked)',
    ring: 'color-mix(in srgb, var(--color-secret-revoked) 32%, transparent)',
  },
  inherited: {
    bg: 'color-mix(in srgb, var(--color-secret-inherited) 12%, transparent)',
    text: 'var(--color-secret-inherited)',
    ring: 'color-mix(in srgb, var(--color-secret-inherited) 32%, transparent)',
  },
  masked: {
    bg: 'color-mix(in srgb, var(--color-secret-masked) 16%, transparent)',
    text: 'var(--color-secret-masked)',
    ring: 'color-mix(in srgb, var(--color-secret-masked) 36%, transparent)',
  },
  dev: {
    bg: 'color-mix(in srgb, var(--color-sky) 12%, transparent)',
    text: 'var(--color-sky)',
    ring: 'color-mix(in srgb, var(--color-sky) 32%, transparent)',
  },
  staging: {
    bg: 'color-mix(in srgb, var(--color-violet) 12%, transparent)',
    text: 'var(--color-violet)',
    ring: 'color-mix(in srgb, var(--color-violet) 32%, transparent)',
  },
  production: {
    bg: 'color-mix(in srgb, var(--color-red) 12%, transparent)',
    text: 'var(--color-red)',
    ring: 'color-mix(in srgb, var(--color-red) 40%, transparent)',
  },
  pending: {
    bg: 'color-mix(in srgb, var(--color-secret-masked) 16%, transparent)',
    text: 'var(--color-secret-masked)',
    ring: 'color-mix(in srgb, var(--color-secret-masked) 32%, transparent)',
  },
}

const DEFAULT_LABEL: Record<SecretStatusTone, string> = {
  active: 'Active',
  expiring: 'Expiring',
  expired: 'Expired',
  revoked: 'Revoked',
  inherited: 'Inherited',
  masked: 'Masked',
  dev: 'Dev',
  staging: 'Staging',
  production: 'Prod',
  pending: 'Pending',
}

interface SecretStatusPillProps {
  tone: SecretStatusTone
  /** Override the auto-translated label. */
  label?: string
  /** Compact 9px variant for inline tags inside dense rows. */
  compact?: boolean
}

export function SecretStatusPill({ tone, label, compact = false }: SecretStatusPillProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const palette = TONE[tone]
  const text = label ?? t(`secretStatusPill.${tone}`, {}, { defaultValue: DEFAULT_LABEL[tone] })

  return (
    <span
      data-mol-id={`secret-status-pill-${tone}`}
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
