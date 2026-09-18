import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { DurationKpiCard } from '../components/DurationKpiCard.js'
import { type InvoiceStatus, InvoiceStatusPill } from '../components/InvoiceStatusPill.js'
import { ProjectBudgetCard } from '../components/ProjectBudgetCard.js'
import { formatCents, formatHourMinute } from '../lib/format.js'
import { useTimer } from '../lib/TimerContext.js'
import type { ApiClient, ApiInvoice, ApiProject, ApiTimeEntry } from '../lib/types.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

function deriveStatus(inv: ApiInvoice): InvoiceStatus {
  if (inv.status === 'paid') return 'paid'
  if (inv.status === 'void' || inv.status === 'cancelled') return 'void'
  if (inv.status === 'draft') return 'draft'
  if (inv.due_at && new Date(inv.due_at).getTime() < Date.now()) return 'overdue'
  return 'sent'
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

export function ClientDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const { entriesVersion } = useTimer()

  const [client, setClient] = useState<ApiClient | null>(null)
  const [projects, setProjects] = useState<ReadonlyArray<ApiProject>>([])
  const [invoices, setInvoices] = useState<ReadonlyArray<ApiInvoice>>([])
  const [entries, setEntries] = useState<ReadonlyArray<ApiTimeEntry>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get(`/api/clients/${id}`).catch(() => null),
      http.get('/api/projects').catch(() => null),
      http.get(`/api/invoices?client_id=${encodeURIComponent(id)}`).catch(() => null),
      http.get('/api/entries').catch(() => null),
    ])
      .then(([c, p, i, e]) => {
        if (cancelled) return
        setClient(unwrapSingle<ApiClient>(c))
        setProjects(unwrapList<ApiProject>(p))
        setInvoices(unwrapList<ApiInvoice>(i))
        setEntries(unwrapList<ApiTimeEntry>(e))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, entriesVersion])

  const clientProjects = useMemo(
    () => projects.filter((p) => p.client_id === id && !p.archived),
    [projects, id],
  )
  const projectIds = useMemo(() => new Set(clientProjects.map((p) => p.id)), [clientProjects])
  const trackedSecondsByProject = useMemo(() => {
    const m = new Map<string, number>()
    for (const e of entries) {
      if (!e.project_id || !projectIds.has(e.project_id)) continue
      m.set(e.project_id, (m.get(e.project_id) ?? 0) + (e.duration_seconds ?? 0))
    }
    return m
  }, [entries, projectIds])

  const totalSeconds = useMemo(
    () => Array.from(trackedSecondsByProject.values()).reduce((a, b) => a + b, 0),
    [trackedSecondsByProject],
  )

  const totalBilledCents = useMemo(
    () =>
      invoices.filter((i) => i.status === 'paid').reduce((acc, i) => acc + (i.total_cents ?? 0), 0),
    [invoices],
  )

  const outstandingCents = useMemo(
    () =>
      invoices
        .filter((i) => i.status !== 'paid' && i.status !== 'void' && i.status !== 'cancelled')
        .reduce((acc, i) => acc + (i.total_cents ?? 0), 0),
    [invoices],
  )

  if (loading) {
    return (
      <p
        className={cm.cn(
          cm.sp('p', 12),
          cm.textCenter,
          cm.textSize('sm'),
          'text-foreground-secondary',
        )}
        data-test="client-loading"
      >
        {t('clientDetail.loading', {}, { defaultValue: 'Loading client…' })}
      </p>
    )
  }

  if (!client) {
    return (
      <div className={cm.cn(cm.sp('p', 12), cm.textCenter, cm.stack(4))} data-test="client-missing">
        <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-foreground')}>
          {t('clientDetail.notFound', {}, { defaultValue: 'Client not found.' })}
        </p>
        <Link to="/clients" className={cm.cn(cm.textSize('sm'), 'text-blue-600 hover:underline')}>
          {t('clientDetail.back', {}, { defaultValue: 'Back to clients' })}
        </Link>
      </div>
    )
  }

  const hue = hueOf(client.name)

  return (
    <div
      className={cm.cn(cm.sp('p', 8), cm.stack(6), 'max-w-[1400px] mx-auto')}
      data-test="client-detail"
    >
      <nav
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          cm.textSize('xs'),
          'text-foreground-secondary',
        )}
      >
        <Link
          to="/clients"
          className={cm.cn('hover:text-blue-600 uppercase tracking-widest font-bold')}
        >
          {t('clientDetail.breadcrumb', {}, { defaultValue: 'Clients' })}
        </Link>
        <span className={cm.cn('material-symbols-outlined text-base')}>chevron_right</span>
        <span className={cm.cn('uppercase tracking-widest font-bold text-foreground')}>
          {client.name}
        </span>
      </nav>

      <section
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }),
          cm.sp('p', 8),
          'bg-surface rounded-2xl shadow-sm',
        )}
      >
        <span
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(20),
            cm.h(20),
            cm.roundedFull,
            'text-white text-2xl font-extrabold tracking-wider shadow-md',
          )}
          style={{ backgroundColor: hue }}
        >
          {initialsOf(client.name)}
        </span>
        <div className={cm.cn(cm.flex1, cm.stack(1), 'min-w-0')}>
          <p className={cm.cn('text-[11px] uppercase tracking-widest font-bold text-primary')}>
            {t('clientDetail.eyebrow', {}, { defaultValue: 'Client overview' })}
          </p>
          <h1
            className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight text-foreground')}
          >
            {client.name}
          </h1>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }),
              cm.textSize('sm'),
              'text-foreground-secondary',
            )}
          >
            {client.email && (
              <span className={cm.flex({ align: 'center', gap: 'xs' })}>
                <span
                  className={cm.cn('material-symbols-outlined text-base text-foreground-tertiary')}
                >
                  mail
                </span>
                {client.email}
              </span>
            )}
            <span className={cm.flex({ align: 'center', gap: 'xs' })}>
              <span
                className={cm.cn('material-symbols-outlined text-base text-foreground-tertiary')}
              >
                payments
              </span>
              {client.billing_currency}
            </span>
            {client.hourly_rate_cents != null && (
              <span className={cm.flex({ align: 'center', gap: 'xs' })}>
                <span
                  className={cm.cn('material-symbols-outlined text-base text-foreground-tertiary')}
                >
                  schedule
                </span>
                {formatCents(client.hourly_rate_cents, client.billing_currency)}/hr
              </span>
            )}
          </div>
        </div>
        <Link
          to="/invoices"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 4),
            cm.sp('py', 2.5),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'rounded-xl bg-gradient-to-br from-blue-600 to-emerald-500 text-white shadow-md hover:shadow-lg transition-all',
          )}
          data-test="client-new-invoice"
        >
          <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
            receipt_long
          </span>
          {t('nav.newInvoice', {}, { defaultValue: 'New invoice' })}
        </Link>
      </section>

      <section className={cm.cn('grid grid-cols-2 lg:grid-cols-4 gap-4')}>
        <DurationKpiCard
          label={t('clientDetail.kpi.hours', {}, { defaultValue: 'Total hours' })}
          value={formatHourMinute(totalSeconds)}
          icon="schedule"
          accent="primary"
        />
        <DurationKpiCard
          label={t('clientDetail.kpi.billed', {}, { defaultValue: 'Total paid' })}
          value={formatCents(totalBilledCents, client.billing_currency)}
          icon="payments"
          accent="emerald"
        />
        <DurationKpiCard
          label={t('status.outstanding', {}, { defaultValue: 'Outstanding' })}
          value={formatCents(outstandingCents, client.billing_currency)}
          icon="hourglass_top"
          accent="amber"
          mono={true}
        />
        <DurationKpiCard
          label={t('clientDetail.kpi.projects', {}, { defaultValue: 'Active projects' })}
          value={String(clientProjects.length)}
          icon="folder_open"
          accent="violet"
          mono={false}
        />
      </section>

      <section className={cm.stack(4)}>
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-foreground')}>
          {t('nav.projects', {}, { defaultValue: 'Projects' })}
        </h2>
        {clientProjects.length === 0 ? (
          <p
            className={cm.cn(
              cm.sp('py', 8),
              cm.textCenter,
              cm.textSize('sm'),
              'text-foreground-secondary bg-surface rounded-2xl shadow-sm',
            )}
            data-test="client-projects-empty"
          >
            {t('clientDetail.noProjects', {}, { defaultValue: 'No projects yet for this client.' })}
          </p>
        ) : (
          <div className={cm.cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4')}>
            {clientProjects.map((p) => {
              const tracked = (trackedSecondsByProject.get(p.id) ?? 0) / 3600
              const budgetHours =
                p.budget_cents && p.hourly_rate_cents && p.hourly_rate_cents > 0
                  ? p.budget_cents / p.hourly_rate_cents
                  : null
              return (
                <ProjectBudgetCard
                  key={p.id}
                  id={p.id}
                  clientName={client.name}
                  name={p.name}
                  color={p.color}
                  hourlyRate={p.hourly_rate_cents != null ? p.hourly_rate_cents / 100 : null}
                  trackedHoursLabel={`${tracked.toFixed(1)}h`}
                  budgetHours={budgetHours}
                  trackedHours={tracked}
                  billable={p.billable}
                />
              )
            })}
          </div>
        )}
      </section>

      <section className={cm.stack(4)}>
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-foreground')}>
          {t('clientDetail.invoicesTitle', {}, { defaultValue: 'Recent invoices' })}
        </h2>
        {invoices.length === 0 ? (
          <p
            className={cm.cn(
              cm.sp('py', 8),
              cm.textCenter,
              cm.textSize('sm'),
              'text-foreground-secondary bg-surface rounded-2xl shadow-sm',
            )}
            data-test="client-invoices-empty"
          >
            {t('clientDetail.noInvoices', {}, { defaultValue: 'No invoices yet.' })}
          </p>
        ) : (
          <div className={cm.cn('bg-surface rounded-2xl shadow-sm divide-y divide-border')}>
            {invoices.map((inv) => (
              <Link
                to={`/invoices/${inv.id}`}
                key={inv.id}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
                  cm.sp('px', 6),
                  cm.sp('py', 4),
                  'hover:bg-surface-secondary transition-colors',
                )}
              >
                <div>
                  <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-foreground')}>
                    {inv.number}
                  </p>
                  <p className={cm.cn(cm.textSize('xs'), 'text-foreground-secondary')}>
                    {inv.due_at
                      ? t(
                          'clientDetail.dueOn',
                          { date: new Date(inv.due_at).toLocaleDateString() },
                          { defaultValue: 'Due {{date}}' },
                        )
                      : t('clientDetail.noDueDate', {}, { defaultValue: 'No due date set' })}
                  </p>
                </div>
                <div className={cm.flex({ align: 'center', gap: 'md' })}>
                  <span
                    className={cm.cn(
                      cm.textSize('lg'),
                      'tabular-nums font-mono font-bold text-foreground',
                    )}
                  >
                    {formatCents(inv.total_cents ?? 0, inv.currency)}
                  </span>
                  <InvoiceStatusPill status={deriveStatus(inv)} />
                  <span className={cm.cn('material-symbols-outlined text-foreground-tertiary')}>
                    chevron_right
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default ClientDetail
export { ClientDetail as ClientDetailPage }
