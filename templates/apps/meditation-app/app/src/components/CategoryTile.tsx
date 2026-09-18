import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type CategoryTone, getCategoryAccent } from '../lib/categoryTone.js'

interface CategoryTileProps {
  category: CategoryTone
  /** Translated label ("Sleep", "Focus", …). */
  label: string
  /** Number of sessions in the category. */
  sessionCount: number
  /** Optional one-line description. */
  description?: string
  /** Search filter target — usually `/library?category=sleep`. */
  to: string
}

/**
 * Color-tinted category tile used on Library + Home category strips.
 *
 * Translated from personal-finance/CategoryCard.tsx (rounded-2xl tile with
 * a colored icon + uppercase label) — uses the per-category soft-tint
 * background and a hover lift to feel like a calm, tactile button.
 */
export function CategoryTile({
  category,
  label,
  sessionCount,
  description,
  to,
}: CategoryTileProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const accent = getCategoryAccent(category)

  return (
    <Link
      to={to}
      className={cm.cn(
        cm.flex({ direction: 'col', gap: 'sm' }),
        cm.sp('p', 5),
        'rounded-2xl shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all border border-outline/20 group',
      )}
      style={{ backgroundColor: accent.softBg }}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          'w-12 h-12 rounded-full bg-surface shadow-sm group-hover:scale-110 transition-transform',
        )}
        style={{ color: accent.fg }}
      >
        <span
          aria-hidden="true"
          className={cm.cn('material-symbols-outlined text-2xl')}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {accent.icon}
        </span>
      </div>
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
        <span
          className={cm.cn(cm.fontWeight('bold'), 'text-[10px] uppercase tracking-widest')}
          style={{ color: accent.fg }}
        >
          {t(
            'categoryTile.sessionCount',
            { count: sessionCount },
            { defaultValue: '{{count}} sessions' },
          )}
        </span>
        <h3 className={cm.cn(cm.fontWeight('bold'), 'text-xl text-on-surface tracking-tight')}>
          {label}
        </h3>
        {description ? (
          // on-surface (not -variant): descriptions sit on per-category pastel
          // softBg tints where the muted token dips under 4.5:1 (axe serious).
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface leading-relaxed')}>
            {description}
          </p>
        ) : null}
      </div>
    </Link>
  )
}
