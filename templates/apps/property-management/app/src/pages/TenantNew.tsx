import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface PropertyApi {
  id: string
  name: string
}
interface UnitApi {
  id: string
  unit_number: string
  property_id: string
}
interface CreatedTenant {
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

export function TenantNew() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [propertyId, setPropertyId] = useState('')
  const [unitId, setUnitId] = useState('')
  const [properties, setProperties] = useState<PropertyApi[]>([])
  const [units, setUnits] = useState<UnitApi[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      http.get('/api/properties?limit=100').catch(() => null),
      http.get('/api/units?limit=200').catch(() => null),
    ]).then(([pRes, uRes]) => {
      if (cancelled) return
      setProperties(unwrap<PropertyApi>(pRes))
      setUnits(unwrap<UnitApi>(uRes))
    })
    return () => {
      cancelled = true
    }
  }, [http])

  const filteredUnits = propertyId ? units.filter((u) => u.property_id === propertyId) : units

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim()) {
      setError(t('tenants.new.error.required', {}, { defaultValue: 'Name and email are required' }))
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        status: 'active',
      }
      if (unitId) payload.unit_id = unitId
      if (propertyId) payload.property_id = propertyId
      const res = (await http.post('/api/tenants', payload)) as
        CreatedTenant | { data?: CreatedTenant }
      const created = (res as { data?: CreatedTenant })?.data ?? (res as CreatedTenant)
      if (created?.id) {
        navigate(`/tenants/${created.id}`)
      } else {
        navigate('/tenants')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tenant')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('3xl'), cm.mxAuto, cm.stack(6))}>
      <header>
        <Link
          to="/tenants"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('sm'),
            'text-on-surface-variant hover:text-on-surface',
          )}
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">
            arrow_back
          </span>
          {t('tenants.new.back', {}, { defaultValue: 'Back to tenants' })}
        </Link>
        <h1 className={cm.cn(cm.textSize('4xl'), cm.sp('mt', 2), 'font-extrabold tracking-tight')}>
          {t('tenants.new.heading', {}, { defaultValue: 'Add a tenant' })}
        </h1>
      </header>

      <form
        onSubmit={handleSubmit}
        data-testid="tenant-form"
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

        <div>
          <label
            htmlFor="t-name"
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'text-on-surface-variant uppercase tracking-widest block mb-1',
            )}
          >
            {t('tenants.new.name', {}, { defaultValue: 'Tenant name' })}
          </label>
          <input
            id="t-name"
            data-testid="tenant-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className={cm.cn(
              cm.w('full'),
              cm.sp('px', 4),
              cm.sp('py', 3),
              'rounded-xl bg-surface border border-outline-variant focus:outline-none focus:ring-2 ring-primary/30',
            )}
          />
        </div>

        <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-2')}>
          <div>
            <label
              htmlFor="t-email"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'text-on-surface-variant uppercase tracking-widest block mb-1',
              )}
            >
              {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
            </label>
            <input
              id="t-email"
              data-testid="tenant-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
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
              htmlFor="t-phone"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'text-on-surface-variant uppercase tracking-widest block mb-1',
              )}
            >
              {t('form.phone', {}, { defaultValue: 'Phone' })}
            </label>
            <input
              id="t-phone"
              data-testid="tenant-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 4),
                cm.sp('py', 3),
                'rounded-xl bg-surface border border-outline-variant focus:outline-none focus:ring-2 ring-primary/30',
              )}
            />
          </div>
        </div>

        <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-2')}>
          <div>
            <label
              htmlFor="t-property"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'text-on-surface-variant uppercase tracking-widest block mb-1',
              )}
            >
              {t('tenants.new.property', {}, { defaultValue: 'Property (optional)' })}
            </label>
            <select
              id="t-property"
              data-testid="tenant-property"
              value={propertyId}
              onChange={(e) => {
                setPropertyId(e.target.value)
                setUnitId('')
              }}
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 4),
                cm.sp('py', 3),
                'rounded-xl bg-surface border border-outline-variant focus:outline-none focus:ring-2 ring-primary/30',
              )}
            >
              <option value="">
                {t('tenants.new.noProperty', {}, { defaultValue: 'No property assigned' })}
              </option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="t-unit"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'text-on-surface-variant uppercase tracking-widest block mb-1',
              )}
            >
              {t('tenants.new.unit', {}, { defaultValue: 'Unit (optional)' })}
            </label>
            <select
              id="t-unit"
              data-testid="tenant-unit"
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 4),
                cm.sp('py', 3),
                'rounded-xl bg-surface border border-outline-variant focus:outline-none focus:ring-2 ring-primary/30',
              )}
            >
              <option value="">
                {t('tenants.new.noUnit', {}, { defaultValue: 'No unit assigned' })}
              </option>
              {filteredUnits.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.unit_number}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <button
            type="submit"
            data-testid="tenant-submit"
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
              : t('tenants.new.submit', {}, { defaultValue: 'Create tenant' })}
          </button>
          <Link
            to="/tenants"
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
