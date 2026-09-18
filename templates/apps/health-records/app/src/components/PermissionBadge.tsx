import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Permission badge — pill with role-coloured background per DESIGN.md
 * "Permission badges use four variants (owner / caregiver / provider /
 * readonly) with specific bg colors". Used on Sharing, InviteShare,
 * RecordDetail, and VisitDetail right-rail to communicate who has
 * access at a glance.
 *
 * Translated from helpdesk-ticketing's StatusPill + medication-reminder's
 * status pill colour-token pattern — same uppercase tracking-widest
 * 10px pill chrome, recoloured to Meridian's permission palette.
 */
export type PermissionVariant = 'owner' | 'caregiver' | 'provider' | 'readonly'

export interface PermissionBadgeProps {
  variant: PermissionVariant
  /** Optional override label; defaults to localised variant name. */
  label?: string
  /** Render compact (no leading icon). */
  compact?: boolean
}

const VARIANT_BG: Record<PermissionVariant, string> = {
  owner: 'color-mix(in srgb, var(--color-perm-owner) 18%, white)',
  caregiver: 'color-mix(in srgb, var(--color-perm-caregiver) 18%, white)',
  provider: 'color-mix(in srgb, var(--color-perm-provider) 18%, white)',
  readonly: 'color-mix(in srgb, var(--color-perm-readonly) 18%, white)',
}

const VARIANT_TEXT: Record<PermissionVariant, string> = {
  owner: 'var(--color-perm-owner)',
  caregiver: 'var(--color-perm-caregiver)',
  provider: 'var(--color-perm-provider)',
  readonly: 'var(--color-perm-readonly)',
}

const VARIANT_ICON: Record<PermissionVariant, string> = {
  owner: 'admin_panel_settings',
  caregiver: 'family_restroom',
  provider: 'medical_services',
  readonly: 'visibility',
}

export function PermissionBadge({ variant, label, compact = false }: PermissionBadgeProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const text =
    label ??
    t(
      `permissionBadge.${variant}`,
      {},
      {
        defaultValue:
          variant === 'owner'
            ? 'Owner'
            : variant === 'caregiver'
              ? 'Caregiver'
              : variant === 'provider'
                ? 'Provider'
                : 'Read only',
      },
    )

  return (
    <span
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'xs' }),
        cm.fontWeight('bold'),
        'px-3 py-1 text-[10px] uppercase tracking-widest rounded-full',
      )}
      style={{
        backgroundColor: VARIANT_BG[variant],
        color: VARIANT_TEXT[variant],
      }}
    >
      {!compact && (
        <span className={cm.cn('material-symbols-outlined text-xs')} aria-hidden="true">
          {VARIANT_ICON[variant]}
        </span>
      )}
      {text}
    </span>
  )
}

export default PermissionBadge
