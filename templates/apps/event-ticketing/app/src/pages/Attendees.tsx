import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { KpiCard } from '../components/KpiCard.js'

interface AttendeeRow {
  id: string
  ref_code: string
  status: string
  tier_id?: string | null
  tier_name?: string | null
  name?: string | null
  email?: string | null
  purchased_at?: string | null
  checked_in_at?: string | null
}

interface EventRow {
  id: string
  title: string
}

const STATUS_META: Record<
  string,
  { labelKey: string; defaultLabel: string; bg: string; color: string }
> = {
  issued: {
    labelKey: 'attendees.status.pending',
    defaultLabel: 'Pending',
    bg: 'var(--color-status-neutral-bg)',
    color: 'var(--color-status-neutral)',
  },
  pending: {
    labelKey: 'attendees.status.pending',
    defaultLabel: 'Pending',
    bg: 'var(--color-status-neutral-bg)',
    color: 'var(--color-status-neutral)',
  },
  checked_in: {
    labelKey: 'attendees.status.checkedIn',
    defaultLabel: 'Checked in',
    bg: 'var(--color-status-checked-in-bg)',
    color: 'var(--color-status-checked-in)',
  },
  no_show: {
    labelKey: 'attendees.status.noShow',
    defaultLabel: 'No show',
    bg: 'var(--color-status-no-show-bg)',
    color: 'var(--color-status-no-show)',
  },
  transferred: {
    labelKey: 'attendees.status.transferred',
    defaultLabel: 'Transferred',
    bg: 'var(--color-status-transferred-bg)',
    color: 'var(--color-status-transferred)',
  },
  refunded: {
    labelKey: 'attendees.status.refunded',
    defaultLabel: 'Refunded',
    bg: 'var(--color-status-no-show-bg)',
    color: 'var(--color-status-no-show)',
  },
}

export function Attendees() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const [event, setEvent] = useState<EventRow | null>(null)
  const [attendees, setAttendees] = useState<AttendeeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'pending' | 'checked_in' | 'transferred'>('all')

  useEffect(() => {
    if (!id) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [evRes, attRes] = await Promise.all([
          http.get(`/api/events/${id}`).catch(() => ({ data: null })),
          http.get(`/api/attendees/${id}`).catch((e: Error) => ({ data: [], error: e })),
        ])
        if (cancelled) return
        setEvent(evRes.data as EventRow | null)
        setAttendees((attRes.data as AttendeeRow[]) ?? [])
      } catch (e) {
        if (!cancelled) setError((e as Error).message ?? 'Failed to load attendees')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [http, id])

  const stats = useMemo(() => {
    const total = attendees.length
    const checked = attendees.filter((a) => a.status === 'checked_in').length
    const pending = attendees.filter((a) => a.status === 'issued' || a.status === 'pending').length
    const transferred = attendees.filter((a) => a.status === 'transferred').length
    return {
      total,
      checked,
      pending,
      transferred,
      pct: total > 0 ? Math.round((checked / total) * 100) : 0,
    }
  }, [attendees])

  const visible = useMemo(() => {
    return attendees.filter((a) => {
      if (filter !== 'all') {
        if (filter === 'pending' && a.status !== 'issued' && a.status !== 'pending') return false
        if (filter === 'checked_in' && a.status !== 'checked_in') return false
        if (filter === 'transferred' && a.status !== 'transferred') return false
      }
      const q = query.toLowerCase().trim()
      if (q) {
        const hay = `${a.name ?? ''} ${a.email ?? ''} ${a.ref_code}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [attendees, filter, query])

  function exportCsv() {
    const header = ['Ref', 'Name', 'Email', 'Tier', 'Status', 'Purchased']
    const lines = [header.join(',')]
    for (const a of attendees) {
      lines.push(
        [
          a.ref_code,
          (a.name ?? '').replace(/,/g, ' '),
          (a.email ?? '').replace(/,/g, ' '),
          (a.tier_name ?? '').replace(/,/g, ' '),
          a.status,
          a.purchased_at ?? '',
        ]
          .map((c) => `"${String(c).replace(/"/g, '""')}"`)
          .join(','),
      )
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `attendees-${id ?? 'export'}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div
      className={cm.cn(cm.sp('p', 8), cm.stack(8), 'max-w-7xl w-full mx-auto')}
      data-mol-id="page-attendees"
    >
      <header className={cm.stack(2)}>
        <Link
          to={`/events/${id ?? ''}`}
          className={cm.cn(
            cm.textSize('xs'),
            'inline-flex items-center gap-1 font-bold uppercase tracking-widest text-primary hover:underline',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            arrow_back
          </span>
          {t('attendees.back', {}, { defaultValue: 'Back to event' })}
        </Link>
        <h1 className={cm.cn('text-4xl font-extrabold tracking-tight')}>
          {t(
            'attendees.heading',
            { title: event?.title ?? '…' },
            { defaultValue: 'Attendees · {{title}}' },
          )}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-xl')}>
          {t(
            'attendees.subtitle',
            {},
            {
              defaultValue:
                'Search the guest list and export it as CSV. Check-in updates appear here as they happen.',
            },
          )}
        </p>
      </header>

      {error ? (
        <p role="alert" className={cm.cn('text-error font-bold text-sm')}>
          {error}
        </p>
      ) : null}

      <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-2 md:grid-cols-4')}>
        <KpiCard
          label={t('nav.total', {}, { defaultValue: 'Total' })}
          value={loading ? '—' : stats.total.toLocaleString()}
          icon="groups"
          accent="primary"
        />
        <KpiCard
          label={t('attendees.kpi.checked', {}, { defaultValue: 'Checked in' })}
          value={loading ? '—' : `${stats.checked} · ${stats.pct}%`}
          icon="qr_code_2"
          accent="success"
        />
        <KpiCard
          label={t('status.pending', {}, { defaultValue: 'Pending' })}
          value={loading ? '—' : stats.pending.toLocaleString()}
          icon="schedule"
          accent="warning"
        />
        <KpiCard
          label={t('attendees.kpi.transferred', {}, { defaultValue: 'Transferred' })}
          value={loading ? '—' : stats.transferred.toLocaleString()}
          icon="swap_horiz"
          accent="rose"
        />
      </div>

      <div className={cm.cn('flex items-center gap-3 flex-wrap')}>
        <div
          className={cm.cn(
            'flex-1 min-w-[260px] flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface border border-outline-variant focus-within:border-primary',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined text-on-surface-variant')}
            aria-hidden="true"
          >
            search
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(
              'attendees.searchPlaceholder',
              {},
              { defaultValue: 'Search by name, email, or ref code' },
            )}
            className={cm.cn(
              'flex-1 bg-transparent border-none focus:outline-none text-sm font-medium',
            )}
            data-mol-id="attendees-search"
          />
        </div>
        <div className={cm.cn('flex items-center gap-2')}>
          {(['all', 'pending', 'checked_in', 'transferred'] as const).map((f) => {
            const active = filter === f
            const labels = {
              all: t('attendees.filter.all', {}, { defaultValue: 'All' }),
              pending: t('attendees.filter.pending', {}, { defaultValue: 'Pending' }),
              checked_in: t('attendees.filter.checkedIn', {}, { defaultValue: 'Checked in' }),
              transferred: t('attendees.filter.transferred', {}, { defaultValue: 'Transferred' }),
            } as const
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                data-mol-id={`filter-${f}`}
                className={cm.cn(
                  'px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition-colors',
                  active
                    ? 'border-transparent text-white'
                    : 'border-outline-variant text-on-surface-variant hover:text-on-surface',
                )}
                style={
                  active
                    ? {
                        background:
                          'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                      }
                    : undefined
                }
              >
                {labels[f]}
              </button>
            )
          })}
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={attendees.length === 0}
          data-mol-id="attendees-export"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2.5),
            'rounded-xl text-white text-sm font-bold inline-flex items-center gap-2 shadow-md shadow-primary/30 disabled:opacity-50',
          )}
          style={{
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
          }}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            download
          </span>
          {t('common.exportCsv', {}, { defaultValue: 'Export CSV' })}
        </button>
      </div>

      <section
        className={cm.cn(
          'bg-surface rounded-2xl border border-outline-variant/40 shadow-sm overflow-hidden',
        )}
      >
        <div className={cm.cn('overflow-x-auto')}>
          <table className={cm.cn('w-full text-sm')}>
            <thead className={cm.cn('bg-surface-container-low')}>
              <tr>
                {(
                  [
                    t('attendees.table.attendee', {}, { defaultValue: 'Attendee' }),
                    t('attendees.table.tier', {}, { defaultValue: 'Tier' }),
                    t('attendees.table.refCode', {}, { defaultValue: 'Ref code' }),
                    t('attendees.table.status', {}, { defaultValue: 'Status' }),
                    t('attendees.table.purchased', {}, { defaultValue: 'Purchased' }),
                  ] as const
                ).map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'text-left text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={cm.cn('divide-y divide-outline-variant/40')}>
              {visible.map((row) => {
                const meta = STATUS_META[row.status]
                const label = meta
                  ? t(meta.labelKey, {}, { defaultValue: meta.defaultLabel })
                  : row.status
                const bg = meta?.bg ?? 'var(--color-status-neutral-bg)'
                const color = meta?.color ?? 'var(--color-status-neutral)'
                const initials = (row.name ?? row.email ?? row.ref_code)
                  .split(/[\s@.]+/)
                  .filter(Boolean)
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()
                return (
                  <tr
                    key={row.id}
                    className={cm.cn('hover:bg-surface-container-low transition-colors')}
                    data-mol-id={`attendee-row-${row.id}`}
                  >
                    <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                        <span
                          className={cm.cn(
                            'w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold',
                          )}
                          style={{
                            background: 'var(--color-background-tertiary)',
                            color: 'var(--color-primary)',
                          }}
                        >
                          {initials || '?'}
                        </span>
                        <div>
                          <p className={cm.cn('font-bold text-on-surface')}>
                            {row.name ?? row.email ?? '—'}
                          </p>
                          {row.email && row.name ? (
                            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                              {row.email}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                      <span className={cm.cn('text-sm font-semibold')}>{row.tier_name ?? '—'}</span>
                    </td>
                    <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'font-mono text-xs')}>
                      {row.ref_code}
                    </td>
                    <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                      <span
                        className={cm.cn(
                          'px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest',
                        )}
                        style={{ background: bg, color }}
                      >
                        {label}
                      </span>
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        'text-on-surface-variant text-xs tabular-nums',
                      )}
                    >
                      {row.purchased_at
                        ? new Date(row.purchased_at).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })
                        : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {!loading && visible.length === 0 ? (
          <p
            className={cm.cn(cm.textCenter, cm.sp('py', 8), cm.textMuted, cm.textSize('sm'))}
            data-mol-id="attendees-empty"
          >
            {attendees.length === 0
              ? t('attendees.emptyAll', {}, { defaultValue: 'No tickets sold yet.' })
              : t('attendees.empty', {}, { defaultValue: 'No attendees match those filters.' })}
          </p>
        ) : null}
        {loading ? (
          <p className={cm.cn(cm.textCenter, cm.sp('py', 8), cm.textMuted, cm.textSize('sm'))}>
            {t('attendees.loading', {}, { defaultValue: 'Loading attendees…' })}
          </p>
        ) : null}
      </section>
    </div>
  )
}

export default Attendees
