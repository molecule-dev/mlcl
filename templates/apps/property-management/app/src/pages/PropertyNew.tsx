import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface CreatedProperty {
  id: string
}

export function PropertyNew() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [unitCount, setUnitCount] = useState('1')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError(t('properties.new.error.name', {}, { defaultValue: 'Property name is required' }))
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const res = (await http.post('/api/properties', {
        name: name.trim(),
        address: address.trim() || null,
        unit_count: Math.max(1, parseInt(unitCount, 10) || 1),
        status: 'active',
      })) as CreatedProperty | { data?: CreatedProperty }
      const created = (res as { data?: CreatedProperty })?.data ?? (res as CreatedProperty)
      track({ name: 'property.added', properties: { property_id: created?.id } })
      if (created?.id) {
        navigate(`/properties/${created.id}`)
      } else {
        navigate('/properties')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create property')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('3xl'), cm.mxAuto, cm.stack(6))}>
      <header>
        <Link
          to="/properties"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('sm'),
            'text-on-surface-variant hover:text-on-surface',
          )}
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">
            arrow_back
          </span>
          {t('properties.new.back', {}, { defaultValue: 'Back to properties' })}
        </Link>
        <h1 className={cm.cn(cm.textSize('4xl'), cm.sp('mt', 2), 'font-extrabold tracking-tight')}>
          {t('properties.new.heading', {}, { defaultValue: 'Add a property' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'properties.new.subheading',
            {},
            {
              defaultValue:
                'Add the basics now — you can add units, leases, and tenants from the property page.',
            },
          )}
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        data-testid="property-form"
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
            htmlFor="prop-name"
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'text-on-surface-variant uppercase tracking-widest block mb-1',
            )}
          >
            {t('properties.new.name', {}, { defaultValue: 'Property name' })}
          </label>
          <input
            id="prop-name"
            data-testid="prop-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder={t(
              'properties.new.namePlaceholder',
              {},
              { defaultValue: 'e.g. Hearthstone Court' },
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
            htmlFor="prop-address"
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'text-on-surface-variant uppercase tracking-widest block mb-1',
            )}
          >
            {t('properties.new.address', {}, { defaultValue: 'Street address' })}
          </label>
          <input
            id="prop-address"
            data-testid="prop-address"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={t(
              'properties.new.addressPlaceholder',
              {},
              { defaultValue: '142 Linden Ave, Brooklyn NY' },
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
            htmlFor="prop-units"
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'text-on-surface-variant uppercase tracking-widest block mb-1',
            )}
          >
            {t('properties.new.unitCount', {}, { defaultValue: 'Total units' })}
          </label>
          <input
            id="prop-units"
            data-testid="prop-unit-count"
            type="number"
            min={1}
            value={unitCount}
            onChange={(e) => setUnitCount(e.target.value)}
            className={cm.cn(
              cm.w(32),
              cm.sp('px', 4),
              cm.sp('py', 3),
              'rounded-xl bg-surface border border-outline-variant focus:outline-none focus:ring-2 ring-primary/30 tabular-nums',
            )}
          />
        </div>

        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <button
            type="submit"
            data-testid="prop-submit"
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
              : t('properties.new.submit', {}, { defaultValue: 'Create property' })}
          </button>
          <Link
            to="/properties"
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
