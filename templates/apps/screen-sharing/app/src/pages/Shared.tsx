import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { RecordingCardData } from '../components/RecordingCard.js'
import { RecordingCard } from '../components/RecordingCard.js'

interface RecordingRow {
  id: string
  title: string
  thumbnail_url?: string | null
  duration_ms?: number | null
  view_count?: number | null
  visibility?: 'private' | 'workspace' | 'public' | 'password'
  status?: string | null
  created_at?: string | null
  poster_emoji?: string | null
}

const FILTERS = [
  { id: 'all', label: 'Everything', icon: 'inbox' },
  { id: 'workspace', label: 'Workspace', icon: 'group' },
  { id: 'public', label: 'Public', icon: 'public' },
] as const

type FilterId = (typeof FILTERS)[number]['id']

function unwrapList(payload: unknown): RecordingRow[] {
  if (Array.isArray(payload)) return payload as RecordingRow[]
  if (payload && typeof payload === 'object') {
    const data = (payload as { data?: unknown }).data
    if (Array.isArray(data)) return data as RecordingRow[]
  }
  return []
}

function rowToCard(r: RecordingRow): RecordingCardData {
  return {
    id: r.id,
    title: r.title || 'Untitled recording',
    thumbnail_url: r.thumbnail_url ?? null,
    duration_seconds: Math.round((r.duration_ms ?? 0) / 1000),
    view_count: r.view_count ?? 0,
    visibility: r.visibility === 'public' ? 'public' : 'team',
    status: r.status === 'processing' ? 'processing' : 'ready',
    created_at: r.created_at ?? undefined,
    posterEmoji: r.poster_emoji ?? '🎬',
  }
}

export function Shared() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [folder, setFolder] = useState<FilterId>('all')
  const [items, setItems] = useState<RecordingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/recordings/feed')
      .then((res) => {
        if (cancelled) return
        setItems(unwrapList(res?.data))
      })
      .catch(() => {
        if (cancelled) return
        setError(t('shared.error', {}, { defaultValue: 'Failed to load shared recordings.' }))
        setItems([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const cards = useMemo(() => items.map(rowToCard), [items])

  const visible = useMemo(() => {
    if (folder === 'workspace') return cards.filter((r) => r.visibility !== 'public')
    if (folder === 'public') return cards.filter((r) => r.visibility === 'public')
    return cards
  }, [cards, folder])

  return (
    <div data-mol-id="shared-page" className={cm.cn(cm.stack(8), cm.maxW('2xl'), 'mx-auto')}>
      <header className={cm.stack(2)}>
        <span
          className={cm.cn(
            'inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-on-surface-variant w-fit',
          )}
        >
          <span
            className={cm.cn(
              'material-symbols-outlined text-base text-[var(--color-brand-gradient-to)]',
            )}
          >
            group
          </span>
          {t('shared.eyebrow', {}, { defaultValue: 'Shared with me' })}
        </span>
        <h1
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-4xl md:text-5xl tracking-tight leading-[1.05] font-extrabold text-on-surface',
          )}
        >
          {t('shared.title', {}, { defaultValue: 'Clips your team sent your way' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-xl')}>
          {t(
            'shared.subtitle',
            {},
            {
              defaultValue:
                'Workspace and public recordings from teammates land here automatically.',
            },
          )}
        </p>
      </header>

      <section className={cm.cn(cm.flex({ align: 'center', gap: 2 }), 'flex-wrap')}>
        {FILTERS.map((f) => {
          const active = f.id === folder
          return (
            <button
              key={f.id}
              type="button"
              data-mol-id={`shared-filter-${f.id}`}
              onClick={() => setFolder(f.id)}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 2 }),
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                cm.textSize('xs'),
                'uppercase tracking-widest rounded-full transition-colors',
                active
                  ? 'text-white bg-gradient-to-r from-[var(--color-brand-gradient-from)] to-[var(--color-brand-gradient-to)] shadow-md shadow-[var(--color-brand-gradient-from)]/20'
                  : 'border border-outline-variant text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-base')}>{f.icon}</span>
              {t(`shared.folder.${f.id}`, {}, { defaultValue: f.label })}
            </button>
          )
        })}
      </section>

      {error ? (
        <div
          data-mol-id="shared-error"
          role="alert"
          className={cm.cn(
            cm.sp('p', 6),
            cm.textCenter,
            'rounded-2xl border border-error/30 bg-error/5 text-error',
          )}
        >
          {error}
        </div>
      ) : loading ? (
        <div
          data-mol-id="shared-loading"
          className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'sm:grid-cols-2 lg:grid-cols-3')}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              aria-hidden="true"
              className={cm.cn('h-64 rounded-2xl bg-surface-container-lowest animate-pulse')}
            />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div
          data-mol-id="shared-empty"
          className={cm.cn(
            cm.sp('p', 12),
            cm.textCenter,
            cm.stack(3),
            'rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined text-5xl text-on-surface-variant mx-auto')}
          >
            inbox
          </span>
          <h3 className={cm.cn(cm.fontWeight('bold'), 'text-xl text-on-surface')}>
            {t('shared.empty.title', {}, { defaultValue: 'Nothing shared yet' })}
          </h3>
          <p className={cm.cn(cm.textSize('sm'), cm.textMuted, 'max-w-sm mx-auto')}>
            {t(
              'shared.empty.body',
              {},
              {
                defaultValue:
                  'When teammates publish workspace or public recordings, they will appear here.',
              },
            )}
          </p>
        </div>
      ) : (
        <div
          data-mol-id="shared-grid"
          className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'sm:grid-cols-2 lg:grid-cols-3')}
        >
          {visible.map((rec) => (
            <RecordingCard key={rec.id} recording={rec} />
          ))}
        </div>
      )}
    </div>
  )
}
