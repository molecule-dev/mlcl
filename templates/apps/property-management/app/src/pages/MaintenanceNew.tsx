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
interface CreatedTicket {
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

export function MaintenanceNew() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
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
    if (!title.trim()) {
      setError(t('maintenance.new.error.title', {}, { defaultValue: 'Title is required' }))
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || null,
        priority,
        status: 'open',
      }
      if (unitId) payload.unit_id = unitId
      if (propertyId) payload.property_id = propertyId
      const res = (await http.post('/api/maintenance', payload)) as
        CreatedTicket | { data?: CreatedTicket }
      const created = (res as { data?: CreatedTicket })?.data ?? (res as CreatedTicket)
      if (created?.id) {
        navigate(`/maintenance/${created.id}`)
      } else {
        navigate('/maintenance')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create work order')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('3xl'), cm.mxAuto, cm.stack(6))}>
      <header>
        <Link
          to="/maintenance"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('sm'),
            'text-on-surface-variant hover:text-on-surface',
          )}
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">
            arrow_back
          </span>
          {t('maintenance.new.back', {}, { defaultValue: 'Back to maintenance' })}
        </Link>
        <h1 className={cm.cn(cm.textSize('4xl'), cm.sp('mt', 2), 'font-extrabold tracking-tight')}>
          {t('maintenance.new.heading', {}, { defaultValue: 'New work order' })}
        </h1>
      </header>

      <form
        onSubmit={handleSubmit}
        data-testid="maintenance-form"
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
            htmlFor="m-title"
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'text-on-surface-variant uppercase tracking-widest block mb-1',
            )}
          >
            {t('maintenance.new.title', {}, { defaultValue: 'What needs to be fixed?' })}
          </label>
          <input
            id="m-title"
            data-testid="m-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder={t(
              'maintenance.new.titlePlaceholder',
              {},
              { defaultValue: 'Leaking kitchen faucet' },
            )}
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
            htmlFor="m-desc"
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'text-on-surface-variant uppercase tracking-widest block mb-1',
            )}
          >
            {t('nav.details', {}, { defaultValue: 'Details' })}
          </label>
          <textarea
            id="m-desc"
            data-testid="m-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className={cm.cn(
              cm.w('full'),
              cm.sp('px', 4),
              cm.sp('py', 3),
              'rounded-xl bg-surface border border-outline-variant focus:outline-none focus:ring-2 ring-primary/30',
            )}
          />
        </div>

        <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-3')}>
          <div>
            <label
              htmlFor="m-priority"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'text-on-surface-variant uppercase tracking-widest block mb-1',
              )}
            >
              {t('form.priority', {}, { defaultValue: 'Priority' })}
            </label>
            <select
              id="m-priority"
              data-testid="m-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 4),
                cm.sp('py', 3),
                'rounded-xl bg-surface border border-outline-variant focus:outline-none focus:ring-2 ring-primary/30',
              )}
            >
              <option value="low">
                {t('maintenance.priority.low', {}, { defaultValue: 'Low' })}
              </option>
              <option value="medium">
                {t('maintenance.priority.medium', {}, { defaultValue: 'Medium' })}
              </option>
              <option value="high">
                {t('maintenance.priority.high', {}, { defaultValue: 'High' })}
              </option>
            </select>
          </div>
          <div>
            <label
              htmlFor="m-property"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'text-on-surface-variant uppercase tracking-widest block mb-1',
              )}
            >
              {t('maintenance.new.property', {}, { defaultValue: 'Property' })}
            </label>
            <select
              id="m-property"
              data-testid="m-property"
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
                {t('maintenance.new.noProperty', {}, { defaultValue: 'Unspecified' })}
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
              htmlFor="m-unit"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'text-on-surface-variant uppercase tracking-widest block mb-1',
              )}
            >
              {t('maintenance.new.unit', {}, { defaultValue: 'Unit' })}
            </label>
            <select
              id="m-unit"
              data-testid="m-unit"
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
                {t('maintenance.new.noUnit', {}, { defaultValue: 'Common area' })}
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
            data-testid="m-submit"
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
              : t('maintenance.new.submit', {}, { defaultValue: 'Create work order' })}
          </button>
          <Link
            to="/maintenance"
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
