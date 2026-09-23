import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { unwrapList } from '../lib/unwrap.js'

interface RawComponent {
  id: string
  name: string
}

const IMPACTS = [
  { key: 'minor', label: 'Degraded', tint: '#f59e0b' },
  { key: 'major', label: 'Partial outage', tint: '#f97316' },
  { key: 'critical', label: 'Major outage', tint: '#ef4444' },
  { key: 'maintenance', label: 'Maintenance', tint: '#6366f1' },
] as const

const STATUSES = [
  { key: 'investigating', label: 'Investigating' },
  { key: 'identified', label: 'Identified' },
  { key: 'monitoring', label: 'Monitoring' },
  { key: 'resolved', label: 'Resolved' },
] as const

export function IncidentForm() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const [components, setComponents] = useState<RawComponent[]>([])
  const [impact, setImpact] = useState<(typeof IMPACTS)[number]['key']>('minor')
  const [status, setStatus] = useState<(typeof STATUSES)[number]['key']>('investigating')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/components')
      .then((res) => {
        if (!cancelled) setComponents(unwrapList<RawComponent>(res))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [http])

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await http.post('/api/incidents', {
        title,
        message,
        impact,
        status,
        affected_components: Array.from(selected),
      })
      const created = (res.data ?? {}) as { id?: string }
      track({
        name: 'incident.created',
        properties: { id: created.id, impact, status },
      })
      navigate('/incidents')
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : t('incidentForm.error', {}, { defaultValue: 'Could not publish incident' })
      setError(msg)
      setSubmitting(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))} data-mol-id="page-incident-form">
      <nav className={cm.cn('mb-6')}>
        <Link
          to="/incidents"
          className={cm.cn(
            'inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            arrow_back
          </span>
          {t('incidentForm.back', {}, { defaultValue: 'All incidents' })}
        </Link>
      </nav>

      <header className={cm.cn('mb-8')}>
        <p
          className={cm.cn(
            'font-mono text-xs font-bold uppercase tracking-widest text-primary mb-2',
          )}
        >
          {t(
            'incidentForm.eyebrow',
            { app: APP_NAME },
            { defaultValue: '$ {{app}} incidents create' },
          )}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('incidentForm.heading', {}, { defaultValue: 'Open new incident' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'incidentForm.subheading',
            {},
            { defaultValue: 'Subscribers will be paged the moment you publish.' },
          )}
        </p>
      </header>

      <form
        onSubmit={onSubmit}
        className={cm.cn('grid gap-6 grid-cols-1 lg:grid-cols-[1.5fr_1fr]')}
      >
        <div
          className={cm.cn('rounded-2xl p-6')}
          style={{
            backgroundColor: 'rgba(30, 41, 59, 0.65)',
            border: '1px solid var(--color-border-card)',
          }}
        >
          <div>
            <label
              htmlFor="incident-title"
              className={cm.cn(
                'block font-mono text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2',
              )}
            >
              {t('form.title', {}, { defaultValue: 'Title' })}
            </label>
            <input
              id="incident-title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t(
                'incidentForm.titlePlaceholder',
                {},
                { defaultValue: 'Elevated webhook delivery latency in EU-WEST' },
              )}
              className={cm.cn('w-full px-4 py-3 rounded-md font-mono text-sm')}
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid var(--color-border-card)',
                color: 'var(--mol-color-text)',
              }}
            />
          </div>

          <div className={cm.cn('mt-5')}>
            <label
              htmlFor="incident-message"
              className={cm.cn(
                'block font-mono text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2',
              )}
            >
              {t('incidentForm.messageLabel', {}, { defaultValue: 'Initial public update' })}
            </label>
            <textarea
              id="incident-message"
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t(
                'incidentForm.messagePlaceholder',
                {},
                {
                  defaultValue:
                    'We are observing elevated p95 latency on the eu-west fanout. Investigation in progress.',
                },
              )}
              className={cm.cn('w-full px-4 py-3 rounded-md font-mono text-sm')}
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid var(--color-border-card)',
                color: 'var(--mol-color-text)',
              }}
            />
          </div>

          <div className={cm.cn('mt-5')}>
            <p
              className={cm.cn(
                'font-mono text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2',
              )}
            >
              {t('incidentForm.impact', {}, { defaultValue: 'Impact' })}
            </p>
            <div className={cm.cn('grid gap-2 grid-cols-2 md:grid-cols-4')}>
              {IMPACTS.map((i) => {
                const active = impact === i.key
                return (
                  <button
                    key={i.key}
                    type="button"
                    onClick={() => setImpact(i.key)}
                    className={cm.cn(
                      'px-3 py-2 rounded-md font-mono text-xs font-extrabold uppercase tracking-widest transition-colors',
                    )}
                    style={{
                      backgroundColor: active ? `${i.tint}22` : 'rgba(15, 23, 42, 0.6)',
                      color: active ? i.tint : 'var(--color-chip-text)',
                      border: `1px solid ${active ? `${i.tint}66` : 'var(--color-border-card)'}`,
                    }}
                  >
                    {t(`incidentForm.impact.${i.key}`, {}, { defaultValue: i.label })}
                  </button>
                )
              })}
            </div>
          </div>

          <div className={cm.cn('mt-5')}>
            <p
              className={cm.cn(
                'font-mono text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2',
              )}
            >
              {t('incidentForm.status', {}, { defaultValue: 'Initial status' })}
            </p>
            <div className={cm.cn('grid gap-2 grid-cols-2 md:grid-cols-4')}>
              {STATUSES.map((s) => {
                const active = status === s.key
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setStatus(s.key)}
                    className={cm.cn(
                      'px-3 py-2 rounded-md font-mono text-xs font-extrabold uppercase tracking-widest transition-colors',
                    )}
                    style={{
                      backgroundColor: active
                        ? 'rgba(16, 185, 129, 0.20)'
                        : 'rgba(15, 23, 42, 0.6)',
                      color: active ? 'var(--color-link-hover)' : 'var(--color-chip-text)',
                      border: `1px solid ${active ? 'rgba(16, 185, 129, 0.40)' : 'var(--color-border-card)'}`,
                    }}
                  >
                    {t(`incidentForm.status.${s.key}`, {}, { defaultValue: s.label })}
                  </button>
                )
              })}
            </div>
          </div>

          {error ? (
            <div
              role="alert"
              data-testid="incident-form-error"
              className={cm.cn('mt-5 px-4 py-3 rounded-md font-mono text-xs')}
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: 'var(--color-error-text-vivid-on-dark)',
              }}
            >
              {error}
            </div>
          ) : null}

          <div className={cm.cn('mt-7 flex items-center justify-end gap-3')}>
            <Link
              to="/incidents"
              className={cm.cn(
                'px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest',
              )}
              style={{
                backgroundColor: 'rgba(30, 41, 59, 0.6)',
                color: 'var(--color-chip-text)',
                border: '1px solid var(--color-border-card)',
              }}
            >
              {t('incidentForm.cancel', {}, { defaultValue: 'Cancel' })}
            </Link>
            <button
              type="submit"
              disabled={submitting || !title.trim() || !message.trim()}
              className={cm.cn(
                'px-5 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest hover:opacity-90 disabled:opacity-60',
              )}
              style={{
                backgroundColor: 'var(--color-status-operational)',
                color: 'var(--color-on-status-operational)',
              }}
            >
              {submitting
                ? t('common.publishingEllipsis', {}, { defaultValue: 'Publishing…' })
                : t('incidentForm.publish', {}, { defaultValue: 'Publish & page' })}
            </button>
          </div>
        </div>

        <aside
          className={cm.cn('rounded-2xl p-6')}
          style={{
            backgroundColor: 'rgba(30, 41, 59, 0.55)',
            border: '1px solid var(--color-border-card)',
          }}
        >
          <p
            className={cm.cn(
              'font-mono text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('incidentForm.affected', {}, { defaultValue: 'Affected components' })}
          </p>
          <ul className={cm.cn('mt-3 space-y-2 max-h-[420px] overflow-y-auto pr-1')}>
            {components.map((c) => {
              const checked = selected.has(c.id)
              return (
                <li key={c.id}>
                  <label
                    data-testid={`affected-${c.id}`}
                    className={cm.cn(
                      'flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer',
                    )}
                    style={{
                      backgroundColor: checked
                        ? 'rgba(16, 185, 129, 0.10)'
                        : 'rgba(15, 23, 42, 0.4)',
                      border: `1px solid ${checked ? 'rgba(16, 185, 129, 0.30)' : 'var(--color-border-card)'}`,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(c.id)}
                      className={cm.cn('accent-emerald-500')}
                    />
                    <span className={cm.cn('text-sm')}>{c.name}</span>
                  </label>
                </li>
              )
            })}
            {components.length === 0 ? (
              <li className={cm.cn('text-xs text-on-surface-variant py-4 text-center font-mono')}>
                {t(
                  'incidentForm.noComponents',
                  {},
                  { defaultValue: 'No components yet — add one first.' },
                )}
              </li>
            ) : null}
          </ul>
        </aside>
      </form>
    </div>
  )
}
