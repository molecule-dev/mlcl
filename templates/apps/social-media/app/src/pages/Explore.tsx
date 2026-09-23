import { useCallback, useState } from 'react'
import { Link } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { useExplorePosts, useSuggestions, useTrendingHashtags } from '../lib/api.js'
import { fmtCount, vividGradient } from '../lib/sample-feed.js'

const ASPECT_CLASSES = {
  tall: 'row-span-2 aspect-[3/4]',
  wide: 'col-span-2 aspect-[16/10]',
  square: 'aspect-square',
} as const

export function Explore() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { data: posts, loading, error } = useExplorePosts()
  const { data: suggestionsData, refetch: refetchSuggestions } = useSuggestions()
  const { data: hashtags } = useTrendingHashtags()
  const [followed, setFollowed] = useState<Set<string>>(new Set())

  const handleFollow = useCallback(
    async (userId: string) => {
      if (followed.has(userId)) return
      setFollowed((prev) => new Set(prev).add(userId))
      try {
        await http.post(`/follows/users/${userId}`)
        await refetchSuggestions()
      } catch (err) {
        logError('explore.handleFollow', err)
        setFollowed((prev) => {
          const next = new Set(prev)
          next.delete(userId)
          return next
        })
      }
    },
    [followed, http, refetchSuggestions],
  )

  const trending = hashtags ?? []

  return (
    <div className={cm.cn(cm.sp('p', 6), cm.sp('py', 8), 'lg:px-10 mx-auto w-full max-w-7xl')}>
      <header className={cm.cn(cm.sp('mb', 6))}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('explore.eyebrow', {}, { defaultValue: 'Trending today' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight md:text-4xl mt-1')}>
          {t('explore.heading', {}, { defaultValue: 'Explore' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mt-1')}>
          {loading
            ? t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })
            : t(
                'explore.subheading',
                {},
                {
                  defaultValue:
                    'Curated by the editors and the algorithm — but mostly the editors.',
                },
              )}
        </p>
      </header>

      {error && (
        <div
          className={cm.cn(
            'rounded-2xl border border-red-300 bg-error-light text-error px-4 py-3 mb-4 text-sm',
          )}
        >
          {t('explore.error', {}, { defaultValue: 'Could not load explore feed.' })} {error.message}
        </div>
      )}

      {trending.length > 0 && (
        <ul className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'sm' }), cm.sp('mb', 8))}>
          {trending.map((h) => (
            <li key={h.tag}>
              <Link
                to={`/search?q=%23${h.tag}`}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 4),
                  'h-9 rounded-full text-xs font-bold uppercase tracking-widest bg-surface-container-low border border-outline-variant/40 text-on-surface hover:border-primary hover:text-primary transition-colors',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[14px]')} aria-hidden="true">
                  trending_up
                </span>
                <span>#{h.tag}</span>
                <span className={cm.cn('text-on-surface-variant tabular-nums')}>
                  {fmtCount(h.post_count)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {!loading && (posts?.length ?? 0) === 0 && (
        <div
          className={cm.cn(
            'rounded-2xl border border-dashed border-outline-variant px-6 py-12 text-center',
          )}
          data-testid="explore-empty"
        >
          <p className={cm.cn(cm.fontWeight('semibold'), cm.textSize('lg'))}>
            {t('explore.emptyTitle', {}, { defaultValue: 'Nothing trending yet.' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mt-2')}>
            {t(
              'explore.emptyBody',
              {},
              {
                defaultValue:
                  'Be the first to post — the explore grid fills as the community shares.',
              },
            )}
          </p>
        </div>
      )}

      {loading && (
        <ul
          className={cm.cn(
            'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 auto-rows-[180px]',
          )}
          aria-hidden="true"
          data-testid="explore-loading"
        >
          {Array.from({ length: 8 }, (_, i) => (
            <li key={i} className="rounded-md bg-surface-container animate-pulse" />
          ))}
        </ul>
      )}

      {!loading && (
        <ul
          className={cm.cn(
            'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 auto-rows-[180px]',
          )}
        >
          {(suggestionsData?.length ?? 0) > 0 && (
            <li className={cm.cn('col-span-2 md:col-span-2 row-span-2 aspect-[16/10]')}>
              <section
                className={cm.cn(
                  cm.sp('p', 5),
                  'h-full bg-surface-container-lowest rounded-md border border-outline-variant/40 shadow-sm flex flex-col justify-between',
                )}
              >
                <div>
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'uppercase tracking-widest text-primary',
                    )}
                  >
                    {t('explore.suggestionsEyebrow', {}, { defaultValue: 'For you' })}
                  </p>
                  <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight mt-1')}>
                    {t(
                      'explore.suggestionsHeading',
                      {},
                      { defaultValue: 'Creators worth following' },
                    )}
                  </h2>
                </div>
                <ul className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
                  {(suggestionsData ?? []).slice(0, 3).map((s) => (
                    <li
                      key={s.id}
                      className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'sm' }))}
                    >
                      <Link
                        to={`/profile/${s.handle}`}
                        className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0 group')}
                      >
                        <span
                          className={cm.cn(
                            'inline-flex shrink-0 w-9 h-9 rounded-full items-center justify-center text-white font-extrabold text-sm shadow-sm',
                          )}
                          style={{ background: vividGradient(s.cover_index) }}
                          aria-hidden="true"
                        >
                          {s.display_name.charAt(0)}
                        </span>
                        <span className={cm.cn('min-w-0')}>
                          <span
                            className={cm.cn(
                              cm.textSize('sm'),
                              cm.fontWeight('semibold'),
                              'block truncate group-hover:text-primary transition-colors',
                            )}
                          >
                            @{s.handle}
                          </span>
                          <span
                            className={cm.cn(
                              cm.textSize('xs'),
                              'text-on-surface-variant truncate block',
                            )}
                          >
                            {s.reason}
                          </span>
                        </span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleFollow(s.id)}
                        disabled={followed.has(s.id)}
                        data-testid={`follow-${s.handle}`}
                        className={cm.cn(
                          cm.sp('px', 3),
                          'h-7 rounded-full text-[10px] font-bold uppercase tracking-widest bg-primary text-on-primary hover:bg-primary/90 disabled:bg-surface-container-high disabled:text-on-surface-variant transition-colors shrink-0',
                        )}
                      >
                        {followed.has(s.id)
                          ? t('common.following', {}, { defaultValue: 'Following' })
                          : t('common.follow', {}, { defaultValue: 'Follow' })}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            </li>
          )}

          {(posts ?? []).map((post) => {
            const cover = vividGradient(post.cover_index)
            const aspectClass = ASPECT_CLASSES[post.aspect] ?? ASPECT_CLASSES.square
            return (
              <li key={post.id} className={cm.cn(aspectClass, 'min-h-0')}>
                <Link
                  to={`/posts/${post.id}`}
                  className={cm.cn(
                    'relative block w-full h-full overflow-hidden rounded-md group transition-shadow hover:shadow-lg',
                  )}
                  style={{ background: cover }}
                >
                  <span
                    className={cm.cn(
                      'absolute inset-0 flex items-center justify-center pointer-events-none',
                    )}
                  >
                    <span
                      className={cm.cn(
                        'material-symbols-outlined text-white/30 text-[64px] group-hover:scale-105 transition-transform duration-300',
                      )}
                    >
                      photo
                    </span>
                  </span>
                  <span
                    className={cm.cn(
                      'absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300',
                    )}
                  />
                  <div
                    className={cm.cn(
                      'absolute inset-x-0 bottom-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300',
                    )}
                  >
                    <p className={cm.cn('text-sm font-bold text-white line-clamp-1')}>
                      @{post.author.handle}
                    </p>
                    <div
                      className={cm.cn(
                        'flex items-center gap-3 text-[11px] text-white/85 tabular-nums mt-0.5',
                      )}
                    >
                      <span className={cm.cn('inline-flex items-center gap-1')}>
                        <span
                          className={cm.cn('material-symbols-outlined text-[14px]')}
                          style={{ fontVariationSettings: "'FILL' 1" }}
                          aria-hidden="true"
                        >
                          favorite
                        </span>
                        {fmtCount(post.like_count)}
                      </span>
                      <span className={cm.cn('inline-flex items-center gap-1')}>
                        <span
                          className={cm.cn('material-symbols-outlined text-[14px]')}
                          aria-hidden="true"
                        >
                          chat_bubble
                        </span>
                        {fmtCount(post.comment_count)}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
