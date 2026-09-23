import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { MaintenanceQueueList, type MaintenanceTicket } from '../components/MaintenanceQueueList.js'

interface PropertyApi {
  id: string
  name: string
  address?: string | null
  unit_count?: number
}

interface UnitApi {
  id: string
  unit_number: string
  property_id: string
  status?: string
  rent_cents?: number
}

interface LeaseApi {
  id: string
  tenant_id: string
  unit_id: string
  end_date: string | null
  monthly_rent_cents: number
  status: string
}

interface TenantApi {
  id: string
  name: string
}

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

interface UnitView {
  id: string
  number: string
  tenant: string | null
  status: string
  rent_cents: number
  lease_end: string | null
}

const STATUS_PILL: Record<string, string> = {
  occupied: 'bg-success-light text-success',
  vacant: 'bg-warning-light text-warning',
  maintenance: 'bg-warning-container text-on-warning-container',
}

function unwrap<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[]
  const r = res as { data?: T[]; items?: T[] } | null | undefined
  if (!r) return []
  if (Array.isArray(r.data)) return r.data
  if (Array.isArray(r.items)) return r.items
  return []
}

function unwrapOne<T>(res: unknown): T | null {
  if (!res || typeof res !== 'object') return null
  const r = res as { data?: T } & T
  if ('data' in r && r.data) return r.data as T
  return r as T
}

function fmtCurrency(cents: number) {
  return `$${(cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function normalizePriority(p: string): MaintenanceTicket['priority'] {
  if (p === 'high' || p === 'medium' || p === 'low') return p
  return 'medium'
}

function normalizeStatus(s: string): MaintenanceTicket['status'] {
  if (s === 'open' || s === 'in_progress' || s === 'completed') return s
  return 'open'
}

export function PropertyDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()

  const [property, setProperty] = useState<PropertyApi | null>(null)
  const [units, setUnits] = useState<UnitView[]>([])
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    Promise.all([
      http.get<PropertyApi>(`/api/properties/${id}`).catch(() => null),
      http.get(`/api/units?property_id=${encodeURIComponent(id)}&limit=200`).catch(() => null),
      http.get('/api/leases?limit=200').catch(() => null),
      http.get('/api/tenants?limit=200').catch(() => null),
      http.get(`/api/maintenance?property_id=${encodeURIComponent(id)}&limit=20`).catch(() => null),
    ])
      .then(([pRes, uRes, lRes, tRes, mRes]) => {
        if (cancelled) return
        const p = unwrapOne<PropertyApi>(pRes)
        if (!p?.id) {
          setError(t('propertyDetail.notFound', {}, { defaultValue: 'Property not found' }))
          setLoading(false)
          return
        }
        const uApi = unwrap<UnitApi>(uRes)
        const lApi = unwrap<LeaseApi>(lRes)
        const tApi = unwrap<TenantApi>(tRes)
        const mApi = unwrap<MaintenanceApi>(mRes)
        const tenantById = new Map(tApi.map((tn) => [tn.id, tn.name]))
        const leaseByUnit = new Map<string, LeaseApi>()
        for (const lease of lApi) {
          const existing = leaseByUnit.get(lease.unit_id)
          if (!existing || (lease.status === 'active' && existing.status !== 'active')) {
            leaseByUnit.set(lease.unit_id, lease)
          }
        }
        const unitView: UnitView[] = uApi.map((u) => {
          const lease = leaseByUnit.get(u.id)
          const tenantName = lease ? (tenantById.get(lease.tenant_id) ?? null) : null
          const rent = lease?.monthly_rent_cents ?? u.rent_cents ?? 0
          const status = u.status ?? (lease ? 'occupied' : 'vacant')
          return {
            id: u.id,
            number: u.unit_number,
            tenant: tenantName,
            status,
            rent_cents: rent,
            lease_end: lease?.end_date ?? null,
          }
        })
        const ticketView: MaintenanceTicket[] = mApi.map((m) => {
          const unitForTicket = m.unit_id ? uApi.find((u) => u.id === m.unit_id) : undefined
          return {
            id: m.id,
            title: m.title,
            unit_number: unitForTicket?.unit_number ?? '—',
            property_name: p.name,
            priority: normalizePriority(m.priority),
            status: normalizeStatus(m.status),
            submitted_at: m.submitted_at ?? m.created_at ?? new Date().toISOString(),
          }
        })
        setProperty(p)
        setUnits(unitView)
        setTickets(ticketView)
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load')
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  if (loading) {
    return (
      <div
        className={cm.cn(
          cm.sp('px', 8),
          cm.sp('py', 16),
          cm.maxW('7xl'),
          cm.mxAuto,
          cm.textCenter,
          cm.textSize('sm'),
          'text-on-surface-variant',
        )}
      >
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  }

  if (error || !property) {
    return (
      <div
        className={cm.cn(cm.sp('px', 8), cm.sp('py', 16), cm.maxW('3xl'), cm.mxAuto, cm.textCenter)}
      >
        <h1
          className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}
          data-testid="property-detail-error"
        >
          {error ?? t('propertyDetail.notFound', {}, { defaultValue: 'Property not found' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
          {t(
            'propertyDetail.notFoundBody',
            {},
            {
              defaultValue:
                'It may have been removed, or the link is incorrect. Head back to your portfolio.',
            },
          )}
        </p>
        <Link
          to="/properties"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.sp('mt', 4),
            cm.fontWeight('semibold'),
            'inline-flex bg-primary text-on-primary rounded-full hover:bg-primary/90',
          )}
        >
          {t('propertyDetail.backToList', {}, { defaultValue: 'Back to properties' })}
        </Link>
      </div>
    )
  }

  const occupiedCount = units.filter((u) => u.status === 'occupied').length
  const totalUnits = units.length || (property.unit_count ?? 0)
  const totalRent = units
    .filter((u) => u.status === 'occupied')
    .reduce((acc, u) => acc + u.rent_cents, 0)
  const occupancyPct = totalUnits > 0 ? Math.round((occupiedCount / totalUnits) * 100) : 0

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(6))}>
      <nav className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
        <Link to="/properties" className={'hover:text-primary'}>
          {t('propertyDetail.breadcrumbProperties', {}, { defaultValue: 'Properties' })}
        </Link>
        <span className={cm.sp('mx', 2)}>/</span>
        <span className="text-on-surface" data-testid="property-detail-name">
          {property.name}
        </span>
      </nav>

      <header
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 'md' }),
          cm.sp('p', 8),
          'bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-[2rem] relative overflow-hidden',
        )}
      >
        <div className="relative z-10">
          <h1
            className={cm.cn(cm.textSize('4xl'), cm.sp('mt', 2), 'font-extrabold tracking-tight')}
          >
            {property.name}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-primary/80')}>
            {property.address ??
              t('propertyDetail.noAddress', {}, { defaultValue: 'No street address on file' })}
          </p>
        </div>
        <div
          className={cm.cn(
            cm.grid({ gap: 'md' }),
            'grid-cols-3 max-w-md relative z-10',
            cm.sp('mt', 4),
          )}
        >
          {[
            { key: 'units', defaultLabel: 'Units', value: String(totalUnits) },
            { key: 'occupancy', defaultLabel: 'Occupancy', value: `${occupancyPct}%` },
            { key: 'monthlyRent', defaultLabel: 'Rent / mo', value: fmtCurrency(totalRent) },
          ].map((stat) => (
            <div key={stat.key} className={cm.flex({ direction: 'col' })}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  'font-bold uppercase tracking-widest text-on-primary/60',
                )}
              >
                {t(`propertyDetail.stat.${stat.key}`, {}, { defaultValue: stat.defaultLabel })}
              </span>
              <span
                className={cm.cn(cm.textSize('2xl'), 'font-extrabold tabular-nums text-on-primary')}
                data-testid={`property-stat-${stat.key}`}
              >
                {stat.value}
              </span>
            </div>
          ))}
        </div>
        <div
          className={'absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-surface/10 blur-3xl'}
          aria-hidden="true"
        />
      </header>

      <section className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl')}>
        <h2 className={cm.cn(cm.textSize('xl'), cm.sp('mb', 4), cm.fontWeight('bold'))}>
          {t('propertyDetail.unitsHeading', {}, { defaultValue: 'Units' })}
        </h2>
        {units.length === 0 ? (
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('py', 6),
              'text-on-surface-variant text-center',
            )}
            data-testid="property-units-empty"
          >
            {t('propertyDetail.unitsEmpty', {}, { defaultValue: 'No units on this property yet.' })}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className={cm.cn(cm.w('full'), 'text-sm')}>
              <thead>
                <tr className={'border-b border-outline-variant text-left'}>
                  {['unit', 'tenant', 'status', 'rent', 'leaseEnd'].map((h) => (
                    <th
                      key={h}
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      {t(`propertyDetail.unitsCol.${h}`, {}, { defaultValue: h })}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60">
                {units.map((u) => (
                  <tr key={u.id} className={'hover:bg-surface-container-low transition-colors'}>
                    <td
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        'font-mono font-bold text-on-surface',
                      )}
                    >
                      {u.number}
                    </td>
                    <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-on-surface')}>
                      {u.tenant ?? <span className="text-on-surface-variant">—</span>}
                    </td>
                    <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                      <span
                        className={cm.cn(
                          cm.sp('px', 3),
                          cm.sp('py', 1),
                          cm.roundedFull,
                          'text-[10px] font-black uppercase tracking-widest',
                          STATUS_PILL[u.status] ?? 'bg-surface-secondary text-foreground',
                        )}
                      >
                        {t(`propertyDetail.unitStatus.${u.status}`, {}, { defaultValue: u.status })}
                      </span>
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        'tabular-nums font-semibold text-on-surface',
                      )}
                    >
                      {fmtCurrency(u.rent_cents)}
                    </td>
                    <td
                      className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-on-surface-variant')}
                    >
                      {fmtDate(u.lease_end)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {tickets.length > 0 && (
        <MaintenanceQueueList tickets={tickets} viewAllHref={`/maintenance?property=${id}`} />
      )}
    </div>
  )
}
