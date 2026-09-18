/**
 * CategoryCard — grid item for /categories.
 *
 * Layout: 4px colored top accent → 40px circular emoji/icon → name + 2-line
 * description → subscriber + active-now stats.
 *
 * Translated from blog/TagsTableSection table-row treatment fused with
 * personal-finance/AccountCard.tsx tile presentation.
 */
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface CategoryCardData {
  slug: string
  name: string
  description: string
  emoji?: string
  icon?: string
  subscribers: number
  activeNow?: number
  accentColor?: string
}

interface CategoryCardProps {
  category: CategoryCardData
  /**
   * Override destination URL. Used on the marketing landing page where
   * sample categories don't yet exist in the DB and clicking through
   * should funnel to /signup instead of a 404.
   */
  href?: string
}

function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`
  return String(value)
}

export function CategoryCard({ category, href }: CategoryCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const accentHex = category.accentColor
  const accent = accentHex ?? 'var(--color-primary)'

  return (
    <Link
      to={href ?? `/c/${category.slug}`}
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        'group relative overflow-hidden rounded-xl border border-outline-variant/40 bg-surface hover:bg-surface-container-low/40 hover:border-primary/30 hover:shadow-sm transition-all',
      )}
    >
      <span
        className={cm.cn('absolute top-0 left-0 right-0 h-1')}
        style={{ backgroundColor: accent }}
        aria-hidden="true"
      />
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), cm.sp('p', 5))}>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(12),
            cm.h(12),
            cm.roundedFull,
            cm.fontWeight('bold'),
            'shrink-0 text-xl',
          )}
          style={{
            backgroundColor: accentHex
              ? `${accentHex}1f`
              : 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
            color: accent,
          }}
          aria-hidden="true"
        >
          {category.emoji ?? (
            <span className="material-symbols-outlined">{category.icon ?? 'forum'}</span>
          )}
        </div>
        <div className={cm.cn(cm.flex1, cm.flex({ direction: 'col', gap: 'xs' }), 'min-w-0')}>
          <span
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.textSize('base'),
              'text-on-surface group-hover:text-primary transition-colors truncate',
            )}
          >
            {t('categoryCard.namePrefix', {}, { defaultValue: 'c/' })}
            {category.name}
          </span>
          <p
            className={cm.cn(
              cm.textSize('sm'),
              'text-on-surface-variant leading-snug line-clamp-2',
            )}
          >
            {category.description}
          </p>
        </div>
      </div>
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
          cm.sp('px', 5),
          cm.sp('py', 3),
          cm.textSize('xs'),
          cm.fontWeight('medium'),
          'border-t border-outline-variant/30 bg-surface-container-low/40 text-on-surface-variant',
        )}
      >
        <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
          <span className={cm.cn('material-symbols-outlined', cm.textSize('sm'))}>groups</span>
          {t(
            'categoryCard.subscribers',
            { count: formatNumber(category.subscribers) },
            { defaultValue: '{{count}} members' },
          )}
        </span>
        {typeof category.activeNow === 'number' && (
          <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
            <span
              className={cm.cn(cm.w(2), cm.h(2), cm.roundedFull, 'inline-block')}
              style={{ backgroundColor: 'var(--color-resolved, var(--color-resolved))' }}
              aria-hidden="true"
            />
            {t(
              'categoryCard.activeNow',
              { count: formatNumber(category.activeNow) },
              { defaultValue: '{{count}} active' },
            )}
          </span>
        )}
      </div>
    </Link>
  )
}

export default CategoryCard
