import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface Show {
  id: string
  title: string
  publisher?: string
  description?: string
  cover_index: number
  category: string
  episodes_count?: number
  episode_count?: number
  rating?: number
  featured?: boolean
  trending?: boolean
  subscribed?: boolean
}

interface FeaturedShowsRowProps {
  shows: Show[]
  /** Section heading. */
  title: string
  /** Optional href for the "See all" anchor. */
  seeAllHref?: string
  /** Limit cards rendered. Defaults to 4. */
  limit?: number
}

/** Cover-art gradient token (defined in theme.css, `cover_index` is 0..11). */
const coverBackground = (index: number): string => `var(--color-cover-${index % 12})`

/**
 * Wide editorial row with horizontal cover-art tiles + 2-line
 * description, used for "Featured" and "Trending" sections on Discover
 * and Landing. Translated from blog's FeaturedPostsSection / online-store
 * StorefrontTrendingSection.
 */
export function FeaturedShowsRow({ shows, title, seeAllHref, limit = 4 }: FeaturedShowsRowProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const visible = shows.slice(0, limit)

  if (visible.length === 0) return null

  return (
    <section>
      <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
        <h2 className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight')}>{title}</h2>
        {seeAllHref && (
          <Link
            to={seeAllHref}
            className={'text-sm font-bold text-primary hover:underline inline-block py-1.5'}
          >
            {t('featuredShowsRow.seeAll', {}, { defaultValue: 'See all →' })}
          </Link>
        )}
      </div>
      <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-2 mt-4')}>
        {visible.map((show) => {
          const gradient = coverBackground(show.cover_index)
          return (
            <Link
              key={show.id}
              to={`/shows/${show.id}`}
              className={
                'group flex gap-4 p-4 rounded-2xl bg-surface-container-lowest hover:shadow-2xl hover:shadow-on-surface/5 transition-all'
              }
            >
              <div
                className={
                  'w-28 h-28 rounded-xl shrink-0 flex items-center justify-center relative overflow-hidden'
                }
                style={{ background: gradient }}
                aria-hidden="true"
              >
                <span
                  className={
                    'material-symbols-outlined text-[44px] text-white/40 group-hover:scale-110 transition-transform'
                  }
                >
                  graphic_eq
                </span>
              </div>
              <div className={cm.cn(cm.flex1, 'min-w-0 flex flex-col justify-center')}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  {show.publisher ?? ''}
                </p>
                <h3
                  className={
                    'text-base font-extrabold tracking-tight text-on-surface line-clamp-1 mt-0.5 group-hover:text-primary transition-colors'
                  }
                >
                  {show.title}
                </h3>
                <p className={'text-xs text-on-surface-variant line-clamp-2 mt-1 leading-relaxed'}>
                  {show.description ?? ''}
                </p>
                <div className={'flex items-center gap-2 mt-2 text-[11px] text-on-surface-variant'}>
                  {typeof show.rating === 'number' && (
                    <>
                      <span className={'inline-flex items-center gap-0.5'}>
                        <span
                          className="material-symbols-outlined text-[12px] text-warning"
                          aria-hidden="true"
                        >
                          star
                        </span>
                        <span className="font-semibold tabular-nums">{show.rating.toFixed(1)}</span>
                      </span>
                      <span aria-hidden="true">·</span>
                    </>
                  )}
                  <span className="tabular-nums">
                    {t(
                      'showGrid.episodesCount',
                      { count: show.episodes_count ?? show.episode_count ?? 0 },
                      { defaultValue: '{{count}} eps' },
                    )}
                  </span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
