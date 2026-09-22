import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Driver {
  id: string
  name: string
  email: string
  license_number: string
  license_class: string
  vehicle_id: string | null
  vehicle_plate: string | null
  status: 'on_duty' | 'off_duty' | 'on_break'
  safety_score: number
  hours_today: number
  hours_week: number
  total_miles: number
}

const STATUS_COLOR: Record<Driver['status'], string> = {
  on_duty: 'bg-success-container text-on-success-container',
  on_break: 'bg-warning-container text-on-warning-container',
  off_duty: 'bg-surface-container text-on-surface',
}

export function Drivers() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [list, setList] = useState<Driver[]>([])
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
  const [form, setForm] = useState({ name: '', email: '', phone: '', license_number: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  function load() {
    setLoading(true)
    return http
      .get('/drivers')
      .then((res) => {
        setList(unwrapList<Driver>(res))
        setError(null)
      })
      .catch(() =>
        setError(t('drivers.loadError', {}, { defaultValue: 'Failed to load drivers.' })),
      )
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/drivers')
      .then((res) => {
        if (!cancelled) setList(unwrapList<Driver>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('drivers.loadError', {}, { defaultValue: 'Failed to load drivers.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  async function submitNewDriver(event: React.FormEvent) {
    event.preventDefault()
    if (!form.name.trim()) {
      setSubmitError(t('auth.signup.nameRequired', {}, { defaultValue: 'Name is required.' }))
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await http.post('/drivers', {
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        license_number: form.license_number.trim() || undefined,
      })
      const created = unwrapSingle<{ id?: string }>(res)
      void track({ name: 'driver.added', properties: { driver_id: created?.id } })
      setShowAdd(false)
      setForm({ name: '', email: '', phone: '', license_number: '' })
      await load()
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : t('drivers.add.error.generic', {}, { defaultValue: 'Failed to add driver.' }),
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
            {t('drivers.heading', {}, { defaultValue: 'Drivers' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'drivers.subheading',
              { count: list.length },
              { defaultValue: '{{count}} drivers in fleet' },
            )}
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
          + {t('drivers.addLabel', {}, { defaultValue: 'Add driver' })}
        </button>
      </header>

      {showAdd ? (
        <div
          className={cm.cn('fixed inset-0 z-50', cm.flex({ align: 'center', justify: 'center' }))}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-driver-heading"
        >
          <div
            aria-hidden="true"
            onClick={() => setShowAdd(false)}
            className={cm.cn('absolute inset-0 bg-foreground/40')}
          />
          <form
            onSubmit={submitNewDriver}
            className={cm.cn(cm.card(), cm.sp('p', 6), 'relative max-w-md w-full', cm.stack(4))}
          >
            <h2 id="add-driver-heading" className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
              {t('drivers.add.heading', {}, { defaultValue: 'Add driver' })}
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
                {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
              </span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
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
                {t('form.phone', {}, { defaultValue: 'Phone' })}
              </span>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
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
                {t('drivers.add.license', {}, { defaultValue: 'License number' })}
              </span>
              <input
                type="text"
                value={form.license_number}
                onChange={(e) => setForm({ ...form, license_number: e.target.value })}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'border border-outline-variant rounded-md font-mono',
                  cm.textSize('sm'),
                )}
              />
            </label>

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
                  ? t('common.addingEllipsis', {}, { defaultValue: 'Adding…' })
                  : t('drivers.add.submit', {}, { defaultValue: 'Add driver' })}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : list.length === 0 ? (
        <p className={cm.cn(cm.card(), cm.sp('p', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t('drivers.empty', {}, { defaultValue: 'No drivers yet.' })}
        </p>
      ) : (
        <ul className={'space-y-2'}>
          {list.map((d) => (
            <li key={d.id}>
              <Link
                to={`/drivers/${d.id}`}
                className={cm.cn(
                  cm.card(),
                  cm.sp('p', 4),
                  cm.flex({ align: 'center', gap: 'md' }),
                  'hover:bg-surface-container',
                )}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.h(11),
                    cm.w(11),
                    'rounded-full bg-primary-container text-on-primary-container shrink-0',
                    cm.fontWeight('semibold'),
                  )}
                >
                  {d.name
                    .split(' ')
                    .map((s) => s[0])
                    .slice(0, 2)
                    .join('')}
                </div>
                <div className={cm.cn(cm.flex1, 'min-w-0')}>
                  <p className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'), 'truncate')}>
                    {d.name}
                  </p>
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      'text-on-surface-variant',
                      'truncate font-mono',
                    )}
                  >
                    {d.license_class} · {d.license_number}
                  </p>
                </div>
                <div className={cm.cn(cm.shrink0, cm.textCenter)}>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {t('drivers.col.score', {}, { defaultValue: 'Safety' })}
                  </p>
                  <p
                    className={cm.cn(
                      cm.textSize('lg'),
                      cm.fontWeight('bold'),
                      d.safety_score >= 90
                        ? 'text-success'
                        : d.safety_score >= 80
                          ? 'text-warning'
                          : 'text-error',
                    )}
                  >
                    {d.safety_score}
                  </p>
                </div>
                <div className={cm.cn(cm.shrink0, cm.textCenter)}>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {t('drivers.col.hoursToday', {}, { defaultValue: 'Hours today' })}
                  </p>
                  <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'font-mono')}>
                    {d.hours_today.toFixed(1)}
                  </p>
                </div>
                <span
                  className={cm.cn(
                    cm.sp('px', 2),
                    cm.sp('py', 1),
                    cm.textSize('xs'),
                    'rounded shrink-0',
                    STATUS_COLOR[d.status],
                  )}
                >
                  {t(
                    `drivers.status.${d.status}`,
                    {},
                    { defaultValue: d.status.replace('_', ' ') },
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
