import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface Prompt {
  id: string
  slug: string
  text: string
  category: 'gratitude' | 'feeling' | 'kindness' | 'learn' | 'release' | 'connection'
  is_favorite: boolean
}

const CATEGORY_META: Record<Prompt['category'], { icon: string; label: string; color: string }> = {
  gratitude: {
    icon: 'volunteer_activism',
    label: 'Gratitude',
    color: 'var(--color-prompt-gratitude)',
  },
  feeling: { icon: 'sentiment_satisfied', label: 'Feeling', color: 'var(--color-prompt-feeling)' },
  kindness: { icon: 'favorite', label: 'Kindness', color: 'var(--color-prompt-kindness)' },
  learn: { icon: 'school', label: 'Learn', color: 'var(--color-prompt-learn)' },
  release: { icon: 'spa', label: 'Release', color: 'var(--color-prompt-release)' },
  connection: { icon: 'group', label: 'Connection', color: 'var(--color-prompt-connection)' },
}

const FILTERS: { key: 'all' | 'favorites' | Prompt['category']; defaultLabel: string }[] = [
  { key: 'all', defaultLabel: 'All' },
  { key: 'favorites', defaultLabel: 'Favorites' },
  { key: 'gratitude', defaultLabel: 'Gratitude' },
  { key: 'feeling', defaultLabel: 'Feeling' },
  { key: 'kindness', defaultLabel: 'Kindness' },
  { key: 'learn', defaultLabel: 'Learn' },
  { key: 'release', defaultLabel: 'Release' },
  { key: 'connection', defaultLabel: 'Connection' },
]

export function Prompts() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [filter, setFilter] = useState<'all' | 'favorites' | Prompt['category']>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/journal/prompts')
      .then((res) => {
        if (cancelled) return
        setPrompts(unwrapList<Prompt>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('prompts.loadError', {}, { defaultValue: 'Failed to load prompts.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const toggleFavorite = async (id: string) => {
    const prev = prompts
    setPrompts(prompts.map((p) => (p.id === id ? { ...p, is_favorite: !p.is_favorite } : p)))
    try {
      await http.post(`/api/journal/prompts/${id}/favorite`, {})
    } catch (_error) {
      // optimistic update failed; revert to previous state
      setPrompts(prev)
    }
  }

  const filtered = useMemo(() => {
    if (filter === 'all') return prompts
    if (filter === 'favorites') return prompts.filter((p) => p.is_favorite)
    return prompts.filter((p) => p.category === filter)
  }, [prompts, filter])

  return (
    <div className={cm.cn(cm.sp('px', 6), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, 'space-y-6')}>
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('prompts.eyebrow', {}, { defaultValue: 'A starting place' })}
        </p>
        <h1 className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight', cm.sp('mt', 2))}>
          {t('prompts.heading', {}, { defaultValue: 'Prompt library' })}
        </h1>
        <p className={cm.cn(cm.textSize('base'), cm.sp('mt', 2), 'text-on-surface-variant')}>
          {t(
            'prompts.subheading',
            {},
            { defaultValue: 'Gentle questions to help when the page feels too blank.' },
          )}
        </p>
      </header>

      <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'flex-wrap')}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.fontWeight('bold'),
              'rounded-full text-[11px] uppercase tracking-widest transition-colors',
              filter === f.key
                ? 'text-white shadow-sm'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
            )}
            style={
              filter === f.key
                ? {
                    background:
                      'linear-gradient(90deg, var(--mol-color-primary), var(--mol-color-secondary))',
                  }
                : undefined
            }
          >
            {t(`prompts.filter.${f.key}`, {}, { defaultValue: f.defaultLabel })}
          </button>
        ))}
      </div>

      {loading ? (
        <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-on-surface-variant')}>
          {t('prompts.loading', {}, { defaultValue: 'Loading prompts…' })}
        </p>
      ) : error ? (
        <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-error')}>{error}</p>
      ) : filtered.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-on-surface-variant')}>
          {t('prompts.empty', {}, { defaultValue: 'No prompts match this filter yet.' })}
        </p>
      ) : (
        <ul className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-2')}>
          {filtered.map((p) => {
            const meta = CATEGORY_META[p.category]
            return (
              <li
                key={p.id}
                className={cm.cn(
                  cm.sp('p', 6),
                  'bg-surface-container-lowest rounded-2xl shadow-sm border-l-4 hover:-translate-y-0.5 transition-transform group',
                )}
                style={{ borderLeftColor: meta.color }}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('mb', 3),
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'xs' }),
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.fontWeight('bold'),
                      'rounded-full text-[10px] uppercase tracking-widest',
                    )}
                    style={{ backgroundColor: `${meta.color}22`, color: meta.color }}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-base')}
                      aria-hidden="true"
                    >
                      {meta.icon}
                    </span>
                    {t(`prompts.category.${p.category}`, {}, { defaultValue: meta.label })}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleFavorite(p.id)}
                    aria-pressed={p.is_favorite}
                    aria-label={t(
                      p.is_favorite ? 'prompts.unfavorite' : 'prompts.favorite',
                      {},
                      { defaultValue: p.is_favorite ? 'Remove favorite' : 'Save favorite' },
                    )}
                    className={cm.cn(
                      'text-on-surface-variant hover:text-primary transition-colors',
                    )}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={
                        p.is_favorite
                          ? { color: 'var(--mol-color-primary)', fontVariationSettings: "'FILL' 1" }
                          : undefined
                      }
                    >
                      {p.is_favorite ? 'favorite' : 'favorite_border'}
                    </span>
                  </button>
                </div>
                <p
                  className={cm.cn(
                    cm.textSize('lg'),
                    cm.fontWeight('semibold'),
                    'italic text-on-surface',
                  )}
                >
                  “{p.text}”
                </p>
                <Link
                  to={`/journal/new?prompt=${encodeURIComponent(p.slug)}&text=${encodeURIComponent(p.text)}`}
                  className={cm.cn(
                    cm.sp('mt', 4),
                    cm.fontWeight('bold'),
                    cm.textSize('xs'),
                    'inline-flex items-center gap-2 uppercase tracking-widest text-primary hover:opacity-80',
                  )}
                >
                  {t('prompts.writeAbout', {}, { defaultValue: 'Write about this' })}
                  <span className={cm.cn('material-symbols-outlined text-base')}>
                    arrow_forward
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
