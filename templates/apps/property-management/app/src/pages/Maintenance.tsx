import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { MaintenanceTicket } from '../components/MaintenanceQueueList.js'

interface MaintenanceApi {
  id: string
  title: string
  status: 'open' | 'in_progress' | 'completed' | string
  priority: 'low' | 'medium' | 'high' | string
  unit_id?: string | null
  property_id?: string | null
  created_at?: string
  submitted_at?: string
}

interface PropertyApi {
  id: string
  name: string
}
interface UnitApi {
  id: string
  unit_number: string
  property_id: string
}

const COLUMNS: ReadonlyArray<{
  status: MaintenanceTicket['status']
  defaultLabel: string
  tint: string
}> = [
  { status: 'open', defaultLabel: 'Open', tint: 'border-orange-400' },
  { status: 'in_progress', defaultLabel: 'In Progress', tint: 'border-blue-400' },
  { status: 'completed', defaultLabel: 'Completed', tint: 'border-emerald-400' },
]

const PRIORITY_TINT: Record<MaintenanceTicket['priority'], string> = {
  high: 'bg-error-light text-error',
  medium: 'bg-warning-light text-warning',
  low: 'bg-surface-secondary text-foreground',
}

function unwrap<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[]
  const r = res as { data?: T[]; items?: T[] } | null | undefined
  if (!r) return []
  if (Array.isArray(r.data)) return r.data
  if (Array.isArray(r.items)) return r.items
  return []
}

function normalizePriority(p: string): MaintenanceTicket['priority'] {
  if (p === 'high' || p === 'medium' || p === 'low') return p
  return 'medium'
}

function normalizeStatus(s: string): MaintenanceTicket['status'] {
  if (s === 'open' || s === 'in_progress' || s === 'completed') return s
  return 'open'
}

export function Maintenance() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      http.get('/api/maintenance?limit=200').catch(() => null),
      http.get('/api/properties?limit=100').catch(() => null),
      http.get('/api/units?limit=200').catch(() => null),
    ])
      .then(([mRes, pRes, uRes]) => {
        if (cancelled) return
        const mApi = unwrap<MaintenanceApi>(mRes)
        const pApi = unwrap<PropertyApi>(pRes)
        const uApi = unwrap<UnitApi>(uRes)
        const propertyById = new Map(pApi.map((p) => [p.id, p.name]))
        const unitById = new Map(uApi.map((u) => [u.id, u]))
        const view: MaintenanceTicket[] = mApi.map((m) => {
          const unit = m.unit_id ? unitById.get(m.unit_id) : undefined
          const propertyId = unit?.property_id ?? m.property_id ?? null
          return {
            id: m.id,
            title: m.title,
            unit_number: unit?.unit_number ?? '—',
            property_name: propertyId ? (propertyById.get(propertyId) ?? '—') : '—',
            priority: normalizePriority(m.priority),
            status: normalizeStatus(m.status),
            submitted_at: m.submitted_at ?? m.created_at ?? new Date().toISOString(),
          }
        })
        setTickets(view)
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(6))}>
      <header
        className={cm.flex({ align: 'baseline', justify: 'between', wrap: 'wrap', gap: 'md' })}
      >
        <div>
          <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
            {t('maintenance.heading', {}, { defaultValue: 'Maintenance' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'maintenance.subheading',
              {},
              { defaultValue: 'Tenants log requests, vendors get assigned, photos travel along.' },
            )}
          </p>
        </div>
        <Link
          to="/maintenance/new"
          data-testid="add-maintenance-btn"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            cm.flex({ align: 'center', gap: 'xs' }),
            'bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors',
          )}
        >
          <span className={'material-symbols-outlined text-base'} aria-hidden="true">
            add
          </span>
          {t('maintenance.newTicket', {}, { defaultValue: 'New work order' })}
        </Link>
      </header>

      {loading ? (
        <div
          className={cm.cn(
            cm.sp('py', 16),
            cm.textCenter,
            cm.textSize('sm'),
            'text-on-surface-variant bg-surface-container-lowest rounded-2xl',
          )}
        >
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </div>
      ) : tickets.length === 0 ? (
        <div
          className={cm.cn(
            cm.sp('py', 16),
            cm.textCenter,
            'bg-surface-container-lowest rounded-2xl border border-dashed border-outline-variant',
          )}
          data-testid="maintenance-empty"
        >
          <span
            className="material-symbols-outlined text-on-surface-variant"
            style={{ fontSize: '48px' }}
            aria-hidden="true"
          >
            handyman
          </span>
          <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mt', 4))}>
            {t('maintenance.empty.title', {}, { defaultValue: 'No work orders yet' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
            {t(
              'maintenance.empty.body',
              {},
              { defaultValue: 'Track tenant repair requests and vendor assignments here.' },
            )}
          </p>
          <Link
            to="/maintenance/new"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.sp('mt', 4),
              cm.fontWeight('semibold'),
              cm.flex({ align: 'center', gap: 'xs' }),
              'inline-flex bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors',
            )}
          >
            <span className={'material-symbols-outlined text-base'} aria-hidden="true">
              add
            </span>
            {t('maintenance.empty.cta', {}, { defaultValue: 'Create work order' })}
          </Link>
        </div>
      ) : (
        <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-3 items-start')}>
          {COLUMNS.map((col) => {
            const colTickets = tickets.filter((tk) => tk.status === col.status)
            return (
              <section
                key={col.status}
                className={cm.cn(
                  cm.sp('p', 5),
                  `bg-surface-container-low rounded-2xl border-t-4 ${col.tint}`,
                )}
                data-testid={`maintenance-col-${col.status}`}
              >
                <header
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('mb', 4),
                  )}
                >
                  <h2
                    className={cm.cn(
                      cm.textSize('sm'),
                      'font-black uppercase tracking-widest text-on-surface',
                    )}
                  >
                    {t(`maintenance.column.${col.status}`, {}, { defaultValue: col.defaultLabel })}
                  </h2>
                  <span
                    className={cm.cn(
                      cm.sp('px', 2),
                      cm.sp('py', 0),
                      cm.roundedFull,
                      'text-[10px] font-bold tabular-nums bg-surface text-on-surface-variant',
                    )}
                    data-testid={`maintenance-col-${col.status}-count`}
                  >
                    {colTickets.length}
                  </span>
                </header>
                <ul className={cm.stack(3)}>
                  {colTickets.map((ticket) => (
                    <li key={ticket.id}>
                      <Link
                        to={`/maintenance/${ticket.id}`}
                        className={cm.cn(
                          cm.sp('p', 4),
                          cm.flex({ direction: 'col', gap: 'xs' }),
                          'bg-surface-container-lowest rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all',
                        )}
                      >
                        <div
                          className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}
                        >
                          <p
                            className={cm.cn(
                              cm.textSize('sm'),
                              cm.fontWeight('bold'),
                              'text-on-surface line-clamp-1',
                            )}
                          >
                            {ticket.title}
                          </p>
                          <span
                            className={cm.cn(
                              cm.sp('px', 2),
                              cm.sp('py', 0),
                              cm.roundedFull,
                              'text-[10px] font-black uppercase tracking-widest',
                              PRIORITY_TINT[ticket.priority],
                            )}
                          >
                            {t(
                              `maintenance.priority.${ticket.priority}`,
                              {},
                              { defaultValue: ticket.priority },
                            )}
                          </span>
                        </div>
                        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                          {t(
                            'maintenance.ticketMeta',
                            { property: ticket.property_name, unit: ticket.unit_number },
                            { defaultValue: '{{property}} · Unit {{unit}}' },
                          )}
                        </p>
                      </Link>
                    </li>
                  ))}
                  {colTickets.length === 0 && (
                    <li
                      className={cm.cn(
                        cm.sp('py', 6),
                        cm.textCenter,
                        cm.textSize('xs'),
                        'text-on-surface-variant',
                      )}
                    >
                      {t('maintenance.columnEmpty', {}, { defaultValue: 'Nothing here yet.' })}
                    </li>
                  )}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
