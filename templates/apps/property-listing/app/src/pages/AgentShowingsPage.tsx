/**
 * AgentShowingsPage — `/admin/showings`
 *
 * Agent's property tour calendar. Lists scheduled tours, allows the agent
 * to mark tours completed/canceled/no-show inline, and to delete past
 * showings. New showings are scheduled from a lead detail or property
 * detail context (out of scope here).
 *
 * Backend wiring:
 *   - GET    /api/showings
 *   - PUT    /api/showings/:id  { status, scheduled_at, notes, ... }
 *   - DELETE /api/showings/:id
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface Showing {
  id: string
  agent_id?: string
  property_id?: string
  lead_id?: string | null
  scheduled_at: string
  duration_min?: number
  notes?: string
  status: 'scheduled' | 'completed' | 'canceled' | 'no_show'
  created_at?: string
}

interface PropertyMini {
  id: string
  title?: string
  address?: string
  city?: string
}

const STATUS_FILTERS: Array<Showing['status'] | 'all' | 'upcoming'> = [
  'all',
  'upcoming',
  'scheduled',
  'completed',
  'canceled',
  'no_show',
]

function unwrapList<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[]
  if (res && typeof res === 'object') {
    const inner = (res as { data?: unknown }).data
    if (Array.isArray(inner)) return inner as T[]
    if (inner && typeof inner === 'object' && Array.isArray((inner as { data?: unknown }).data)) {
      return (inner as { data: T[] }).data
    }
  }
  return []
}

function statusBadge(status: Showing['status'], cm: ReturnType<typeof getClassMap>): string {
  switch (status) {
    case 'scheduled':
      return cm.cn('bg-secondary-container text-on-secondary-container')
    case 'completed':
      return cm.cn('bg-success-light text-success')
    case 'canceled':
      return cm.cn('bg-rose-100 text-error')
    case 'no_show':
      return cm.cn('bg-warning-light text-warning')
    default:
      return cm.cn('bg-surface-secondary text-foreground')
  }
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function AgentShowingsPage() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [showings, setShowings] = useState<Showing[]>([])
  const [propertyById, setPropertyById] = useState<Map<string, PropertyMini>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]>('upcoming')
  const [busyId, setBusyId] = useState<string | null>(null)

  const fetchShowings = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const url =
        filter === 'all' || filter === 'upcoming'
          ? '/api/showings?limit=100'
          : `/api/showings?status=${filter}&limit=100`
      const res = await http.get(url)
      const list = unwrapList<Showing>(res)
      setShowings(list)

      // Best-effort hydrate property names so we can render
      // 'Title — City' on each row.
      const ids = Array.from(
        new Set(list.map((s) => s.property_id).filter((id): id is string => Boolean(id))),
      )
      if (ids.length > 0) {
        const settled = await Promise.allSettled(ids.map((id) => http.get(`/api/properties/${id}`)))
        const map = new Map<string, PropertyMini>()
        settled.forEach((r, i) => {
          if (r.status === 'fulfilled') {
            const body = (r.value as { data?: unknown })?.data as PropertyMini | undefined
            if (body && body.id) map.set(ids[i], body)
          }
        })
        setPropertyById(map)
      } else {
        setPropertyById(new Map())
      }
    } catch (err: unknown) {
      logError(err instanceof Error ? err : 'Failed to load showings')
      setError(t('showings.loadError', {}, { defaultValue: 'Unable to load showings.' }))
    } finally {
      setLoading(false)
    }
  }, [http, filter, t])

  useEffect(() => {
    fetchShowings()
  }, [fetchShowings])

  const visibleShowings = useMemo(() => {
    if (filter !== 'upcoming') return showings
    const now = Date.now()
    return showings.filter(
      (s) => s.status === 'scheduled' && new Date(s.scheduled_at).getTime() >= now,
    )
  }, [showings, filter])

  const updateStatus = async (id: string, status: Showing['status']) => {
    setBusyId(id)
    const previous = showings
    setShowings((xs) => xs.map((s) => (s.id === id ? { ...s, status } : s)))
    try {
      await http.put(`/api/showings/${id}`, { status })
    } catch (err: unknown) {
      logError(err instanceof Error ? err : 'Failed to update showing')
      setShowings(previous)
      alert(t('showings.updateError', {}, { defaultValue: 'Failed to update showing.' }))
    } finally {
      setBusyId(null)
    }
  }

  const deleteShowing = async (id: string) => {
    if (!window.confirm(t('showings.deleteConfirm', {}, { defaultValue: 'Cancel this showing?' })))
      return
    setBusyId(id)
    const previous = showings
    setShowings((xs) => xs.filter((s) => s.id !== id))
    try {
      await http.delete(`/api/showings/${id}`)
    } catch (err: unknown) {
      logError(err instanceof Error ? err : 'Failed to delete showing')
      setShowings(previous)
      alert(t('showings.deleteError', {}, { defaultValue: 'Failed to cancel showing.' }))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div
      className={cm.cn('bg-background font-body text-on-surface antialiased min-h-screen')}
      data-mol-id="page-agent-showings"
    >
      <header
        className={cm.cn(
          cm.flex({ justify: 'between', align: 'center' }),
          cm.sp('px', 12),
          cm.sp('py', 6),
          'border-b border-border bg-success-light/80 backdrop-blur-md',
        )}
      >
        <div>
          <h1
            className={cm.cn(
              cm.textSize('3xl'),
              cm.fontWeight('bold'),
              'text-success tracking-tight',
            )}
          >
            {t('showings.heading', {}, { defaultValue: 'Showings' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-success/60 mt-1')}>
            {t('showings.subheading', {}, { defaultValue: 'Manage your property tour calendar.' })}
          </p>
        </div>
        <Link
          to="/admin/dashboard"
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'rounded-full text-success hover:bg-success-light',
          )}
        >
          {t('common.backToDashboard', {}, { defaultValue: '← Dashboard' })}
        </Link>
      </header>

      <main className={cm.cn('px-4 md:px-12', cm.sp('py', 8), cm.stack(8))}>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'md' }),
            'flex-wrap pb-2 overflow-x-auto scrollbar-hide',
          )}
        >
          {STATUS_FILTERS.map((opt) => (
            <button
              key={opt}
              onClick={() => setFilter(opt)}
              data-mol-id={`showings-filter-${opt}`}
              className={cm.cn(
                'px-5 py-2 rounded-full text-sm font-semibold transition-colors capitalize',
                filter === opt
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-highest text-on-surface-variant hover:bg-success-light',
              )}
            >
              {opt === 'no_show' ? 'No Show' : opt}
            </button>
          ))}
        </div>

        {loading ? (
          <div className={cm.cn(cm.flex({ justify: 'center', align: 'center' }), cm.sp('py', 16))}>
            <div
              className={cm.cn(
                cm.w(8),
                cm.h(8),
                cm.roundedFull,
                'border-4 border-emerald-600 border-t-transparent animate-spin',
              )}
              aria-label={t('common.loading', {}, { defaultValue: 'Loading' })}
            />
          </div>
        ) : error ? (
          <div
            className={cm.cn(
              cm.sp('p', 8),
              'rounded-xl bg-error-container text-on-error-container',
            )}
            role="alert"
          >
            <p className={cm.fontWeight('semibold')}>{error}</p>
            <button
              onClick={fetchShowings}
              className={cm.cn(
                cm.sp('mt', 4),
                cm.sp('px', 6),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'bg-primary text-on-primary rounded-xl hover:opacity-90',
              )}
            >
              {t('common.retry', {}, { defaultValue: 'Retry' })}
            </button>
          </div>
        ) : visibleShowings.length === 0 ? (
          <div
            className={cm.cn(
              cm.sp('p', 12),
              cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
              'rounded-xl bg-surface-container-low text-on-surface-variant text-center',
            )}
            data-mol-id="empty-showings"
          >
            <span className={cm.cn('material-symbols-outlined text-5xl text-success/30')}>
              event_busy
            </span>
            <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('xl'), 'text-success')}>
              {showings.length === 0
                ? t('showings.emptyTitle', {}, { defaultValue: 'No showings scheduled' })
                : t('showings.emptyFilteredTitle', {}, { defaultValue: 'Nothing in this view' })}
            </p>
            <p className={cm.cn(cm.textSize('sm'))}>
              {showings.length === 0
                ? t(
                    'showings.emptyHint',
                    {},
                    {
                      defaultValue:
                        'Showings appear here once you schedule property tours from a lead.',
                    },
                  )
                : t('showings.emptyFilteredHint', {}, { defaultValue: 'Try a different filter.' })}
            </p>
          </div>
        ) : (
          <section className={cm.stack(3)} data-mol-id="showings-list">
            {visibleShowings.map((showing) => {
              const property = showing.property_id ? propertyById.get(showing.property_id) : null
              return (
                <article
                  key={showing.id}
                  data-mol-id={`showing-card-${showing.id}`}
                  className={cm.cn(
                    cm.sp('p', 6),
                    cm.flex({ align: 'center', justify: 'between', gap: 'lg' }),
                    'bg-surface-container-lowest rounded-xl shadow-sm border border-border hover:shadow-md transition-shadow',
                  )}
                >
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }), 'min-w-0 flex-1')}>
                    <div
                      className={cm.cn(
                        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
                        cm.h(16),
                        cm.w(16),
                        'rounded-lg bg-success-light text-success shrink-0',
                      )}
                    >
                      <span
                        className={cm.cn(
                          cm.textSize('xs'),
                          'uppercase font-semibold tracking-wide',
                        )}
                      >
                        {new Date(showing.scheduled_at).toLocaleDateString(undefined, {
                          month: 'short',
                        })}
                      </span>
                      <span className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
                        {new Date(showing.scheduled_at).getDate()}
                      </span>
                    </div>
                    <div className={cm.cn('min-w-0')}>
                      <h3
                        className={cm.cn(
                          cm.fontWeight('bold'),
                          cm.textSize('base'),
                          'text-on-surface truncate',
                        )}
                      >
                        {property
                          ? `${property.title ?? property.address ?? 'Property'}${
                              property.city ? ` — ${property.city}` : ''
                            }`
                          : (showing.property_id ?? 'Property')}
                      </h3>
                      <p
                        className={cm.cn(
                          cm.textSize('sm'),
                          'text-on-surface-variant flex items-center gap-2',
                        )}
                      >
                        <span className={cm.cn('material-symbols-outlined text-base')}>
                          schedule
                        </span>
                        {fmtDateTime(showing.scheduled_at)}
                        {showing.duration_min ? (
                          <span className={cm.textSize('xs')}>· {showing.duration_min} min</span>
                        ) : null}
                      </p>
                      {showing.notes ? (
                        <p
                          className={cm.cn(
                            cm.textSize('xs'),
                            cm.sp('mt', 1),
                            'text-on-surface-variant line-clamp-2',
                          )}
                        >
                          {showing.notes}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'shrink-0')}>
                    <span
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 1),
                        cm.fontWeight('bold'),
                        cm.textSize('xs'),
                        'rounded-md uppercase tracking-wider',
                        statusBadge(showing.status, cm),
                      )}
                    >
                      {showing.status === 'no_show' ? 'No Show' : showing.status}
                    </span>
                    <select
                      disabled={busyId === showing.id}
                      value={showing.status}
                      onChange={(e) =>
                        updateStatus(showing.id, e.target.value as Showing['status'])
                      }
                      data-mol-id={`status-select-${showing.id}`}
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.sp('py', 1),
                        cm.textSize('xs'),
                        cm.fontWeight('semibold'),
                        'bg-surface-container-low border border-border rounded-md text-on-surface',
                      )}
                    >
                      <option value="scheduled">scheduled</option>
                      <option value="completed">completed</option>
                      <option value="canceled">canceled</option>
                      <option value="no_show">no_show</option>
                    </select>
                    <button
                      type="button"
                      disabled={busyId === showing.id}
                      onClick={() => deleteShowing(showing.id)}
                      data-mol-id={`delete-showing-${showing.id}`}
                      aria-label={t('showings.delete', {}, { defaultValue: 'Cancel showing' })}
                      className={cm.cn(
                        cm.sp('p', 2),
                        'bg-surface-container-low rounded-lg hover:bg-error-container/30 transition-colors text-error disabled:opacity-50',
                      )}
                    >
                      <span className={cm.cn('material-symbols-outlined text-base')}>delete</span>
                    </button>
                  </div>
                </article>
              )
            })}
          </section>
        )}
      </main>
    </div>
  )
}

export default AgentShowingsPage
export { AgentShowingsPage, AgentShowingsPage as AgentShowingsPagePage }
