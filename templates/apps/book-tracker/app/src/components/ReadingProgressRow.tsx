import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BookCover } from './BookCover.js'

/**
 * Currently-reading row — cover, title + author, a progress bar with
 * page counts, and an inline "log progress" quick action. Hover lift.
 *
 * Adapted from habit-tracker/HabitChecklistRow.tsx (left-icon + title +
 * meta + right-metric layout); the toggle becomes a progress input.
 */

interface ReadingProgressRowProps {
  id: string
  title: string
  author: string
  coverStyle: string | null
  pageCount: number
  currentPage: number
  percent: number
  onLog: (page: number) => void
  busy?: boolean
}

export function ReadingProgressRow({
  id,
  title,
  author,
  coverStyle,
  pageCount,
  currentPage,
  percent,
  onLog,
  busy = false,
}: ReadingProgressRowProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'md' }),
        cm.sp('p', 4),
        'bg-surface-container-lowest hover:bg-surface-container-low rounded-2xl transition-all shadow-sm',
      )}
    >
      <Link to={`/books/${id}`} className={cm.cn(cm.shrink0)} aria-label={title}>
        <BookCover title={title} author={author} coverStyle={coverStyle} size="sm" />
      </Link>

      <Link to={`/books/${id}`} className={cm.cn(cm.flex1, 'min-w-0')}>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <span
            className={cm.cn(
              cm.textSize('base'),
              cm.fontWeight('bold'),
              'truncate text-on-surface',
            )}
          >
            {title}
          </span>
        </div>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.sp('mt', 1),
            cm.fontWeight('medium'),
            'text-on-surface-variant truncate',
          )}
        >
          {author}
        </p>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mt', 2))}>
          <div className={cm.cn('h-2 flex-1 rounded-full bg-surface-container overflow-hidden')}>
            <div
              className={cm.cn('h-full rounded-full')}
              style={{
                width: `${Math.min(100, percent)}%`,
                background:
                  'linear-gradient(90deg, var(--color-gradient-hero-start), var(--color-gradient-hero-end))',
              }}
            />
          </div>
          <span
            className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), 'text-on-surface-variant')}
          >
            {t(
              'readingProgressRow.pages',
              { current: currentPage, total: pageCount },
              { defaultValue: '{{current}}/{{total}} pp' },
            )}
          </span>
        </div>
      </Link>

      <form
        className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.shrink0)}
        onSubmit={(e) => {
          e.preventDefault()
          const form = e.currentTarget
          const input = form.elements.namedItem('page') as HTMLInputElement | null
          if (input) {
            onLog(Number(input.value))
            input.value = ''
          }
        }}
      >
        <input
          type="number"
          name="page"
          min={currentPage}
          max={pageCount}
          defaultValue={currentPage || ''}
          disabled={busy}
          data-mol-id={`progress-input-${id}`}
          aria-label={t(
            'readingProgressRow.logAria',
            { title },
            { defaultValue: 'Current page in {{title}}' },
          )}
          className={cm.cn(
            cm.w(16),
            cm.sp('px', 2),
            cm.sp('py', 1),
            cm.textSize('sm'),
            'text-center border-2 border-outline-variant rounded-lg bg-surface text-on-surface focus:border-primary focus:outline-none transition-colors',
          )}
        />
        <button
          type="submit"
          disabled={busy}
          data-mol-id={`progress-log-${id}`}
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'rounded-full bg-primary text-on-primary hover:opacity-90 disabled:opacity-50',
          )}
        >
          {t('readingProgressRow.log', {}, { defaultValue: 'Log' })}
        </button>
      </form>
    </div>
  )
}
