import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface TenantApi {
  id: string
  name: string
}
interface UnitApi {
  id: string
  unit_number: string
  property_id: string
}
interface CreatedLease {
  id: string
}

function unwrap<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[]
  const r = res as { data?: T[]; items?: T[] } | null | undefined
  if (!r) return []
  if (Array.isArray(r.data)) return r.data
  if (Array.isArray(r.items)) return r.items
  return []
}

function isoToday() {
  return new Date().toISOString().slice(0, 10)
}
function isoOneYear() {
  const d = new Date()
  d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().slice(0, 10)
}

export function LeaseNew() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()

  const [tenantId, setTenantId] = useState('')
  const [unitId, setUnitId] = useState('')
  const [startDate, setStartDate] = useState(isoToday())
  const [endDate, setEndDate] = useState(isoOneYear())
  const [rent, setRent] = useState('')
  const [tenants, setTenants] = useState<TenantApi[]>([])
  const [units, setUnits] = useState<UnitApi[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      http.get('/api/tenants?limit=200').catch(() => null),
      http.get('/api/units?limit=200').catch(() => null),
    ]).then(([tRes, uRes]) => {
      if (cancelled) return
      setTenants(unwrap<TenantApi>(tRes))
      setUnits(unwrap<UnitApi>(uRes))
    })
    return () => {
      cancelled = true
    }
  }, [http])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenantId || !unitId) {
      setError(t('leases.new.error.select', {}, { defaultValue: 'Choose a tenant and a unit' }))
      return
    }
    const rentNum = Math.round(parseFloat(rent) * 100)
    if (!Number.isFinite(rentNum) || rentNum <= 0) {
      setError(t('leases.new.error.rent', {}, { defaultValue: 'Enter a monthly rent' }))
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const res = (await http.post('/api/leases', {
        tenant_id: tenantId,
        unit_id: unitId,
        start_date: startDate,
        end_date: endDate,
        monthly_rent_cents: rentNum,
        status: 'active',
      })) as CreatedLease | { data?: CreatedLease }
      const created = (res as { data?: CreatedLease })?.data ?? (res as CreatedLease)
      track({
        name: 'lease.created',
        properties: { lease_id: created?.id, tenant_id: tenantId, unit_id: unitId },
      })
      if (created?.id) {
        navigate('/leases')
      } else {
        navigate('/leases')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create lease')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('3xl'), cm.mxAuto, cm.stack(6))}>
      <header>
        <Link
          to="/leases"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('sm'),
            'text-on-surface-variant hover:text-on-surface',
          )}
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">
            arrow_back
          </span>
          {t('leases.new.back', {}, { defaultValue: 'Back to leases' })}
        </Link>
        <h1 className={cm.cn(cm.textSize('4xl'), cm.sp('mt', 2), 'font-extrabold tracking-tight')}>
          {t('leases.new.heading', {}, { defaultValue: 'New lease' })}
        </h1>
      </header>

      <form
        onSubmit={handleSubmit}
        data-testid="lease-form"
        className={cm.cn(
          cm.sp('p', 6),
          cm.stack(5),
          'bg-surface-container-lowest rounded-2xl border border-outline-variant/40',
        )}
      >
        {error && (
          <div
            className={cm.cn(
              cm.sp('p', 4),
              'rounded-xl bg-error-light text-error border border-red-200 text-sm',
            )}
          >
            {error}
          </div>
        )}

        <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-2')}>
          <div>
            <label
              htmlFor="l-tenant"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'text-on-surface-variant uppercase tracking-widest block mb-1',
              )}
            >
              {t('leases.new.tenant', {}, { defaultValue: 'Tenant' })}
            </label>
            <select
              id="l-tenant"
              data-testid="l-tenant"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              required
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 4),
                cm.sp('py', 3),
                'rounded-xl bg-surface border border-outline-variant focus:outline-none focus:ring-2 ring-primary/30',
              )}
            >
              <option value="">
                {t('leases.new.tenantPlaceholder', {}, { defaultValue: 'Select tenant…' })}
              </option>
              {tenants.map((tn) => (
                <option key={tn.id} value={tn.id}>
                  {tn.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="l-unit"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'text-on-surface-variant uppercase tracking-widest block mb-1',
              )}
            >
              {t('leases.new.unit', {}, { defaultValue: 'Unit' })}
            </label>
            <select
              id="l-unit"
              data-testid="l-unit"
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              required
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 4),
                cm.sp('py', 3),
                'rounded-xl bg-surface border border-outline-variant focus:outline-none focus:ring-2 ring-primary/30',
              )}
            >
              <option value="">
                {t('leases.new.unitPlaceholder', {}, { defaultValue: 'Select unit…' })}
              </option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.unit_number}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-3')}>
          <div>
            <label
              htmlFor="l-start"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'text-on-surface-variant uppercase tracking-widest block mb-1',
              )}
            >
              {t('form.startDate', {}, { defaultValue: 'Start date' })}
            </label>
            <input
              id="l-start"
              data-testid="l-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 4),
                cm.sp('py', 3),
                'rounded-xl bg-surface border border-outline-variant focus:outline-none focus:ring-2 ring-primary/30',
              )}
            />
          </div>
          <div>
            <label
              htmlFor="l-end"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'text-on-surface-variant uppercase tracking-widest block mb-1',
              )}
            >
              {t('leases.new.end', {}, { defaultValue: 'End date' })}
            </label>
            <input
              id="l-end"
              data-testid="l-end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 4),
                cm.sp('py', 3),
                'rounded-xl bg-surface border border-outline-variant focus:outline-none focus:ring-2 ring-primary/30',
              )}
            />
          </div>
          <div>
            <label
              htmlFor="l-rent"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'text-on-surface-variant uppercase tracking-widest block mb-1',
              )}
            >
              {t('leases.new.rent', {}, { defaultValue: 'Monthly rent ($)' })}
            </label>
            <input
              id="l-rent"
              data-testid="l-rent"
              type="number"
              min="0"
              step="0.01"
              value={rent}
              onChange={(e) => setRent(e.target.value)}
              required
              placeholder="2650.00"
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 4),
                cm.sp('py', 3),
                'rounded-xl bg-surface border border-outline-variant focus:outline-none focus:ring-2 ring-primary/30 tabular-nums',
              )}
            />
          </div>
        </div>

        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <button
            type="submit"
            data-testid="l-submit"
            disabled={submitting}
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              'bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50',
            )}
          >
            {submitting
              ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
              : t('leases.new.submit', {}, { defaultValue: 'Create lease' })}
          </button>
          <Link
            to="/leases"
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              'text-on-surface-variant hover:text-on-surface',
            )}
          >
            {t('common.cancel', {}, { defaultValue: 'Cancel' })}
          </Link>
        </div>
      </form>
    </div>
  )
}
