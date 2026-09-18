import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface Geofence {
  id: string
  name: string
  // Seeded zones use the descriptive types; user-created zones come back
  // from the API with their raw `kind` ('allowed' | 'restricted').
  type: 'depot' | 'customer' | 'restricted' | 'service_area' | 'allowed'
  rule: 'entry_alert' | 'exit_alert' | 'both' | 'restricted'
  radius_miles: number
  center: string
  active: boolean
  vehicles_assigned: number
}

const TYPE_COLOR: Record<Geofence['type'], string> = {
  depot: 'bg-primary-container text-on-primary-container',
  customer: 'bg-info-container text-on-info-container',
  restricted: 'bg-error-container text-on-error-container',
  service_area: 'bg-warning-container text-on-warning-container',
  allowed: 'bg-success-container text-on-success-container',
}

export function Geofences() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [list, setList] = useState<Geofence[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  // Escape closes the add modal (keyboard equivalent of the pointer-only
  // backdrop click).
  useEffect(() => {
    if (!showAdd) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowAdd(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showAdd])
  const [form, setForm] = useState({
    name: '',
    kind: 'allowed',
    alert_on_enter: false,
    alert_on_exit: true,
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  function load() {
    setLoading(true)
    return http
      .get('/geofences')
      .then((res) => {
        setList(unwrapList<Geofence>(res))
        setError(null)
      })
      .catch(() =>
        setError(t('geofences.loadError', {}, { defaultValue: 'Failed to load geofences.' })),
      )
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/geofences')
      .then((res) => {
        if (!cancelled) setList(unwrapList<Geofence>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('geofences.loadError', {}, { defaultValue: 'Failed to load geofences.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  async function submitNew(event: React.FormEvent) {
    event.preventDefault()
    if (!form.name.trim()) {
      setSubmitError(t('auth.signup.nameRequired', {}, { defaultValue: 'Name is required.' }))
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      // Default to a small square polygon around (40.7, -74.0)
      const polygon = [
        { lat: 40.7, lng: -74.0 },
        { lat: 40.705, lng: -74.0 },
        { lat: 40.705, lng: -73.995 },
        { lat: 40.7, lng: -73.995 },
      ]
      await http.post('/geofences', {
        name: form.name.trim(),
        kind: form.kind,
        polygon,
        alert_on_enter: form.alert_on_enter,
        alert_on_exit: form.alert_on_exit,
      })
      setShowAdd(false)
      setForm({ name: '', kind: 'allowed', alert_on_enter: false, alert_on_exit: true })
      await load()
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : t('geofences.add.error.generic', {}, { defaultValue: 'Failed to create geofence.' }),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, 'space-y-6')}>
      <header className={cm.flex({ align: 'center', justify: 'between' })}>
        <div>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
            {t('geofences.heading', {}, { defaultValue: 'Geofences' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t('geofences.subheading', { count: list.length }, { defaultValue: '{{count}} zones' })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-md',
          )}
        >
          + {t('geofences.createLabel', {}, { defaultValue: 'New geofence' })}
        </button>
      </header>

      {showAdd ? (
        <div
          className={cm.cn('fixed inset-0 z-50', cm.flex({ align: 'center', justify: 'center' }))}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-geofence-heading"
        >
          <div
            aria-hidden="true"
            onClick={() => setShowAdd(false)}
            className={cm.cn('absolute inset-0 bg-foreground/40')}
          />
          <form
            onSubmit={submitNew}
            className={cm.cn(cm.card(), cm.sp('p', 6), 'relative max-w-md w-full', cm.stack(4))}
          >
            <h2
              id="add-geofence-heading"
              className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}
            >
              {t('geofences.add.heading', {}, { defaultValue: 'New geofence' })}
            </h2>
            <label className={cm.stack(1)}>
              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                {t('form.name', {}, { defaultValue: 'Name' })}
              </span>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'border border-outline-variant rounded-md',
                  cm.textSize('sm'),
                )}
              />
            </label>
            <label className={cm.stack(1)}>
              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                {t('form.type', {}, { defaultValue: 'Type' })}
              </span>
              <select
                value={form.kind}
                onChange={(e) => setForm({ ...form, kind: e.target.value })}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'border border-outline-variant rounded-md',
                  cm.textSize('sm'),
                )}
              >
                <option value="allowed">
                  {t('geofences.type.allowed', {}, { defaultValue: 'Allowed' })}
                </option>
                <option value="restricted">
                  {t('geofences.type.restricted', {}, { defaultValue: 'Restricted' })}
                </option>
              </select>
            </label>
            <div className={cm.flex({ gap: 'md' })}>
              <label className={cm.flex({ align: 'center', gap: 'sm' })}>
                <input
                  type="checkbox"
                  checked={form.alert_on_enter}
                  onChange={(e) => setForm({ ...form, alert_on_enter: e.target.checked })}
                />
                <span className={cm.textSize('sm')}>
                  {t('geofences.add.onEnter', {}, { defaultValue: 'Alert on enter' })}
                </span>
              </label>
              <label className={cm.flex({ align: 'center', gap: 'sm' })}>
                <input
                  type="checkbox"
                  checked={form.alert_on_exit}
                  onChange={(e) => setForm({ ...form, alert_on_exit: e.target.checked })}
                />
                <span className={cm.textSize('sm')}>
                  {t('geofences.add.onExit', {}, { defaultValue: 'Alert on exit' })}
                </span>
              </label>
            </div>

            {submitError ? <p className={'text-error text-sm'}>{submitError}</p> : null}

            <div className={cm.flex({ gap: 'sm', justify: 'end' })}>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'border border-outline-variant rounded-md',
                )}
              >
                {t('common.cancel', {}, { defaultValue: 'Cancel' })}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'bg-primary text-on-primary rounded-md disabled:opacity-50',
                )}
              >
                {submitting
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                  : t('common.create', {}, { defaultValue: 'Create' })}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* Map placeholder */}
      <div
        className={'rounded relative overflow-hidden'}
        style={{
          aspectRatio: '21/8',
          backgroundColor: 'var(--color-map-bg)',
          backgroundImage:
            'radial-gradient(circle at 30% 50%, rgba(21, 128, 61, 0.4) 0%, transparent 30%), radial-gradient(circle at 60% 60%, rgba(245, 158, 11, 0.3) 0%, transparent 30%), radial-gradient(circle at 80% 35%, rgba(220, 38, 38, 0.3) 0%, transparent 30%)',
        }}
      >
        <p
          className={cm.cn(cm.textSize('xs'), 'absolute top-3 left-3 font-mono')}
          style={{ color: '#cbd5e1' }}
        >
          {t(
            'geofences.mapLabel',
            { count: list.filter((g) => g.active).length },
            { defaultValue: '{{count}} active zones' },
          )}
        </p>
      </div>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : list.length === 0 ? (
        <p className={cm.cn(cm.card(), cm.sp('p', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t('geofences.empty', {}, { defaultValue: 'No geofences yet.' })}
        </p>
      ) : (
        <ul className={'space-y-2'}>
          {list.map((g) => (
            <li key={g.id}>
              <article
                className={cm.cn(cm.card(), cm.sp('p', 4), cm.flex({ align: 'center', gap: 'md' }))}
              >
                <span
                  className="material-symbols-outlined text-primary shrink-0"
                  aria-hidden="true"
                >
                  fence
                </span>
                <div className={cm.cn(cm.flex1, 'min-w-0')}>
                  <p className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'), 'truncate')}>
                    {g.name}
                  </p>
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      'text-on-surface-variant',
                      'truncate',
                      cm.sp('mt', 1),
                    )}
                  >
                    {g.center} ·{' '}
                    {t(
                      'geofences.radiusLabel',
                      { miles: g.radius_miles },
                      { defaultValue: '{{miles}} mi radius' },
                    )}{' '}
                    ·{' '}
                    {t(`geofences.rule.${g.rule}`, {}, { defaultValue: g.rule.replace('_', ' ') })}
                  </p>
                </div>
                <div className={cm.cn(cm.shrink0, cm.textCenter)}>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {t('geofences.vehiclesLabel', {}, { defaultValue: 'Vehicles' })}
                  </p>
                  <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                    {g.vehicles_assigned}
                  </p>
                </div>
                <span
                  className={cm.cn(
                    cm.sp('px', 2),
                    cm.sp('py', 1),
                    cm.textSize('xs'),
                    'rounded shrink-0',
                    TYPE_COLOR[g.type],
                  )}
                >
                  {t(`geofences.type.${g.type}`, {}, { defaultValue: g.type.replace('_', ' ') })}
                </span>
                <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', 'shrink-0')}>
                  {g.active
                    ? t('geofences.activeLabel', {}, { defaultValue: 'Active' })
                    : t('status.off', {}, { defaultValue: 'Off' })}
                </span>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
