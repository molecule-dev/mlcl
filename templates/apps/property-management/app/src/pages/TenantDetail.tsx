import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface TenantApi {
  id: string
  name: string
  email: string | null
  phone?: string | null
  property_id?: string | null
  unit_id?: string | null
}

interface PropertyApi {
  id: string
  name: string
  address?: string | null
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
interface PaymentApi {
  id: string
  amount_cents: number
  paid_at?: string | null
  occurred_at?: string | null
  due_date?: string | null
  status: string
  tenant_id?: string
  lease_id?: string
}

function unwrapList<T>(res: unknown): T[] {
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
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function initials(name: string) {
  return (
    name
      .split(' ')
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  )
}

function tenureYears(start: string | null) {
  if (!start) return '—'
  const ms = Date.now() - new Date(start).getTime()
  const years = ms / (1000 * 60 * 60 * 24 * 365)
  if (years < 0.1) return '<1 mo'
  return `${years.toFixed(1)} yrs`
}

export function TenantDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()

  const [tenant, setTenant] = useState<TenantApi | null>(null)
  const [property, setProperty] = useState<PropertyApi | null>(null)
  const [unit, setUnit] = useState<UnitApi | null>(null)
  const [lease, setLease] = useState<LeaseApi | null>(null)
  const [payments, setPayments] = useState<PaymentApi[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    Promise.all([
      http.get<TenantApi>(`/api/tenants/${id}`).catch(() => null),
      http.get(`/api/leases?tenant_id=${encodeURIComponent(id)}&limit=20`).catch(() => null),
      http.get(`/api/payments?tenant_id=${encodeURIComponent(id)}&limit=24`).catch(() => null),
    ])
      .then(async ([tRes, lRes, pRes]) => {
        if (cancelled) return
        const tn = unwrapOne<TenantApi>(tRes)
        if (!tn?.id) {
          setError(t('tenantDetail.notFound', {}, { defaultValue: 'Tenant not found' }))
          setLoading(false)
          return
        }
        setTenant(tn)
        const leases = unwrapList<LeaseApi>(lRes)
        const activeLease = leases.find((l) => l.status === 'active') ?? leases[0] ?? null
        setLease(activeLease)
        const allPayments = unwrapList<PaymentApi>(pRes)
        setPayments(allPayments)

        const unitId = activeLease?.unit_id ?? tn.unit_id ?? null
        const propertyId = tn.property_id ?? null
        if (unitId) {
          try {
            const u = unwrapOne<UnitApi>(await http.get<UnitApi>(`/api/units/${unitId}`))
            if (!cancelled) setUnit(u)
            if (u?.property_id) {
              try {
                const p = unwrapOne<PropertyApi>(
                  await http.get<PropertyApi>(`/api/properties/${u.property_id}`),
                )
                if (!cancelled) setProperty(p)
              } catch (_error) {
                // optional property fetch — ignore if it fails, property just won't display
              }
            }
          } catch (_error) {
            // optional unit fetch — ignore if it fails, unit just won't display
          }
        } else if (propertyId) {
          try {
            const p = unwrapOne<PropertyApi>(
              await http.get<PropertyApi>(`/api/properties/${propertyId}`),
            )
            if (!cancelled) setProperty(p)
          } catch (_error) {
            // optional property fetch — ignore if it fails, property just won't display
          }
        }
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load tenant')
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
          cm.maxW('5xl'),
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

  if (error || !tenant) {
    return (
      <div
        className={cm.cn(cm.sp('px', 8), cm.sp('py', 16), cm.maxW('3xl'), cm.mxAuto, cm.textCenter)}
      >
        <p
          className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}
          data-testid="tenant-detail-error"
        >
          {error ?? t('tenantDetail.notFound', {}, { defaultValue: 'Tenant not found' })}
        </p>
        <Link
          to="/tenants"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.sp('mt', 4),
            cm.fontWeight('semibold'),
            'inline-flex bg-primary text-on-primary rounded-full hover:bg-primary/90',
          )}
        >
          {t('tenantDetail.backToList', {}, { defaultValue: 'Back to tenants' })}
        </Link>
      </div>
    )
  }

  const monthlyRent = lease ? fmtCurrency(lease.monthly_rent_cents) : '—'
  const leaseEnd = lease?.end_date ? fmtDate(lease.end_date) : '—'

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, cm.stack(6))}>
      <nav className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
        <Link to="/tenants" className={'hover:text-primary'}>
          {t('tenantDetail.breadcrumb', {}, { defaultValue: 'Tenants' })}
        </Link>
        <span className={cm.sp('mx', 2)}>/</span>
        <span className="text-on-surface" data-testid="tenant-detail-name">
          {tenant.name}
        </span>
      </nav>

      <header
        className={cm.cn(
          cm.sp('p', 8),
          cm.flex({ direction: 'col', gap: 'md' }),
          'bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-[2rem] relative overflow-hidden',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'relative z-10')}>
          <div
            className={cm.cn(
              cm.w(16),
              cm.h(16),
              cm.roundedFull,
              cm.flex({ align: 'center', justify: 'center' }),
              'bg-surface/15 backdrop-blur-md text-2xl font-extrabold',
            )}
          >
            {initials(tenant.name)}
          </div>
          <div>
            <h1 className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight')}>
              {tenant.name}
            </h1>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-primary/80')}>
              {property?.name ?? t('status.unassigned', {}, { defaultValue: 'Unassigned' })}
              {unit?.unit_number ? ` · Unit ${unit.unit_number}` : ''}
              {property?.address ? ` · ${property.address}` : ''}
            </p>
          </div>
        </div>
        <div
          className={cm.cn(
            cm.grid({ gap: 'md' }),
            'grid-cols-3 max-w-md relative z-10',
            cm.sp('mt', 4),
          )}
        >
          {[
            { key: 'rent', defaultLabel: 'Monthly rent', value: monthlyRent },
            { key: 'leaseEnd', defaultLabel: 'Lease ends', value: leaseEnd },
            {
              key: 'tenure',
              defaultLabel: 'Tenure',
              value: tenureYears(lease?.start_date ?? null),
            },
          ].map((s) => (
            <div key={s.key}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  'font-bold uppercase tracking-widest text-on-primary/60',
                )}
              >
                {t(`tenantDetail.stat.${s.key}`, {}, { defaultValue: s.defaultLabel })}
              </span>
              <span
                className={cm.cn(cm.textSize('xl'), 'block font-extrabold tabular-nums')}
                data-testid={`tenant-stat-${s.key}`}
              >
                {s.value}
              </span>
            </div>
          ))}
        </div>
        <div
          className={'absolute -right-16 -bottom-16 w-64 h-64 rounded-full bg-surface/10 blur-3xl'}
          aria-hidden="true"
        />
      </header>

      <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-3')}>
        <section
          className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl lg:col-span-2')}
        >
          <h2 className={cm.cn(cm.textSize('lg'), cm.sp('mb', 4), cm.fontWeight('bold'))}>
            {t('tenantDetail.paymentsHeading', {}, { defaultValue: 'Payment history' })}
          </h2>
          {payments.length === 0 ? (
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.sp('py', 6),
                'text-on-surface-variant text-center',
              )}
              data-testid="tenant-payments-empty"
            >
              {t('tenantDetail.paymentsEmpty', {}, { defaultValue: 'No payments yet.' })}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className={cm.cn(cm.w('full'), 'text-sm')}>
                <thead>
                  <tr className={'border-b border-outline-variant text-left'}>
                    {['period', 'amount', 'paidAt', 'status'].map((h) => (
                      <th
                        key={h}
                        className={cm.cn(
                          cm.sp('px', 4),
                          cm.sp('py', 2),
                          'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                        )}
                      >
                        {t(`tenantDetail.payCol.${h}`, {}, { defaultValue: h })}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/60">
                  {payments.map((p) => {
                    const occurred = p.paid_at ?? p.occurred_at ?? p.due_date ?? null
                    const period = occurred
                      ? new Date(occurred).toLocaleDateString('en-US', {
                          month: 'long',
                          year: 'numeric',
                        })
                      : '—'
                    return (
                      <tr key={p.id} className={'hover:bg-surface-container-low transition-colors'}>
                        <td
                          className={cm.cn(
                            cm.sp('px', 4),
                            cm.sp('py', 3),
                            cm.fontWeight('semibold'),
                          )}
                        >
                          {period}
                        </td>
                        <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'tabular-nums')}>
                          {fmtCurrency(p.amount_cents)}
                        </td>
                        <td
                          className={cm.cn(
                            cm.sp('px', 4),
                            cm.sp('py', 3),
                            'text-on-surface-variant',
                          )}
                        >
                          {fmtDate(occurred)}
                        </td>
                        <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                          <span
                            className={cm.cn(
                              cm.sp('px', 3),
                              cm.sp('py', 1),
                              cm.roundedFull,
                              'text-[10px] font-black uppercase tracking-widest bg-success-light text-success',
                            )}
                          >
                            {t(
                              `tenantDetail.paymentStatus.${p.status}`,
                              {},
                              { defaultValue: p.status },
                            )}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl')}>
          <h2 className={cm.cn(cm.textSize('lg'), cm.sp('mb', 4), cm.fontWeight('bold'))}>
            {t('tenantDetail.contactHeading', {}, { defaultValue: 'Contact' })}
          </h2>
          <ul className={cm.stack(3)}>
            <li className={cm.flex({ align: 'center', gap: 'sm' })}>
              <span
                className="material-symbols-outlined text-on-surface-variant"
                aria-hidden="true"
              >
                mail
              </span>
              <span className={cm.cn(cm.textSize('sm'), 'text-on-surface')}>
                {tenant.email ?? '—'}
              </span>
            </li>
            {tenant.phone && (
              <li className={cm.flex({ align: 'center', gap: 'sm' })}>
                <span
                  className="material-symbols-outlined text-on-surface-variant"
                  aria-hidden="true"
                >
                  call
                </span>
                <span className={cm.cn(cm.textSize('sm'), 'text-on-surface')}>{tenant.phone}</span>
              </li>
            )}
          </ul>
        </section>
      </div>
    </div>
  )
}
