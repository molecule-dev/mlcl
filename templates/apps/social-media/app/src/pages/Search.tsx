import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { useSearchPosts, useSearchUsers, useTrendingHashtags } from '../lib/api.js'
import { fmtCount, vividGradient } from '../lib/sample-feed.js'

type Tab = 'top' | 'people' | 'tags' | 'posts'

const TABS: { key: Tab; defaultLabel: string; icon: string }[] = [
  { key: 'top', defaultLabel: 'Top', icon: 'auto_awesome' },
  { key: 'people', defaultLabel: 'People', icon: 'group' },
  { key: 'tags', defaultLabel: 'Tags', icon: 'tag' },
  { key: 'posts', defaultLabel: 'Posts', icon: 'photo' },
]

function useDebounced<T>(value: T, delay = 250): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return v
}

export function Search() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const initial = params.get('q') ?? ''
  const [query, setQuery] = useState(initial)
  const [tab, setTab] = useState<Tab>('top')
  const debounced = useDebounced(query, 250)
  const stripped = debounced.trim().replace(/^#/, '')

  useEffect(() => {
    if (debounced) {
      setParams({ q: debounced })
    } else if (params.get('q')) {
      setParams({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  const { data: people, loading: peopleLoading, error: peopleError } = useSearchUsers(stripped)
  const { data: posts, loading: postsLoading, error: postsError } = useSearchPosts(stripped)
  const { data: hashtags } = useTrendingHashtags()

  const searchError = peopleError ?? postsError

  const matchingTags = useMemo(() => {
    const all = hashtags ?? []
    if (!stripped) return all
    return all.filter((h) => h.tag.toLowerCase().includes(stripped.toLowerCase()))
  }, [hashtags, stripped])

  return (
    <div className={cm.cn(cm.sp('p', 6), cm.sp('py', 8), 'lg:px-10 mx-auto w-full max-w-5xl')}>
      <header className={cm.cn(cm.sp('mb', 6))}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('nav.discover', {}, { defaultValue: 'Discover' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight md:text-4xl mt-1')}>
          {t('common.search', {}, { defaultValue: 'Search' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mt-1')}>
          {t(
            'search.subheading',
            { appName: APP_NAME },
            {
              defaultValue: 'People, hashtags, captions — anything across {{appName}}.',
            },
          )}
        </p>
      </header>

      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.sp('p', 3),
          cm.sp('mb', 6),
          'bg-surface-container-lowest rounded-full border border-outline-variant/40 shadow-sm focus-within:ring-2 focus-within:ring-primary',
        )}
      >
        <span
          className={cm.cn('material-symbols-outlined text-on-surface-variant text-[24px] ml-3')}
        >
          search
        </span>
        <input
          type="search"
          data-testid="search-input"
          placeholder={t(
            'search.placeholder',
            {},
            { defaultValue: 'Search people, hashtags, captions…' },
          )}
          className={cm.cn(
            cm.flex1,
            cm.sp('py', 2),
            cm.fontWeight('medium'),
            'bg-transparent border-none focus:ring-0 outline-none placeholder:text-on-surface-variant text-base',
          )}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'h-10 w-10 shrink-0 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors mr-2',
            )}
            aria-label={t('search.clearAria', {}, { defaultValue: 'Clear' })}
          >
            <span className={cm.cn('material-symbols-outlined text-[20px]')}>close</span>
          </button>
        )}
      </div>

      {searchError && (
        <div
          role="alert"
          className={cm.cn(
            'rounded-2xl border border-red-300 bg-error-light text-error px-4 py-3 mb-6 text-sm',
          )}
        >
          {t('search.error', {}, { defaultValue: 'Search failed. Try again.' })}{' '}
          {searchError.message}
        </div>
      )}

      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          cm.sp('mb', 6),
          'border-b border-outline-variant/40 overflow-x-auto',
        )}
      >
        {TABS.map((tabDef) => {
          const isActive = tab === tabDef.key
          return (
            <button
              key={tabDef.key}
              type="button"
              onClick={() => setTab(tabDef.key)}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest transition-colors border-b-2 -mb-px',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[18px]')} aria-hidden="true">
                {tabDef.icon}
              </span>
              {t(`search.tab.${tabDef.key}`, {}, { defaultValue: tabDef.defaultLabel })}
            </button>
          )
        })}
      </div>

      {(tab === 'top' || tab === 'people') && (
        <section className={cm.cn(cm.sp('mb', 8))} data-testid="search-people">
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              'font-black',
              cm.sp('mb', 3),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('search.peopleHeading', {}, { defaultValue: 'People' })}
          </h2>
          <ul
            className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3')}
          >
            {(people ?? []).map((a) => (
              <li key={a.id}>
                <Link
                  to={`/profile/${a.handle}`}
                  className={cm.cn(
                    cm.sp('p', 4),
                    'block bg-surface-container-lowest rounded-2xl border border-outline-variant/40 hover:shadow-md transition-shadow group',
                  )}
                >
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                    <span
                      className={cm.cn(
                        'inline-flex w-12 h-12 rounded-full items-center justify-center text-white font-extrabold shadow-sm',
                      )}
                      style={{ background: vividGradient(a.cover_index) }}
                      aria-hidden="true"
                    >
                      {a.display_name.charAt(0)}
                    </span>
                    <div className={cm.cn('min-w-0')}>
                      <p
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('bold'),
                          'group-hover:text-primary transition-colors',
                        )}
                      >
                        {a.display_name}
                      </p>
                      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant truncate')}>
                        @{a.handle}
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
            {stripped && peopleLoading && (
              <li
                className={cm.cn(
                  cm.sp('py', 8),
                  cm.textCenter,
                  'text-on-surface-variant text-sm italic col-span-full',
                )}
              >
                {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
              </li>
            )}
            {!peopleLoading && stripped && (people ?? []).length === 0 && (
              <li
                className={cm.cn(
                  cm.sp('py', 8),
                  cm.textCenter,
                  'text-on-surface-variant text-sm italic col-span-full',
                )}
              >
                {t('search.noPeople', { q: query }, { defaultValue: 'No creators match "{{q}}".' })}
              </li>
            )}
            {!stripped && (
              <li
                className={cm.cn(
                  cm.sp('py', 4),
                  cm.textCenter,
                  'text-on-surface-variant text-sm col-span-full',
                )}
              >
                {t(
                  'search.peoplePrompt',
                  {},
                  { defaultValue: 'Type a name, handle, or email to find creators.' },
                )}
              </li>
            )}
          </ul>
        </section>
      )}

      {(tab === 'top' || tab === 'tags') && (
        <section className={cm.cn(cm.sp('mb', 8))} data-testid="search-hashtags">
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              'font-black',
              cm.sp('mb', 3),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('search.tagsHeading', {}, { defaultValue: 'Hashtags' })}
          </h2>
          <ul
            className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3')}
          >
            {matchingTags.map((h) => (
              <li key={h.tag}>
                <Link
                  to={`/search?q=%23${h.tag}`}
                  className={cm.cn(
                    cm.sp('p', 5),
                    'block bg-surface-container-lowest rounded-2xl border-l-4 border-primary border-y border-r border-outline-variant/40 hover:shadow-md transition-shadow',
                  )}
                >
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      'font-black',
                      'uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    #{h.tag}
                  </p>
                  <p
                    className={cm.cn(
                      'text-2xl font-extrabold tracking-tight text-primary mt-1 tabular-nums',
                    )}
                  >
                    {fmtCount(h.post_count)}
                  </p>
                </Link>
              </li>
            ))}
            {matchingTags.length === 0 && (
              <li
                className={cm.cn(
                  cm.sp('py', 4),
                  cm.textCenter,
                  'text-on-surface-variant text-sm col-span-full',
                )}
              >
                {t('search.noTags', {}, { defaultValue: 'No trending hashtags yet.' })}
              </li>
            )}
          </ul>
        </section>
      )}

      {(tab === 'top' || tab === 'posts') && (
        <section data-testid="search-posts">
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              'font-black',
              cm.sp('mb', 3),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('search.postsHeading', {}, { defaultValue: 'Posts' })}
          </h2>
          <ul className={cm.cn('grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3')}>
            {(posts ?? []).slice(0, 16).map((p) => {
              const cover = vividGradient(p.cover_index)
              return (
                <li key={p.id}>
                  <Link
                    to={`/posts/${p.id}`}
                    className={cm.cn(
                      'relative block aspect-square overflow-hidden rounded-md group transition-shadow hover:shadow-lg',
                    )}
                    style={{ background: cover }}
                  >
                    <span
                      className={cm.cn(
                        'absolute inset-0 flex items-center justify-center pointer-events-none',
                      )}
                    >
                      <span
                        className={cm.cn('material-symbols-outlined text-white/30 text-[64px]')}
                      >
                        photo
                      </span>
                    </span>
                    <span
                      className={cm.cn(
                        'absolute inset-x-0 bottom-0 p-3 text-[11px] text-white opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/70 to-transparent',
                      )}
                    >
                      <span className={cm.cn('block font-bold truncate')}>@{p.author.handle}</span>
                      <span className={cm.cn('block text-white/85 line-clamp-1')}>{p.caption}</span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
          {stripped && postsLoading && (
            <p className={cm.cn(cm.sp('py', 4), cm.textCenter, 'text-on-surface-variant text-sm')}>
              {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </p>
          )}
          {!postsLoading && stripped && (posts ?? []).length === 0 && (
            <p className={cm.cn(cm.sp('py', 4), cm.textCenter, 'text-on-surface-variant text-sm')}>
              {t('search.noPosts', { q: query }, { defaultValue: 'No posts match "{{q}}".' })}
            </p>
          )}
        </section>
      )}
    </div>
  )
}
