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
  unplayed_count?: number
}

interface ShowGridProps {
  shows: Show[]
  /** Limit number of cards rendered. */
  limit?: number
}

/** Cover-art gradient token (defined in theme.css, `cover_index` is 0..11). */
const coverBackground = (index: number): string => `var(--color-cover-${index % 12})`

const CATEGORY_LABEL: Record<string, string> = {
  news: 'News',
  tech: 'Tech',
  business: 'Business',
  comedy: 'Comedy',
  culture: 'Culture',
  science: 'Science',
  health: 'Health',
  true_crime: 'True Crime',
}

/**
 * Cover-art grid with editorial cards — large gradient cover, title in
 * tight tracking, publisher byline, episode count + rating + subscribed
 * pill in the meta strip. Hover lift + shadow. Translated from blog's
 * FeaturedPostsSection / online-store ProductCard pattern.
 */
export function ShowGrid({ shows, limit }: ShowGridProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const visible = typeof limit === 'number' ? shows.slice(0, limit) : shows

  if (visible.length === 0) {
    return (
      <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant text-sm')}>
        {t('showGrid.empty', {}, { defaultValue: 'No shows in this category yet.' })}
      </p>
    )
  }

  return (
    <div
      className={cm.cn(
        cm.grid({ gap: 'lg' }),
        'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
      )}
    >
      {visible.map((show) => {
        const gradient = coverBackground(show.cover_index)
        return (
          <Link key={show.id} to={`/shows/${show.id}`} className="group block">
            <div className="relative">
              <div
                className={
                  'aspect-square rounded-2xl shadow-md group-hover:shadow-2xl group-hover:shadow-on-surface/15 transition-all overflow-hidden flex items-center justify-center relative'
                }
                style={{ background: gradient }}
                aria-hidden="true"
              >
                <span
                  className={
                    'material-symbols-outlined text-[72px] text-white/40 group-hover:scale-110 transition-transform'
                  }
                >
                  graphic_eq
                </span>
                {show.subscribed && (show.unplayed_count ?? 0) > 0 && (
                  <span
                    className={
                      'absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-extrabold tabular-nums bg-surface text-on-surface shadow-md'
                    }
                  >
                    {t(
                      'common.countNew',
                      { count: show.unplayed_count ?? 0 },
                      { defaultValue: '{{count}} new' },
                    )}
                  </span>
                )}
                {show.trending && (
                  <span
                    className={
                      'absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-foreground/40 backdrop-blur-md text-white'
                    }
                  >
                    {t('showGrid.trendingBadge', {}, { defaultValue: 'Trending' })}
                  </span>
                )}
                <div
                  className={
                    'absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3'
                  }
                >
                  <div
                    className={
                      'w-12 h-12 rounded-full bg-surface shadow-lg flex items-center justify-center'
                    }
                  >
                    <span className="material-symbols-outlined text-[28px] text-on-surface">
                      play_arrow
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className={'mt-3'}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                {t(
                  `discover.category.${show.category}`,
                  {},
                  { defaultValue: CATEGORY_LABEL[show.category] ?? show.category },
                )}
              </p>
              <h3
                className={
                  'text-sm font-extrabold tracking-tight text-on-surface line-clamp-1 mt-0.5 group-hover:text-primary transition-colors'
                }
              >
                {show.title}
              </h3>
              <p className={'text-xs text-on-surface-variant truncate mt-0.5'}>
                {show.publisher ?? ''}
              </p>
              <div className={'flex items-center gap-2 mt-1.5 text-[11px] text-on-surface-variant'}>
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
                {show.subscribed && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-primary font-bold">
                      {t('showGrid.subscribedLabel', {}, { defaultValue: 'Subscribed' })}
                    </span>
                  </>
                )}
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
