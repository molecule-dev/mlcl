import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { MindMapCardData } from '../components/MindMapCard.js'
import { MindMapCard } from '../components/MindMapCard.js'

const FILTERS = ['all', 'mine', 'shared', 'recent'] as const

type Filter = (typeof FILTERS)[number]

export function Maps() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [maps, setMaps] = useState<MindMapCardData[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const autoCreatedRef = useRef(false)

  const handleCreate = async () => {
    if (creating) return
    setCreating(true)
    try {
      const res = await http.post<{ id: string }>('/maps', {})
      const id = res?.data?.id
      if (id) {
        navigate(`/maps/${id}`)
      }
    } catch (error) {
      logError('maps.create', error)
      setError(
        t(
          'maps.createError',
          {},
          { defaultValue: 'Could not create a new map. Please try again.' },
        ),
      )
    } finally {
      setCreating(false)
    }
  }

  // Auto-create when arriving with ?new=1 (from sidebar/dashboard "New map" CTAs).
  // Strip the query immediately so a back-nav or reload doesn't loop another POST.
  useEffect(() => {
    if (autoCreatedRef.current) return
    if (searchParams.get('new') !== '1') return
    autoCreatedRef.current = true
    setSearchParams({}, { replace: true })
    void handleCreate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get<Array<MindMapCardData & { title?: string; node_count?: number }>>('/maps')
      .then((res) => {
        if (cancelled) return
        const items = (res?.data || []).map((m) => ({
          ...m,
          name: m.name ?? m.title ?? '',
          node_count: typeof m.node_count === 'number' ? m.node_count : 0,
        }))
        setMaps(items)
        setError(null)
      })
      .catch(() => {
        if (cancelled) return
        setMaps([])
        setError(
          t('maps.loadError', {}, { defaultValue: 'Could not load your maps. Please try again.' }),
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const recentCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
    return maps.filter((m) => {
      if (
        q &&
        !m.name.toLowerCase().includes(q) &&
        !(m.description || '').toLowerCase().includes(q)
      ) {
        return false
      }
      // `is_shared` is the API's collaborator flag — the map belongs to
      // someone else and was shared with this user. (`is_public` is the
      // public-link toggle, a different concept entirely.)
      if (filter === 'shared' && !m.is_shared) return false
      if (filter === 'mine' && m.is_shared) return false
      if (filter === 'recent') {
        const updated = new Date(m.updated_at).getTime()
        if (!Number.isFinite(updated) || updated < recentCutoff) return false
      }
      return true
    })
  }, [maps, filter, search])

  const filterLabels: Record<Filter, string> = {
    all: t('maps.filter.all', {}, { defaultValue: 'All maps' }),
    mine: t('maps.filter.mine', {}, { defaultValue: 'My maps' }),
    shared: t('maps.filter.shared', {}, { defaultValue: 'Shared with me' }),
    recent: t('maps.filter.recent', {}, { defaultValue: 'Recently updated' }),
  }

  return (
    <div className={cm.stack(8)}>
      <header
        className={cm.cn(cm.flex({ justify: 'between', align: 'end', gap: 'md' }), 'flex-wrap')}
      >
        <div className={cm.stack(1)}>
          <h1
            className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight text-on-surface')}
          >
            {t('maps.title', {}, { defaultValue: 'Your maps' })}
          </h1>
          <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant')}>
            {t(
              'maps.subtitle',
              { count: maps.length },
              { defaultValue: '{{count}} maps in your workspace.' },
            )}
          </p>
        </div>
        <div className={cm.flex({ gap: 'sm' })}>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('maps.searchPlaceholder', {}, { defaultValue: 'Search maps…' })}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-primary/30 transition-all',
            )}
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            data-mol-id="maps-new-button"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.flex({ align: 'center', gap: 'xs' }),
              'rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-md disabled:opacity-60',
            )}
          >
            <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>add</span>
            {creating
              ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
              : t('maps.newMap', {}, { defaultValue: 'New map' })}
          </button>
        </div>
      </header>

      <div className={cm.cn(cm.flex({ gap: 'sm' }), 'flex-wrap')}>
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              'uppercase tracking-widest rounded-full transition-colors',
              filter === f
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
            )}
          >
            {filterLabels[f]}
          </button>
        ))}
      </div>

      {error && (
        <div
          className={cm.cn(
            cm.sp('p', 4),
            cm.textSize('sm'),
            'rounded-xl bg-tertiary-container/30 text-on-tertiary-container border border-tertiary/30',
          )}
        >
          {error}
        </div>
      )}

      {loading ? (
        <p className={cm.cn(cm.textSize('sm'), cm.textMuted, cm.textCenter, cm.sp('py', 12))}>
          {t('maps.loading', {}, { defaultValue: 'Loading your maps…' })}
        </p>
      ) : filtered.length === 0 ? (
        <div
          className={cm.cn(
            cm.sp('p', 12),
            cm.stack(3),
            cm.textCenter,
            'bg-surface-container-lowest rounded-2xl border border-dashed border-outline-variant/40',
          )}
        >
          <span
            className={cm.cn(
              cm.textSize('3xl'),
              'material-symbols-outlined text-on-surface-variant/60',
            )}
          >
            {maps.length === 0 ? 'hub' : 'travel_explore'}
          </span>
          {maps.length === 0 ? (
            <>
              <p
                className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'), 'text-on-surface')}
              >
                {t('maps.emptyAll.title', {}, { defaultValue: 'No maps yet' })}
              </p>
              <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
                {t(
                  'maps.emptyAll.body',
                  {},
                  { defaultValue: 'Create your first map to start branching ideas.' },
                )}
              </p>
              <div className={cm.flex({ justify: 'center' })}>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={creating}
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2),
                    cm.fontWeight('bold'),
                    'rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-md disabled:opacity-60',
                  )}
                >
                  {creating
                    ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
                    : t('maps.newMap', {}, { defaultValue: 'New map' })}
                </button>
              </div>
            </>
          ) : (
            <>
              <p
                className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'), 'text-on-surface')}
              >
                {t('maps.empty.title', {}, { defaultValue: 'Nothing matches that search' })}
              </p>
              <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
                {t(
                  'maps.empty.body',
                  {},
                  { defaultValue: 'Try a different filter or clear your search.' },
                )}
              </p>
            </>
          )}
        </div>
      ) : (
        <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'sm:grid-cols-2 lg:grid-cols-3')}>
          {filtered.map((m, idx) => (
            <MindMapCard key={m.id} map={m} paletteIndex={idx} />
          ))}
        </div>
      )}
    </div>
  )
}

export default Maps
