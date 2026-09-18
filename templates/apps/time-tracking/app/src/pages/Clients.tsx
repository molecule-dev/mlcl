import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { formatCents } from '../lib/format.js'
import { useTimer } from '../lib/TimerContext.js'
import type { ApiClient, ApiInvoice, ApiProject, ApiTimeEntry } from '../lib/types.js'
import { unwrapList } from '../lib/unwrap.js'

interface ClientForm {
  name: string
  email: string
  billing_currency: string
  hourly_rate: string
}

function defaultForm(): ClientForm {
  return { name: '', email: '', billing_currency: 'USD', hourly_rate: '' }
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0 || !parts[0]) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function hueOf(name: string): string {
  const palette = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#0ea5e9']
  let n = 0
  for (const ch of name) n = (n + ch.charCodeAt(0)) % palette.length
  return palette[n]
}

export function Clients() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { entriesVersion } = useTimer()

  const [clients, setClients] = useState<ReadonlyArray<ApiClient>>([])
  const [projects, setProjects] = useState<ReadonlyArray<ApiProject>>([])
  const [entries, setEntries] = useState<ReadonlyArray<ApiTimeEntry>>([])
  const [invoices, setInvoices] = useState<ReadonlyArray<ApiInvoice>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<ClientForm>(() => defaultForm())
  const [submitting, setSubmitting] = useState(false)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      http.get('/api/clients').catch((e: unknown) => e),
      http.get('/api/projects').catch((e: unknown) => e),
      http.get('/api/entries').catch((e: unknown) => e),
      http.get('/api/invoices').catch((e: unknown) => e),
    ])
      .then(([c, p, e, i]) => {
        if (cancelled) return
        if (c instanceof Error) setError(c.message)
        else setClients(unwrapList<ApiClient>(c))
        if (!(p instanceof Error)) setProjects(unwrapList<ApiProject>(p))
        if (!(e instanceof Error)) setEntries(unwrapList<ApiTimeEntry>(e))
        if (!(i instanceof Error)) setInvoices(unwrapList<ApiInvoice>(i))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, version, entriesVersion])

  const monthStart = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(1)
    return d.getTime()
  }, [])

  const projectsByClient = useMemo(() => {
    const map = new Map<string, ApiProject[]>()
    for (const p of projects) {
      if (!p.client_id) continue
      const arr = map.get(p.client_id) ?? []
      arr.push(p)
      map.set(p.client_id, arr)
    }
    return map
  }, [projects])

  const projectIdToClient = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of projects) if (p.client_id) m.set(p.id, p.client_id)
    return m
  }, [projects])

  const hoursByClient = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of entries) {
      if (!e.project_id) continue
      const cid = projectIdToClient.get(e.project_id)
      if (!cid) continue
      if (new Date(e.started_at).getTime() < monthStart) continue
      map.set(cid, (map.get(cid) ?? 0) + (e.duration_seconds ?? 0))
    }
    return map
  }, [entries, projectIdToClient, monthStart])

  const outstandingByClient = useMemo(() => {
    const map = new Map<string, number>()
    for (const inv of invoices) {
      if (inv.status === 'paid' || inv.status === 'void') continue
      map.set(inv.client_id, (map.get(inv.client_id) ?? 0) + (inv.total_cents ?? 0))
    }
    return map
  }, [invoices])

  const onCreate = async () => {
    if (!form.name.trim()) {
      setError(t('auth.signup.nameRequired', {}, { defaultValue: 'Name is required.' }))
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await http.post('/api/clients', {
        name: form.name.trim(),
        email: form.email.trim() || null,
        billing_currency: form.billing_currency || 'USD',
        hourly_rate_cents: form.hourly_rate ? Number(form.hourly_rate) * 100 : null,
      })
      setForm(defaultForm())
      setShowForm(false)
      setVersion((n) => n + 1)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create')
    } finally {
      setSubmitting(false)
    }
  }

  const visible = clients.filter((c) => !c.archived)

  return (
    <div
      className={cm.cn(cm.sp('p', 8), cm.stack(6), 'max-w-[1400px] mx-auto')}
      data-test="clients-page"
    >
      <section className={cm.flex({ justify: 'between', align: 'end', wrap: 'wrap' })}>
        <div className={cm.stack(2)}>
          <p className={cm.cn('text-[11px] uppercase tracking-widest font-bold text-blue-600')}>
            {t('clients.eyebrow', {}, { defaultValue: 'People who pay' })}
          </p>
          <h1
            className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight text-foreground')}
          >
            {t('clients.title', {}, { defaultValue: 'Clients' })}
          </h1>
          <p className={cm.cn(cm.textSize('lg'), 'text-foreground-secondary')}>
            {t(
              'clients.subtitle',
              {},
              {
                defaultValue:
                  'Every relationship in one place — projects, hours, outstanding invoices.',
              },
            )}
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          type="button"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 5),
            cm.sp('py', 2.5),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'rounded-xl bg-gradient-to-br from-blue-600 to-emerald-500 text-white shadow-md hover:shadow-lg transition-all',
          )}
          data-test="new-client-toggle"
        >
          <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>add</span>
          {t('clients.create', {}, { defaultValue: 'New client' })}
        </button>
      </section>

      {error && (
        <p
          className={cm.cn(
            cm.sp('p', 3),
            cm.textSize('sm'),
            'text-error bg-rose-50 border border-rose-200 rounded-lg',
          )}
          data-test="clients-error"
        >
          {error}
        </p>
      )}

      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void onCreate()
          }}
          className={cm.cn(
            cm.sp('p', 6),
            cm.stack(4),
            'bg-surface rounded-2xl shadow-sm border border-border',
          )}
          data-test="new-client-form"
        >
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-foreground')}>
            {t('clients.formTitle', {}, { defaultValue: 'Add client' })}
          </h2>
          <div className={cm.cn('grid grid-cols-1 sm:grid-cols-2 gap-4')}>
            <label className={cm.stack(1)}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-foreground-secondary',
                )}
              >
                {t('clients.form.name', {}, { defaultValue: 'Client name' })}
              </span>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30',
                )}
                data-test="client-name"
              />
            </label>
            <label className={cm.stack(1)}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-foreground-secondary',
                )}
              >
                {t('clients.form.email', {}, { defaultValue: 'Billing email' })}
              </span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className={cm.cn(cm.sp('px', 3), cm.sp('py', 2), 'border border-border rounded-lg')}
                data-test="client-email"
              />
            </label>
            <label className={cm.stack(1)}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-foreground-secondary',
                )}
              >
                {t('clients.form.currency', {}, { defaultValue: 'Currency' })}
              </span>
              <input
                type="text"
                value={form.billing_currency}
                onChange={(e) =>
                  setForm((f) => ({ ...f, billing_currency: e.target.value.toUpperCase() }))
                }
                maxLength={3}
                className={cm.cn(cm.sp('px', 3), cm.sp('py', 2), 'border border-border rounded-lg')}
                data-test="client-currency"
              />
            </label>
            <label className={cm.stack(1)}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-foreground-secondary',
                )}
              >
                {t('clients.form.rate', {}, { defaultValue: 'Default hourly rate (USD)' })}
              </span>
              <input
                type="number"
                min={0}
                step="1"
                value={form.hourly_rate}
                onChange={(e) => setForm((f) => ({ ...f, hourly_rate: e.target.value }))}
                className={cm.cn(cm.sp('px', 3), cm.sp('py', 2), 'border border-border rounded-lg')}
                data-test="client-rate"
              />
            </label>
          </div>
          <div className={cm.cn(cm.flex({ gap: 'sm' }))}>
            <button
              type="submit"
              disabled={submitting}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2.5),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'rounded-xl bg-inverse-surface text-inverse-on-surface hover:bg-inverse-surface transition-colors disabled:opacity-60',
              )}
              data-test="client-submit"
            >
              {submitting
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('clients.save', {}, { defaultValue: 'Add client' })}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2.5),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'rounded-xl bg-surface border border-border text-foreground hover:bg-surface-secondary transition-colors',
              )}
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p
          className={cm.cn(
            cm.sp('py', 12),
            cm.textCenter,
            cm.textSize('sm'),
            'text-foreground-secondary',
          )}
        >
          {t('clients.loading', {}, { defaultValue: 'Loading clients…' })}
        </p>
      ) : visible.length === 0 ? (
        <p
          className={cm.cn(
            cm.sp('py', 12),
            cm.textCenter,
            cm.textSize('sm'),
            'text-foreground-secondary',
          )}
          data-test="clients-empty"
        >
          {t(
            'clients.empty',
            {},
            { defaultValue: 'No clients yet. Add your first client to track billable work.' },
          )}
        </p>
      ) : (
        <section className={cm.cn('bg-surface rounded-2xl shadow-sm overflow-hidden')}>
          <div
            className={cm.cn(
              'grid items-center bg-surface-secondary border-b border-border text-[10px] uppercase tracking-widest font-bold text-foreground-secondary',
            )}
            style={{
              gridTemplateColumns:
                'minmax(220px,1.4fr) minmax(120px,0.8fr) minmax(120px,0.8fr) minmax(140px,0.9fr) minmax(120px,0.7fr)',
            }}
          >
            <div className={cm.cn(cm.sp('px', 6), cm.sp('py', 3))}>
              {t('nav.client', {}, { defaultValue: 'Client' })}
            </div>
            <div className={cm.cn(cm.sp('py', 3))}>
              {t('nav.projects', {}, { defaultValue: 'Projects' })}
            </div>
            <div className={cm.cn(cm.sp('py', 3))}>
              {t('clients.col.hours', {}, { defaultValue: 'Hours / mo' })}
            </div>
            <div className={cm.cn(cm.sp('py', 3))}>
              {t('status.outstanding', {}, { defaultValue: 'Outstanding' })}
            </div>
            <div className={cm.cn(cm.sp('py', 3), cm.textRight, cm.sp('pr', 6))}>
              {t('clients.col.currency', {}, { defaultValue: 'Currency' })}
            </div>
          </div>

          {visible.map((c) => {
            const projectCount = projectsByClient.get(c.id)?.length ?? 0
            const hoursMonth = (hoursByClient.get(c.id) ?? 0) / 3600
            const outstanding = outstandingByClient.get(c.id) ?? 0
            return (
              <Link
                to={`/clients/${c.id}`}
                key={c.id}
                className={cm.cn(
                  'grid items-center border-b border-border last:border-b-0 hover:bg-surface-secondary transition-colors',
                )}
                style={{
                  gridTemplateColumns:
                    'minmax(220px,1.4fr) minmax(120px,0.8fr) minmax(120px,0.8fr) minmax(140px,0.9fr) minmax(120px,0.7fr)',
                }}
                data-test={`client-row-${c.id}`}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    cm.sp('px', 6),
                    cm.sp('py', 4),
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.w(10),
                      cm.h(10),
                      cm.roundedFull,
                      'shrink-0 text-white text-[12px] font-extrabold tracking-wider',
                    )}
                    style={{ backgroundColor: hueOf(c.name) }}
                  >
                    {initialsOf(c.name)}
                  </span>
                  <div className={cm.cn('min-w-0')}>
                    <p
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('bold'),
                        'text-foreground truncate',
                      )}
                    >
                      {c.name}
                    </p>
                    <p className={cm.cn(cm.textSize('xs'), 'text-foreground-secondary truncate')}>
                      {c.email ?? t('clients.noEmail', {}, { defaultValue: 'No billing email' })}
                    </p>
                  </div>
                </div>
                <div
                  className={cm.cn(
                    cm.textSize('sm'),
                    'tabular-nums font-mono font-semibold text-foreground',
                  )}
                >
                  {projectCount}
                </div>
                <div
                  className={cm.cn(
                    cm.textSize('sm'),
                    'tabular-nums font-mono font-semibold text-foreground',
                  )}
                >
                  {hoursMonth.toFixed(1)}h
                </div>
                <div
                  className={cm.cn(
                    cm.textSize('sm'),
                    'tabular-nums font-mono font-bold',
                    outstanding > 0 ? 'text-warning' : 'text-foreground-tertiary',
                  )}
                >
                  {outstanding > 0 ? formatCents(outstanding, c.billing_currency) : '—'}
                </div>
                <div
                  className={cm.cn(
                    cm.sp('pr', 6),
                    cm.textRight,
                    cm.textSize('sm'),
                    'text-foreground-secondary font-semibold',
                  )}
                >
                  {c.billing_currency}
                </div>
              </Link>
            )
          })}
        </section>
      )}
    </div>
  )
}

export default Clients
export { Clients as ClientsPage }
