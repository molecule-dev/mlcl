import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { BiasIndicator } from '../components/BiasIndicator.js'
import { StoryListItem } from '../components/StoryListItem.js'
import { useShowBiasMeters } from '../lib/preferences.js'
import type { Source, Story, Topic } from '../lib/sampleStories.js'
import { unwrapList } from '../lib/unwrap.js'

type Scope = 'stories' | 'sources' | 'topics'

const SCOPES: ReadonlyArray<{ key: Scope; defaultLabel: string; icon: string }> = [
  { key: 'stories', defaultLabel: 'Stories', icon: 'article' },
  { key: 'sources', defaultLabel: 'Sources', icon: 'rss_feed' },
  { key: 'topics', defaultLabel: 'Topics', icon: 'category' },
]

export function Search() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const showBias = useShowBiasMeters()
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<Scope>('stories')
  const [stories, setStories] = useState<ReadonlyArray<Story>>([])
  const [sources, setSources] = useState<ReadonlyArray<Source>>([])
  const [topics, setTopics] = useState<ReadonlyArray<Topic>>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!query) {
      setStories([])
      setSources([])
      setTopics([])
      return
    }
    let cancelled = false
    setLoading(true)
    http
      .get(`/api/search?q=${encodeURIComponent(query)}`)
      .then((res) => {
        if (cancelled) return
        const list = unwrapList<Record<string, unknown>>(res)
        setStories(list.filter((r) => r['kind'] === 'story') as unknown as Story[])
        setSources(list.filter((r) => r['kind'] === 'source') as unknown as Source[])
        setTopics(list.filter((r) => r['kind'] === 'topic') as unknown as Topic[])
      })
      .catch(() => {
        if (!cancelled) {
          setStories([])
          setSources([])
          setTopics([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, query])

  const filteredStories = useMemo(() => stories, [stories])
  const filteredSources = useMemo(() => sources, [sources])
  const filteredTopics = useMemo(() => topics, [topics])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, cm.stack(8))}>
      <header className={cm.stack(4)}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-orange-800 dark:text-secondary',
          )}
        >
          {t('search.eyebrow', {}, { defaultValue: 'Find every angle' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-headline font-extrabold tracking-tight')}>
          {t('search.heading', { appName: APP_NAME }, { defaultValue: 'Search {{appName}}' })}
        </h1>
        <div
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.sp('px', 5),
            cm.sp('py', 3),
            'bg-surface rounded-full border border-outline-variant/40 shadow-sm focus-within:border-primary transition-colors',
          )}
        >
          <span
            className={'material-symbols-outlined text-on-surface-variant mr-3'}
            aria-hidden="true"
          >
            search
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(
              'search.placeholder',
              {},
              { defaultValue: 'Search stories, sources, or topics…' },
            )}
            className={cm.cn(
              cm.w('full'),
              cm.fontWeight('medium'),
              'bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-on-surface-variant',
            )}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label={t('search.clear', {}, { defaultValue: 'Clear search' })}
              className={'text-on-surface-variant hover:text-on-surface transition-colors'}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                cancel
              </span>
            </button>
          )}
        </div>
        <nav
          aria-label={t('search.scopeAriaLabel', {}, { defaultValue: 'Search scope' })}
          className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}
        >
          {SCOPES.map((s) => {
            const active = scope === s.key
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setScope(s.key)}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 4),
                  cm.roundedFull,
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'min-h-[40px] transition-colors',
                  active
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
                )}
                aria-pressed={active}
              >
                <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                  {s.icon}
                </span>
                {t(`search.scope.${s.key}`, {}, { defaultValue: s.defaultLabel })}
              </button>
            )
          })}
        </nav>
      </header>

      {query.trim().length > 0 && (
        <p className={cm.cn(cm.textSize('lg'), 'font-headline text-on-surface tracking-tight')}>
          {t(
            'search.showingResults',
            { query: query.trim() },
            { defaultValue: 'Showing results for “{{query}}”' },
          )}
        </p>
      )}

      {scope === 'stories' && (
        <section className={cm.stack(4)}>
          <h2 className={cm.cn(cm.textSize('xl'), 'font-headline font-bold')}>
            {t(
              'search.storiesHeading',
              { count: filteredStories.length },
              { defaultValue: '{{count}} stories' },
            )}
          </h2>
          {loading ? (
            <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-on-surface-variant')}>
              {t('common.searchingEllipsis', {}, { defaultValue: 'Searching…' })}
            </p>
          ) : filteredStories.length === 0 ? (
            <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-on-surface-variant')}>
              {t('search.empty', {}, { defaultValue: 'No matches yet — try a broader term.' })}
            </p>
          ) : (
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
              {filteredStories.map((s) => (
                <StoryListItem
                  key={s.id}
                  id={s.id}
                  headline={s.headline}
                  excerpt={s.excerpt}
                  topic={s.topic}
                  topicSlug={s.topic_slug}
                  sourceCount={s.source_count}
                  averageBias={s.average_bias}
                  showBias={showBias}
                  publishedAt={s.published_at}
                  imageUrl={s.image_url}
                  saved={s.saved}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {scope === 'sources' && (
        <section className={cm.stack(4)}>
          <h2 className={cm.cn(cm.textSize('xl'), 'font-headline font-bold')}>
            {t(
              'search.sourcesHeading',
              { count: filteredSources.length },
              { defaultValue: '{{count}} sources' },
            )}
          </h2>
          {filteredSources.length === 0 ? (
            <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-on-surface-variant')}>
              {t('search.empty', {}, { defaultValue: 'No matches yet — try a broader term.' })}
            </p>
          ) : (
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
              {filteredSources.map((s) => (
                <article
                  key={s.slug}
                  className={cm.cn(
                    cm.sp('p', 5),
                    cm.accentCard({ tone: 'custom' }),
                    'bg-surface rounded-xl border border-outline-variant/40 shadow-sm hover:shadow-md transition-shadow',
                  )}
                  style={{
                    ['--mol-accent' as string]: s.accent_color ?? 'var(--mol-color-primary)',
                  }}
                >
                  <header
                    className={cm.flex({
                      align: 'baseline',
                      justify: 'between',
                      gap: 'md',
                      wrap: 'wrap',
                    })}
                  >
                    <div>
                      <h3 className={cm.cn(cm.textSize('lg'), 'font-headline font-bold')}>
                        {s.name}
                      </h3>
                      {s.description && (
                        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                          {s.description}
                        </p>
                      )}
                    </div>
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        'font-bold uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      {t(
                        'search.sourceFactual',
                        { rating: s.factual_rating },
                        { defaultValue: '{{rating}}% factual' },
                      )}
                    </span>
                  </header>
                  <div className={'mt-3'}>
                    <BiasIndicator value={s.bias_value} variant="spectrum" />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {scope === 'topics' && (
        <section className={cm.stack(4)}>
          <h2 className={cm.cn(cm.textSize('xl'), 'font-headline font-bold')}>
            {t(
              'search.topicsHeading',
              { count: filteredTopics.length },
              { defaultValue: '{{count}} topics' },
            )}
          </h2>
          {filteredTopics.length === 0 ? (
            <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-on-surface-variant')}>
              {t('search.empty', {}, { defaultValue: 'No matches yet — try a broader term.' })}
            </p>
          ) : (
            <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-2')}>
              {filteredTopics.map((tp) => (
                <article
                  key={tp.slug}
                  className={cm.cn(
                    cm.sp('p', 5),
                    tp.accent_color && cm.accentCard({ tone: 'custom' }),
                    'bg-surface rounded-xl border border-outline-variant/40 shadow-sm hover:shadow-md transition-shadow',
                  )}
                  style={
                    tp.accent_color ? { ['--mol-accent' as string]: tp.accent_color } : undefined
                  }
                >
                  <header className={cm.flex({ align: 'center', gap: 'sm' })}>
                    <span
                      className={'material-symbols-outlined text-primary text-xl'}
                      aria-hidden="true"
                    >
                      {tp.icon}
                    </span>
                    <h3 className={cm.cn(cm.textSize('lg'), 'font-headline font-bold')}>
                      {tp.label}
                    </h3>
                  </header>
                  <p
                    className={cm.cn(
                      cm.sp('mt', 1),
                      tp.accent_color
                        ? cm.accentCardLabel({ tone: 'custom' })
                        : cm.cn(
                            cm.textSize('xs'),
                            'font-bold uppercase tracking-widest text-on-surface-variant',
                          ),
                    )}
                  >
                    {t(
                      'search.topicCount',
                      { count: tp.story_count },
                      { defaultValue: '{{count}} stories' },
                    )}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
