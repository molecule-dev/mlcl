import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Compact teammate card — circular initials avatar with department-tinted
 * background, name, role line, and contact CTA. Hover lifts and primaries the
 * border accent.
 *
 * Translated from crm/ContactRow.tsx (avatar + role row + ghost CTA) — adapted
 * to Embark's "Team Member Row" spec from DESIGN.md.
 */

export interface TeamMemberCardProps {
  id: string
  name: string
  role: string
  department?: string
  /** Initials override; falls back to first letters of name. */
  initials?: string
  /** Optional avatar image URL. */
  avatarUrl?: string
  /** Whether this teammate is also onboarding (mutual context). */
  isPeer?: boolean
  /** Optional href; defaults to /team/:id. */
  href?: string
}

const DEPT_PALETTE: Record<string, { bg: string; fg: string }> = {
  engineering: { bg: 'rgba(13, 148, 136, 0.14)', fg: '#0f766e' },
  product: { bg: 'rgba(139, 92, 246, 0.14)', fg: '#6d28d9' },
  design: { bg: 'rgba(236, 72, 153, 0.14)', fg: '#db2777' },
  sales: { bg: 'rgba(232, 147, 22, 0.14)', fg: '#92400e' },
  marketing: { bg: 'rgba(37, 99, 235, 0.14)', fg: '#1d4ed8' },
  hr: { bg: 'rgba(22, 163, 74, 0.14)', fg: '#166534' },
  default: { bg: 'rgba(100, 116, 139, 0.14)', fg: '#556377' },
}

function paletteFor(dept?: string) {
  if (!dept) return DEPT_PALETTE.default
  return DEPT_PALETTE[dept.toLowerCase()] ?? DEPT_PALETTE.default
}

export function TeamMemberCard({
  id,
  name,
  role,
  department,
  initials,
  avatarUrl,
  isPeer,
  href,
}: TeamMemberCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const palette = paletteFor(department)
  const fallback =
    initials ??
    name
      .split(' ')
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()

  return (
    <Link
      to={href ?? `/team/${id}`}
      data-mol-id={`team-card-${id}`}
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'md' }),
        cm.sp('p', 4),
        'rounded-xl shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
      )}
      style={{
        background: 'var(--color-surface, var(--mol-color-surface))',
        border: '1px solid var(--color-border, var(--mol-color-background-tertiary))',
        minWidth: 0,
      }}
    >
      <div
        aria-hidden
        className={cm.cn(cm.flex({ align: 'center', justify: 'center' }))}
        style={{
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          background: avatarUrl ? `url(${avatarUrl}) center/cover` : palette.bg,
          color: palette.fg,
          fontWeight: 700,
          fontSize: '16px',
          flexShrink: 0,
          border: `2px solid var(--color-surface, var(--mol-color-surface))`,
          boxShadow: '0 0 0 2px var(--color-border, #e2e8f0)',
        }}
      >
        {!avatarUrl && fallback}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <p
            className={cm.fontWeight('semibold')}
            style={{ fontSize: '15px', color: 'var(--color-foreground, #0f172a)' }}
          >
            {name}
          </p>
          {isPeer && (
            <span
              className="text-[9px] font-black uppercase tracking-[0.18em]"
              style={{
                color: 'var(--mol-color-primary)',
                background: 'rgba(13, 148, 136, 0.12)',
                padding: '2px 8px',
                borderRadius: '999px',
              }}
            >
              {t('teamMemberCard.peerLabel', {}, { defaultValue: 'Cohort' })}
            </span>
          )}
        </div>
        <p className={cm.cn(cm.textMuted, 'text-xs')} style={{ marginTop: '2px' }}>
          {role}
          {department && (
            <>
              <span style={{ margin: '0 6px', opacity: 0.5 }}>•</span>
              <span style={{ color: palette.fg, fontWeight: 600 }}>{department}</span>
            </>
          )}
        </p>
      </div>
      <span
        className="material-symbols-outlined text-on-surface-variant transition-colors"
        style={{ fontSize: '20px', flexShrink: 0 }}
      >
        arrow_forward
      </span>
    </Link>
  )
}
