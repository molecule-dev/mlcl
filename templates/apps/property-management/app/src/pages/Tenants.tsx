import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface TenantApi {
  id: string
  name: string
  email: string | null
  phone?: string | null
  status?: string
  property_id?: string | null
  unit_id?: string | null
  balance_cents?: number
  lease_end?: string | null
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

interface LeaseApi {
  id: string
  tenant_id: string
  unit_id: string
  start_date: string | null
  end_date: string | null
  monthly_rent_cents: number
  status: string
}

interface TenantView {
  id: string
  name: string
  email: string
  phone: string
  property: string
  unit: string
  lease_end: string | null
  balance_cents: number
  status: 'paid' | 'pending' | 'overdue'
}

const STATUS_PILL: Record<TenantView['status'], string> = {
  paid: 'bg-success-light text-success',
  pending: 'bg-warning-light text-warning',
  overdue: 'bg-error-light text-error',
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
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function Tenants() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [search, setSearch] = useState('')
  const [tenants, setTenants] = useState<TenantView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      http.get('/api/tenants?limit=100').catch(() => null),
      http.get('/api/properties?limit=100').catch(() => null),
      http.get('/api/units?limit=100').catch(() => null),
      http.get('/api/leases?limit=100').catch(() => null),
    ])
      .then(([tRes, pRes, uRes, lRes]) => {
        if (cancelled) return
        const tApi = unwrap<TenantApi>(tRes)
        const pApi = unwrap<PropertyApi>(pRes)
        const uApi = unwrap<UnitApi>(uRes)
        const lApi = unwrap<LeaseApi>(lRes)
        const propertyById = new Map(pApi.map((p) => [p.id, p.name]))
        const unitById = new Map(uApi.map((u) => [u.id, u]))
        const leaseByTenant = new Map<string, LeaseApi>()
        for (const lease of lApi) {
          const existing = leaseByTenant.get(lease.tenant_id)
          if (!existing || (lease.status === 'active' && existing.status !== 'active')) {
            leaseByTenant.set(lease.tenant_id, lease)
          }
        }
        const view: TenantView[] = tApi.map((tn) => {
          const lease = leaseByTenant.get(tn.id)
          const unit = lease
            ? unitById.get(lease.unit_id)
            : tn.unit_id
              ? unitById.get(tn.unit_id)
              : undefined
          const propertyId = unit?.property_id ?? tn.property_id ?? null
          const balance = tn.balance_cents ?? 0
          const status: TenantView['status'] =
            balance <= 0
              ? 'paid'
              : balance > (lease?.monthly_rent_cents ?? 0)
                ? 'overdue'
                : 'pending'
          return {
            id: tn.id,
            name: tn.name,
            email: tn.email ?? '',
            phone: tn.phone ?? '',
            property: propertyId ? (propertyById.get(propertyId) ?? '—') : '—',
            unit: unit?.unit_number ?? '—',
            lease_end: lease?.end_date ?? tn.lease_end ?? null,
            balance_cents: balance,
            status,
          }
        })
        setTenants(view)
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
  }, [http])

  const visible = useMemo(() => {
    if (!search.trim()) return tenants
    const q = search.toLowerCase()
    return tenants.filter(
      (tn) =>
        tn.name.toLowerCase().includes(q) ||
        tn.email.toLowerCase().includes(q) ||
        tn.unit.toLowerCase().includes(q) ||
        tn.property.toLowerCase().includes(q),
    )
  }, [search, tenants])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(6))}>
      <header
        className={cm.flex({ align: 'baseline', justify: 'between', wrap: 'wrap', gap: 'md' })}
      >
        <div>
          <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
            {t('tenants.heading', {}, { defaultValue: 'Tenants' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'tenants.subheading',
              { count: tenants.length },
              { defaultValue: '{{count}} active tenants across your portfolio' },
            )}
          </p>
        </div>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'relative')}>
            <span
              className="material-symbols-outlined text-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            >
              search
            </span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('tenants.searchPlaceholder', {}, { defaultValue: 'Search tenants…' })}
              className={cm.cn(
                cm.sp('pl', 10),
                cm.sp('pr', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.w(72),
                'rounded-full bg-surface border border-outline-variant focus:outline-none focus:ring-2 ring-primary/30',
              )}
            />
          </div>
          <Link
            to="/tenants/new"
            data-testid="add-tenant-btn"
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
            {t('tenants.addTenant', {}, { defaultValue: 'Add tenant' })}
          </Link>
        </div>
      </header>

      {error && (
        <div
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-2xl bg-error-light text-error border border-red-200 text-sm',
          )}
        >
          {error}
        </div>
      )}

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
      ) : visible.length === 0 ? (
        <div
          className={cm.cn(
            cm.sp('py', 16),
            cm.textCenter,
            'bg-surface-container-lowest rounded-2xl border border-dashed border-outline-variant',
          )}
        >
          <span
            className="material-symbols-outlined text-on-surface-variant"
            style={{ fontSize: '48px' }}
            aria-hidden="true"
          >
            person
          </span>
          <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mt', 4))}>
            {tenants.length === 0
              ? t('tenants.empty.title', {}, { defaultValue: 'No tenants yet' })
              : t('tenants.empty.search', {}, { defaultValue: 'No tenants match that search' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
            {tenants.length === 0
              ? t(
                  'tenants.empty.body',
                  {},
                  { defaultValue: 'Add your first tenant to start tracking leases and rent.' },
                )
              : t('tenants.empty.searchBody', {}, { defaultValue: 'Try a different search term.' })}
          </p>
          {tenants.length === 0 && (
            <Link
              to="/tenants/new"
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
              {t('tenants.empty.cta', {}, { defaultValue: 'Add tenant' })}
            </Link>
          )}
        </div>
      ) : (
        <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3')}>
          {visible.map((tn) => (
            <Link
              key={tn.id}
              to={`/tenants/${tn.id}`}
              data-testid={`tenant-card-${tn.id}`}
              className={cm.cn(
                cm.sp('p', 5),
                cm.flex({ direction: 'col', gap: 'sm' }),
                'bg-surface-container-lowest rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all border border-outline-variant/40',
              )}
            >
              <div className={cm.flex({ align: 'center', justify: 'between', gap: 'md' })}>
                <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.w(12),
                      cm.h(12),
                      cm.roundedFull,
                      'bg-primary text-on-primary font-bold shrink-0',
                    )}
                  >
                    {initials(tn.name)}
                  </div>
                  <div>
                    <p
                      className={cm.cn(
                        cm.textSize('base'),
                        cm.fontWeight('bold'),
                        'text-on-surface',
                      )}
                    >
                      {tn.name}
                    </p>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {tn.email}
                    </p>
                  </div>
                </div>
                <span
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    cm.roundedFull,
                    'text-[10px] font-black uppercase tracking-widest',
                    STATUS_PILL[tn.status],
                  )}
                >
                  {t(`tenants.status.${tn.status}`, {}, { defaultValue: tn.status })}
                </span>
              </div>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between' }),
                  cm.sp('pt', 3),
                  cm.sp('mt', 2),
                  'border-t border-outline-variant/40 text-xs text-on-surface-variant',
                )}
              >
                <span>
                  {t(
                    'tenants.cardLocation',
                    { property: tn.property, unit: tn.unit },
                    { defaultValue: '{{property}} · Unit {{unit}}' },
                  )}
                </span>
                <span className="tabular-nums">
                  {tn.lease_end
                    ? t(
                        'tenants.leaseEnds',
                        { date: fmtDate(tn.lease_end) },
                        { defaultValue: 'Lease ends {{date}}' },
                      )
                    : t('tenants.noLease', {}, { defaultValue: 'No active lease' })}
                </span>
              </div>
              {tn.balance_cents > 0 && (
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    tn.status === 'overdue' ? 'text-error' : 'text-warning',
                  )}
                >
                  {t(
                    'tenants.balanceDue',
                    { amount: fmtCurrency(tn.balance_cents) },
                    { defaultValue: '{{amount}} balance due' },
                  )}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
