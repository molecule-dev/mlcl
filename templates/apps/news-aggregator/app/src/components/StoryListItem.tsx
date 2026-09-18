import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BiasIndicator } from './BiasIndicator.js'

interface StoryListItemProps {
  id: string
  headline: string
  excerpt?: string
  topic?: string
  topicSlug?: string
  sourceCount?: number
  /** -1 (left) → 0 (center) → +1 (right) — average bias across covering sources. */
  averageBias?: number
  publishedAt?: string
  imageUrl?: string | null
  /** When true, renders a subtle "saved" indicator dot. */
  saved?: boolean
  /** Whether to render the compact bias meter — the user's `showBiasMeters` pref. Defaults to true. */
  showBias?: boolean
}

function fmtAgo(iso?: string): string {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.round(ms / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h`
  const day = Math.round(hr / 24)
  return `${day}d`
}

/**
 * Editorial story row — left-aligned 16:9 thumbnail (when present), serif
 * headline, byline meta with topic pill + source-count + bias indicator,
 * hover lift transition.
 *
 * Translated from blog's PostListItem editorial pattern, with the
 * source-count + BiasIndicator chips wired to multi-source bias awareness
 * (the signature Vantage feature per DESIGN.md).
 */
export function StoryListItem({
  id,
  headline,
  excerpt,
  topic,
  topicSlug,
  sourceCount,
  averageBias,
  publishedAt,
  imageUrl,
  saved,
  showBias = true,
}: StoryListItemProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <article
      className={cm.cn(
        cm.flex({ gap: 'lg' }),
        cm.sp('p', 5),
        'bg-surface rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all border border-outline-variant/40',
      )}
    >
      {imageUrl && (
        <Link
          to={`/stories/${id}`}
          className={
            'hidden sm:block flex-shrink-0 rounded-lg overflow-hidden w-44 aspect-[16/10] bg-surface-container-low'
          }
        >
          <img
            src={imageUrl}
            alt=""
            loading="lazy"
            className={
              'w-full h-full object-cover hover:scale-105 transition-transform duration-300'
            }
          />
        </Link>
      )}
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'flex-1 min-w-0')}>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}>
          {topic && (
            <Link
              to={topicSlug ? `/topics/${topicSlug}` : '/topics'}
              className={cm.cn(
                cm.sp('px', 2),
                cm.roundedFull,
                'text-[10px] font-bold uppercase tracking-widest bg-primary/10 text-primary-dark dark:text-primary hover:bg-primary/20 transition-colors',
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {topic}
            </Link>
          )}
          {publishedAt && (
            <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums')}>
              {fmtAgo(publishedAt)}
            </span>
          )}
          {saved && (
            <span
              aria-label={t('common.saved', {}, { defaultValue: 'Saved' })}
              className={cm.cn('material-symbols-outlined text-secondary')}
              style={{ fontSize: '14px', fontVariationSettings: "'FILL' 1" }}
            >
              bookmark
            </span>
          )}
        </div>
        <Link to={`/stories/${id}`} className="group">
          <h3
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('bold'),
              'font-headline leading-snug text-on-surface group-hover:text-primary transition-colors line-clamp-2',
            )}
          >
            {headline}
          </h3>
        </Link>
        {excerpt && (
          <p
            className={cm.cn(
              cm.textSize('sm'),
              'text-on-surface-variant leading-relaxed line-clamp-2',
            )}
          >
            {excerpt}
          </p>
        )}
        <div
          className={cm.cn(cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }), cm.sp('mt', 1))}
        >
          {sourceCount !== undefined && sourceCount > 0 && (
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.textSize('xs'),
                'text-on-surface-variant font-semibold',
              )}
            >
              <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
                groups
              </span>
              {t(
                'storyListItem.sourceCount',
                { count: sourceCount },
                { defaultValue: '{{count}} sources' },
              )}
            </span>
          )}
          {showBias && averageBias !== undefined && (
            <BiasIndicator value={averageBias} variant="compact" />
          )}
        </div>
      </div>
    </article>
  )
}

export default StoryListItem
