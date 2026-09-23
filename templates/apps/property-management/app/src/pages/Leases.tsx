import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { LoadErrorBanner } from '../components/LoadErrorBanner.js'

interface LeaseApi {
  id: string
  tenant_id: string
  unit_id: string
  start_date: string | null
  end_date: string | null
  monthly_rent_cents: number
  status: 'active' | 'pending' | 'expired' | 'terminated' | string
}
interface TenantApi {
  id: string
  name: string
}
interface UnitApi {
  id: string
  unit_number: string
  property_id: string
}
interface PropertyApi {
  id: string
  name: string
}

interface LeaseView {
  id: string
  tenant: string
  property: string
  unit: string
  start: string | null
  end: string | null
  rent_cents: number
  status: 'current' | 'expiring' | 'renewal' | 'expired'
}

const PILL: Record<LeaseView['status'], { label: string; classes: string }> = {
  current: { label: 'Current', classes: 'bg-success-light text-success' },
  expiring: { label: 'Expiring', classes: 'bg-tertiary-container text-on-tertiary-container' },
  renewal: { label: 'Renewal sent', classes: 'bg-warning-light text-warning' },
  expired: { label: 'Expired', classes: 'bg-border text-foreground' },
}

function unwrap<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[]
  const r = res as { data?: T[]; items?: T[] } | null | undefined
  if (!r) return []
  if (Array.isArray(r.data)) return r.data
  if (Array.isArray(r.items)) return r.items
  return []
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
function daysUntil(iso: string | null) {
  if (!iso) return Infinity
  const ms = new Date(iso).getTime() - Date.now()
  return Math.round(ms / (1000 * 60 * 60 * 24))
}

function deriveStatus(lease: LeaseApi): LeaseView['status'] {
  if (lease.status === 'expired' || lease.status === 'terminated') return 'expired'
  const days = daysUntil(lease.end_date)
  if (days < 0) return 'expired'
  if (days <= 60) return 'expiring'
  return 'current'
}

export function Leases() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [leases, setLeases] = useState<LeaseView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)
    Promise.all([
      http.get('/api/leases?limit=200').catch(() => null),
      http.get('/api/tenants?limit=200').catch(() => null),
      http.get('/api/units?limit=200').catch(() => null),
      http.get('/api/properties?limit=100').catch(() => null),
    ])
      .then(([lRes, tRes, uRes, pRes]) => {
        if (cancelled) return
        // The lease fetch is the primary one — if IT failed, show an error
        // banner instead of a fake "no leases" empty state. The tenant/unit/
        // property lookups only decorate rows, so they may degrade.
        if (!lRes) {
          setError(true)
          setLoading(false)
          return
        }
        const lApi = unwrap<LeaseApi>(lRes)
        const tApi = unwrap<TenantApi>(tRes)
        const uApi = unwrap<UnitApi>(uRes)
        const pApi = unwrap<PropertyApi>(pRes)
        const tenantById = new Map(tApi.map((tn) => [tn.id, tn.name]))
        const unitById = new Map(uApi.map((u) => [u.id, u]))
        const propertyById = new Map(pApi.map((p) => [p.id, p.name]))
        const view: LeaseView[] = lApi.map((l) => {
          const unit = unitById.get(l.unit_id)
          const propertyId = unit?.property_id ?? null
          return {
            id: l.id,
            tenant: tenantById.get(l.tenant_id) ?? '—',
            property: propertyId ? (propertyById.get(propertyId) ?? '—') : '—',
            unit: unit?.unit_number ?? '—',
            start: l.start_date,
            end: l.end_date,
            rent_cents: l.monthly_rent_cents ?? 0,
            status: deriveStatus(l),
          }
        })
        setLeases(view)
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, reloadKey])

  const expiringSoon = leases.filter((l) => l.status === 'expiring').length
  const totalMonthly = leases.reduce((acc, l) => acc + l.rent_cents, 0)

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(6))}>
      <header
        className={cm.flex({ align: 'baseline', justify: 'between', wrap: 'wrap', gap: 'md' })}
      >
        <div>
          <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
            {t('leases.heading', {}, { defaultValue: 'Leases' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'leases.subheading',
              { count: leases.length, expiring: expiringSoon, monthly: fmtCurrency(totalMonthly) },
              {
                defaultValue:
                  '{{count}} active leases · {{expiring}} expiring soon · {{monthly}} / mo total',
              },
            )}
          </p>
        </div>
        <Link
          to="/leases/new"
          data-testid="add-lease-btn"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            cm.flex({ align: 'center', gap: 'xs' }),
            'bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors',
          )}
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">
            add
          </span>
          {t('leases.addLease', {}, { defaultValue: 'New lease' })}
        </Link>
      </header>

      {loading ? (
        <section
          className={cm.cn(
            cm.sp('p', 6),
            cm.textCenter,
            cm.textSize('sm'),
            'text-on-surface-variant bg-surface-container-lowest rounded-2xl',
          )}
        >
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </section>
      ) : error ? (
        <LoadErrorBanner testId="leases-error" onRetry={() => setReloadKey((k) => k + 1)} />
      ) : leases.length === 0 ? (
        <section
          className={cm.cn(
            cm.sp('py', 16),
            cm.textCenter,
            'bg-surface-container-lowest rounded-2xl border border-dashed border-outline-variant',
          )}
          data-testid="leases-empty"
        >
          <span
            className="material-symbols-outlined text-on-surface-variant"
            style={{ fontSize: '48px' }}
            aria-hidden="true"
          >
            description
          </span>
          <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mt', 4))}>
            {t('leases.empty.title', {}, { defaultValue: 'No leases yet' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
            {t(
              'leases.empty.body',
              {},
              { defaultValue: 'Add a tenant and a unit, then create your first lease.' },
            )}
          </p>
          <Link
            to="/leases/new"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.sp('mt', 4),
              cm.fontWeight('semibold'),
              cm.flex({ align: 'center', gap: 'xs' }),
              'inline-flex bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors',
            )}
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              add
            </span>
            {t('leases.empty.cta', {}, { defaultValue: 'Create lease' })}
          </Link>
        </section>
      ) : (
        <section className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl')}>
          <div className="overflow-x-auto">
            <table className={cm.cn(cm.w('full'), 'text-sm')}>
              <thead>
                <tr className={'border-b border-outline-variant text-left'}>
                  {['tenant', 'unit', 'term', 'rent', 'status'].map((h) => (
                    <th
                      key={h}
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      {t(`leases.col.${h}`, {}, { defaultValue: h })}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60" data-testid="leases-tbody">
                {leases.map((l) => {
                  const days = daysUntil(l.end)
                  const pill = PILL[l.status]
                  return (
                    <tr
                      key={l.id}
                      className={'hover:bg-surface-container-low transition-colors'}
                      data-testid={`lease-row-${l.id}`}
                    >
                      <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                        <p className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}>
                          {l.tenant}
                        </p>
                        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                          {l.property}
                        </p>
                      </td>
                      <td
                        className={cm.cn(
                          cm.sp('px', 4),
                          cm.sp('py', 3),
                          'font-mono font-bold text-on-surface',
                        )}
                      >
                        {l.unit}
                      </td>
                      <td
                        className={cm.cn(
                          cm.sp('px', 4),
                          cm.sp('py', 3),
                          cm.textSize('xs'),
                          'text-on-surface-variant tabular-nums',
                        )}
                      >
                        <span className="block">
                          {fmtDate(l.start)} → {fmtDate(l.end)}
                        </span>
                        {Number.isFinite(days) && (
                          <span
                            className={cm.cn(
                              cm.fontWeight('bold'),
                              days <= 60 ? 'text-tertiary' : 'text-on-surface-variant',
                            )}
                          >
                            {t(
                              'leases.daysRemaining',
                              { days: Math.max(days, 0) },
                              { defaultValue: '{{days}} days remaining' },
                            )}
                          </span>
                        )}
                      </td>
                      <td
                        className={cm.cn(
                          cm.sp('px', 4),
                          cm.sp('py', 3),
                          'tabular-nums font-semibold text-on-surface',
                        )}
                      >
                        {fmtCurrency(l.rent_cents)} / mo
                      </td>
                      <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                        <span
                          className={cm.cn(
                            cm.sp('px', 3),
                            cm.sp('py', 1),
                            cm.roundedFull,
                            'text-[10px] font-black uppercase tracking-widest',
                            pill.classes,
                          )}
                        >
                          {t(`leases.status.${l.status}`, {}, { defaultValue: pill.label })}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
