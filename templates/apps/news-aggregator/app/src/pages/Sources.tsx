import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { SourceCard } from '../components/SourceCard.js'
import type { Source } from '../lib/sampleStories.js'
import { unwrapList } from '../lib/unwrap.js'

type Filter = 'all' | 'following' | 'left' | 'center' | 'right'

const FILTERS: ReadonlyArray<{ key: Filter; defaultLabel: string }> = [
  { key: 'all', defaultLabel: 'All' },
  { key: 'following', defaultLabel: 'Following' },
  { key: 'left', defaultLabel: 'Left' },
  { key: 'center', defaultLabel: 'Center' },
  { key: 'right', defaultLabel: 'Right' },
]

function passesFilter(source: Source, filter: Filter): boolean {
  if (filter === 'all') return true
  if (filter === 'following') return source.following
  if (filter === 'left') return source.bias_value <= -0.2
  if (filter === 'right') return source.bias_value >= 0.2
  return Math.abs(source.bias_value) < 0.2
}

export function Sources() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [sources, setSources] = useState<ReadonlyArray<Source>>([])
  const [following, setFollowing] = useState<Record<string, boolean>>({})
  const [filter, setFilter] = useState<Filter>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/sources')
      .then((res) => {
        if (cancelled) return
        const fetched = unwrapList<Source>(res)
        setSources(fetched)
        setFollowing(Object.fromEntries(fetched.map((s) => [s.slug, s.following])))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('sources.loadError', {}, { defaultValue: 'Failed to load sources.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const decorated = useMemo(
    () => sources.map((s) => ({ ...s, following: following[s.slug] ?? s.following })),
    [sources, following],
  )

  const filtered = decorated.filter((s) => passesFilter(s, filter))

  const toggleFollow = (slug: string) => {
    const prevValue = following[slug] ?? false
    const next = !prevValue
    setFollowing((prev) => ({ ...prev, [slug]: next }))
    void http
      .post(`/api/sources/${slug}/follow`, {})
      .then((res) => {
        const persisted = res as { following?: boolean; data?: { following?: boolean } } | null
        const value = persisted?.following ?? persisted?.data?.following
        if (typeof value === 'boolean' && value !== next) {
          setFollowing((prevState) => ({ ...prevState, [slug]: value }))
        }
      })
      .catch(() => {
        setFollowing((prevState) => ({ ...prevState, [slug]: prevValue }))
      })
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}>
      <header
        className={cm.flex({ align: 'baseline', justify: 'between', wrap: 'wrap', gap: 'md' })}
      >
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.sp('mb', 1),
              'uppercase tracking-widest text-orange-800 dark:text-secondary',
            )}
          >
            {t('sources.eyebrow', {}, { defaultValue: 'Trusted sources' })}
          </p>
          <h1 className={cm.cn(cm.textSize('4xl'), 'font-headline font-extrabold tracking-tight')}>
            {t('sources.heading', {}, { defaultValue: 'Sources' })}
          </h1>
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('mt', 1),
              'text-on-surface-variant max-w-2xl',
            )}
          >
            {t(
              'sources.subheading',
              {},
              {
                defaultValue:
                  'Manage which outlets feed your briefing. Every source is plotted on the bias spectrum and rated for factual accuracy.',
              },
            )}
          </p>
        </div>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            'font-bold uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t(
            'sources.followingCount',
            { count: decorated.filter((s) => s.following).length, total: decorated.length },
            { defaultValue: 'Following {{count}} of {{total}}' },
          )}
        </p>
      </header>

      <nav
        aria-label={t('sources.filtersAriaLabel', {}, { defaultValue: 'Filter sources' })}
        className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}
      >
        {FILTERS.map((f) => {
          const active = filter === f.key
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.roundedFull,
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'transition-colors',
                active
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
              )}
              aria-pressed={active}
            >
              {t(`sources.filter.${f.key}`, {}, { defaultValue: f.defaultLabel })}
            </button>
          )
        })}
      </nav>

      {error ? (
        <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading && sources.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t('sources.loading', {}, { defaultValue: 'Loading sources…' })}
        </p>
      ) : filtered.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t('sources.empty', {}, { defaultValue: 'No sources match that filter.' })}
        </p>
      ) : (
        <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-2')}>
          {filtered.map((s) => (
            <SourceCard
              key={s.slug}
              source={{
                slug: s.slug,
                name: s.name,
                description: s.description,
                iconUrl: s.icon_url,
                factualRating: s.factual_rating,
                biasValue: s.bias_value,
                storyCount: s.story_count,
                following: s.following,
                accentColor: s.accent_color,
              }}
              onToggleFollow={toggleFollow}
            />
          ))}
        </div>
      )}
    </div>
  )
}
