/**
 * Category card — anchor entry on the CategoriesList page. Per DESIGN.md:
 * 32-icon left, name + description center, stats right, with a colored left
 * border accent that reflects the category's brand color. Hover lifts and
 * tints the border into the indigo-primary.
 *
 * Translated from personal-finance's DashboardAccountOverview tile (icon
 * tile + label + value + soft surface) and blog's PostListItem (group
 * hover + uppercase tracking-widest stat row).
 */
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface CategoryCardProps {
  slug: string
  name: string
  description: string
  icon?: string
  color?: string
  threadCount: number
  postCount: number
  lastActivityAt?: string
  lastThreadTitle?: string
  status?: 'live' | 'pinned' | 'archived'
}

const STATUS_LABEL: Record<NonNullable<CategoryCardProps['status']>, string> = {
  live: 'Live',
  pinned: 'Pinned',
  archived: 'Archived',
}

const STATUS_TONE: Record<NonNullable<CategoryCardProps['status']>, string> = {
  live: 'bg-success-light text-success',
  pinned: 'bg-warning-light text-warning',
  archived: 'bg-surface-secondary text-foreground-secondary',
}

const formatCompact = (n: number | undefined | null) => {
  const v = typeof n === 'number' && Number.isFinite(n) ? n : 0
  return v >= 1000 ? `${(v / 1000).toFixed(1).replace(/\.0$/, '')}k` : v.toLocaleString()
}

const formatRelative = (iso?: string) => {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return iso
  const diff = Math.max(Date.now() - then, 0)
  const minutes = Math.round(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function CategoryCard({
  slug,
  name,
  description,
  icon = 'forum',
  color = 'var(--mol-color-primary)',
  threadCount,
  postCount,
  lastActivityAt,
  lastThreadTitle,
  status = 'live',
}: CategoryCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <Link
      to={`/c/${slug}`}
      className={cm.cn(
        cm.flex({ align: 'stretch', gap: 'lg' }),
        cm.sp('p', 5),
        // Stats wrap BELOW the text on phones (a side column crushed the
        // name into mid-word breaks at 390px); side-by-side from sm up.
        'group relative flex-wrap overflow-hidden rounded-2xl bg-surface-container-lowest border border-outline-variant/40 shadow-sm hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/10 hover:border-primary/40 transition-all',
      )}
    >
      <div
        aria-hidden
        className={cm.cn('absolute inset-y-0 left-0 w-1.5')}
        style={{ background: color }}
      />
      <div
        className={cm.cn(
          cm.w(12),
          cm.h(12),
          cm.flex({ align: 'center', justify: 'center' }),
          cm.roundedFull,
          'shrink-0 ml-2 text-white shadow-sm shadow-primary/30 transition-transform group-hover:scale-105',
        )}
        style={{ background: color }}
      >
        <span className="material-symbols-outlined" aria-hidden>
          {icon}
        </span>
      </div>
      <div className={cm.cn(cm.flex1, cm.stack(2), 'min-w-0')}>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
          <h3
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('bold'),
              // Wrap whole words to two lines instead of truncating: category
              // names are the primary scan target on a phone.
              'text-on-surface group-hover:text-primary transition-colors line-clamp-2',
            )}
          >
            {name}
          </h3>
          <span
            className={cm.cn(
              cm.sp('px', 2),
              cm.fontWeight('bold'),
              cm.roundedFull,
              'py-0.5 text-[10px] uppercase tracking-widest',
              STATUS_TONE[status],
            )}
          >
            {t(`categoryCard.status.${status}`, {}, { defaultValue: STATUS_LABEL[status] })}
          </span>
        </div>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant line-clamp-2')}>
          {description}
        </p>
        {lastThreadTitle && (
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant truncate')}>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-primary mr-2',
              )}
            >
              {t('categoryCard.latestLabel', {}, { defaultValue: 'Latest' })}
            </span>
            {lastThreadTitle}
          </p>
        )}
      </div>
      <div
        className={cm.cn(
          'flex w-full flex-row items-end justify-between gap-4 border-t border-outline-variant/20 pt-3 sm:w-auto sm:flex-col sm:items-end sm:gap-2 sm:border-t-0 sm:pt-0',
        )}
      >
        <div className={cm.cn(cm.textRight)}>
          <p
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('categoryCard.threadsLabel', {}, { defaultValue: 'Threads' })}
          </p>
          <p className={cm.cn('text-2xl font-extrabold tabular-nums text-on-surface')}>
            {formatCompact(threadCount)}
          </p>
        </div>
        <div className={cm.cn(cm.textRight)}>
          <p
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('categoryCard.postsLabel', {}, { defaultValue: 'Posts' })}
          </p>
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'tabular-nums text-on-surface-variant',
            )}
          >
            {formatCompact(postCount)}
          </p>
        </div>
        {lastActivityAt && (
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {formatRelative(lastActivityAt)}
          </p>
        )}
      </div>
    </Link>
  )
}

export default CategoryCard
