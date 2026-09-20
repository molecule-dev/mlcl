import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface Technician {
  id: string
  name: string
  trade: string
  phone: string | null
  email: string | null
  skills: string[]
  active: boolean
  active_jobs: number
}

const TRADES = ['hvac', 'plumbing', 'electrical', 'general'] as const

export function Technicians() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [list, setList] = useState<Technician[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', trade: 'general', phone: '', skills: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  function load() {
    setLoading(true)
    return http
      .get('/technicians')
      .then((res) => {
        setList(unwrapList<Technician>(res))
        setError(null)
      })
      .catch(() =>
        setError(t('technicians.loadError', {}, { defaultValue: 'Failed to load technicians.' })),
      )
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http, t])

  // Escape closes the add modal (keyboard equivalent of the backdrop click).
  useEffect(() => {
    if (!showAdd) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowAdd(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showAdd])

  const visible = useMemo(() => list.filter((x) => x.active || list.every((y) => y.active)), [list])
  const inactive = useMemo(() => list.filter((x) => !x.active), [list])

  async function submitNewTechnician(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      setSubmitError(t('technicians.add.nameRequired', {}, { defaultValue: 'Name is required.' }))
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      await http.post('/technicians', {
        name: form.name.trim(),
        trade: form.trade,
        phone: form.phone.trim() || null,
        skills: form.skills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      })
      setShowAdd(false)
      setForm({ name: '', trade: 'general', phone: '', skills: '' })
      await load()
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : t('technicians.add.error', {}, { defaultValue: 'Failed to add technician.' }),
      )
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls = cm.cn(
    cm.sp('px', 3),
    cm.sp('py', 2),
    cm.textSize('sm'),
    'border border-outline-variant rounded-md w-full',
  )

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, 'space-y-6')}>
      <header className={cm.flex({ align: 'center', justify: 'between' })}>
        <div>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
            {t('technicians.heading', {}, { defaultValue: 'Technicians' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'technicians.subheading',
              { count: visible.length },
              { defaultValue: '{{count}} on the crew' },
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
          + {t('technicians.addLabel', {}, { defaultValue: 'Add technician' })}
        </button>
      </header>

      {showAdd ? (
        <div
          className={cm.cn('fixed inset-0 z-50', cm.flex({ align: 'center', justify: 'center' }))}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-technician-heading"
        >
          <div
            aria-hidden="true"
            onClick={() => setShowAdd(false)}
            className={cm.cn('absolute inset-0 bg-foreground/40')}
          />
          <form
            onSubmit={submitNewTechnician}
            className={cm.cn(cm.card(), cm.sp('p', 6), 'relative max-w-md w-full', cm.stack(4))}
          >
            <h2
              id="add-technician-heading"
              className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}
            >
              {t('technicians.add.heading', {}, { defaultValue: 'Add technician' })}
            </h2>
            <label className={cm.stack(1)}>
              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                {t('technicians.add.name', {}, { defaultValue: 'Name' })}
              </span>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputCls}
              />
            </label>
            <label className={cm.stack(1)}>
              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                {t('form.trade', {}, { defaultValue: 'Trade' })}
              </span>
              <select
                value={form.trade}
                onChange={(e) => setForm({ ...form, trade: e.target.value })}
                className={inputCls}
              >
                {TRADES.map((tr) => (
                  <option key={tr} value={tr}>
                    {t(
                      `technicians.trade.${tr}`,
                      {},
                      {
                        defaultValue: tr.charAt(0).toUpperCase() + tr.slice(1),
                      },
                    )}
                  </option>
                ))}
              </select>
            </label>
            <label className={cm.stack(1)}>
              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                {t('technicians.add.phone', {}, { defaultValue: 'Phone' })}
              </span>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={inputCls}
              />
            </label>
            <label className={cm.stack(1)}>
              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                {t(
                  'technicians.add.skills',
                  {},
                  { defaultValue: 'Skills / certs (comma-separated)' },
                )}
              </span>
              <input
                type="text"
                value={form.skills}
                onChange={(e) => setForm({ ...form, skills: e.target.value })}
                placeholder={t(
                  'technicians.add.skillsPlaceholder',
                  {},
                  { defaultValue: 'EPA 608 Universal, OSHA 30' },
                )}
                className={inputCls}
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
                  : t('technicians.add.submit', {}, { defaultValue: 'Add technician' })}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('technicians.loading', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : (
        <>
          <div className={cm.grid({ cols: 3, gap: 'md' })}>
            {visible.map((tech) => (
              <section key={tech.id} className={cm.cn(cm.card(), cm.sp('p', 5), cm.stack(3))}>
                <div className={cm.flex({ align: 'center', justify: 'between' })}>
                  <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                    {tech.name}
                  </h2>
                  <span
                    className={cm.cn(
                      cm.sp('px', 2),
                      cm.sp('py', 1),
                      cm.textSize('xs'),
                      'rounded-full uppercase tracking-wider',
                      tech.active_jobs > 0
                        ? 'bg-primary-container text-on-primary-container'
                        : 'bg-surface-container text-on-surface-variant',
                    )}
                  >
                    {tech.active_jobs > 0
                      ? t(
                          'technicians.openJobs',
                          { count: tech.active_jobs },
                          { defaultValue: '{{count}} open' },
                        )
                      : t('technicians.noOpenJobs', {}, { defaultValue: 'No open jobs' })}
                  </span>
                </div>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    `technicians.trade.${tech.trade}`,
                    {},
                    {
                      defaultValue: tech.trade.charAt(0).toUpperCase() + tech.trade.slice(1),
                    },
                  )}
                  {tech.phone ? ` · ${tech.phone}` : ''}
                </p>
                {tech.skills.length > 0 ? (
                  <ul className={cm.flex({ gap: 'xs', wrap: 'wrap' })}>
                    {tech.skills.map((skill) => (
                      <li
                        key={skill}
                        className={cm.cn(
                          cm.sp('px', 2),
                          cm.sp('py', 1),
                          cm.textSize('xs'),
                          'rounded bg-secondary-container text-on-secondary-container',
                        )}
                      >
                        {skill}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>
          {inactive.length > 0 ? (
            <section className={cm.stack(2)}>
              <h2
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'text-on-surface-variant',
                )}
              >
                {t('technicians.inactive', {}, { defaultValue: 'Inactive' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {inactive.map((x) => x.name).join(', ')}
              </p>
            </section>
          ) : null}
        </>
      )}
    </div>
  )
}
