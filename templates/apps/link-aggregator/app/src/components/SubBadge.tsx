/**
 * Sub-community card with circular monogram, name, member/post counts,
 * and a join/leave toggle. Hover lift + soft purple tint.
 *
 * Translated from personal-finance/AccountCard.tsx — the small community
 * card used to populate Subs / sidebar trending lists.
 */
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface SubSummary {
  slug: string
  name: string
  description?: string
  member_count: number
  post_count?: number
  joined?: boolean
  /** Optional accent color hex (used for the monogram). */
  accent?: string
}

export interface SubBadgeProps {
  sub: SubSummary
  variant?: 'card' | 'row'
  onJoin?: (slug: string) => void
}

export function SubBadge({ sub, variant = 'card', onJoin }: SubBadgeProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const initial = sub.name.charAt(0).toUpperCase()
  const accent = sub.accent || pickAccent(sub.slug)

  if (variant === 'row') {
    return (
      <Link
        to={`/subs/${sub.slug}`}
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.sp('p', 2),
          'rounded-lg hover:bg-primary/5 transition-colors group',
        )}
      >
        <Monogram letter={initial} accent={accent} size={32} />
        <div className={cm.cn(cm.flex({ direction: 'col' }), 'flex-1 min-w-0')}>
          <span
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'text-on-surface group-hover:text-primary transition-colors truncate',
            )}
          >
            c/{sub.name}
          </span>
          <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums')}>
            {t(
              'subBadge.memberCount',
              { count: formatCount(sub.member_count) },
              { defaultValue: '{{count}} members' },
            )}
          </span>
        </div>
      </Link>
    )
  }

  return (
    <article
      className={cm.cn(
        cm.flex({ direction: 'col', gap: 'sm' }),
        cm.sp('p', 5),
        'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-md transition-all group',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
        <Monogram letter={initial} accent={accent} size={48} />
        <div className={cm.cn(cm.flex({ direction: 'col' }), 'flex-1 min-w-0')}>
          <Link
            to={`/subs/${sub.slug}`}
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('lg'),
              'text-on-surface group-hover:text-primary transition-colors truncate',
            )}
          >
            c/{sub.name}
          </Link>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'text-on-surface-variant uppercase tracking-widest tabular-nums',
            )}
          >
            {t(
              'subBadge.memberCount',
              { count: formatCount(sub.member_count) },
              { defaultValue: '{{count}} members' },
            )}
          </span>
        </div>
      </div>
      {sub.description && (
        <p
          className={cm.cn(
            cm.textSize('sm'),
            'text-on-surface-variant line-clamp-2 leading-relaxed',
          )}
        >
          {sub.description}
        </p>
      )}
      {onJoin && (
        <button
          type="button"
          onClick={() => onJoin(sub.slug)}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.roundedFull,
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest transition-colors',
            sub.joined
              ? 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              : 'bg-primary text-on-primary hover:bg-primary-hover',
          )}
          aria-pressed={!!sub.joined}
        >
          {sub.joined
            ? t('subBadge.joined', {}, { defaultValue: 'Joined' })
            : t('subBadge.join', {}, { defaultValue: 'Join' })}
        </button>
      )}
    </article>
  )
}

function Monogram({ letter, accent, size }: { letter: string; accent: string; size: number }) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'center' }),
        cm.fontWeight('bold'),
        cm.roundedFull,
        'text-white shrink-0',
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: `linear-gradient(135deg, ${accent}, ${darken(accent, 12)})`,
      }}
      aria-hidden="true"
    >
      {letter}
    </div>
  )
}

function pickAccent(seed: string): string {
  const palette = ['#6d28d9', '#ea580c', '#0d9488', '#d97706', '#2563eb', '#db2777']
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return palette[hash % palette.length]
}

function darken(hex: string, percent: number): string {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  if (!m) return hex
  const r = Math.max(0, Math.round(parseInt(m[1], 16) * (1 - percent / 100)))
  const g = Math.max(0, Math.round(parseInt(m[2], 16) * (1 - percent / 100)))
  const b = Math.max(0, Math.round(parseInt(m[3], 16) * (1 - percent / 100)))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

export default SubBadge
