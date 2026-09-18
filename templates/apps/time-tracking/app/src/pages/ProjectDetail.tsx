import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { DurationKpiCard } from '../components/DurationKpiCard.js'
import { type TimeEntry as RowEntry, TimeEntryRow } from '../components/TimeEntryRow.js'
import { formatCents, formatHms, formatHourMinute, formatTimeOfDay } from '../lib/format.js'
import { useTimer } from '../lib/TimerContext.js'
import type { ApiClient, ApiInvoice, ApiProject, ApiTimeEntry } from '../lib/types.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

export function ProjectDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { entriesVersion } = useTimer()

  const [project, setProject] = useState<ApiProject | null>(null)
  const [client, setClient] = useState<ApiClient | null>(null)
  const [entries, setEntries] = useState<ReadonlyArray<ApiTimeEntry>>([])
  const [invoices, setInvoices] = useState<ReadonlyArray<ApiInvoice>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [archiving, setArchiving] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get(`/api/projects/${id}`)
      .then(async (res) => {
        if (cancelled) return
        const proj = unwrapSingle<ApiProject>(res)
        if (!proj) {
          setProject(null)
          return
        }
        setProject(proj)
        const tasks: Array<Promise<void>> = []
        if (proj.client_id) {
          tasks.push(
            http
              .get(`/api/clients/${proj.client_id}`)
              .then((r) => {
                if (!cancelled) setClient(unwrapSingle<ApiClient>(r))
              })
              .catch(() => {
                if (!cancelled) setClient(null)
              }),
          )
        }
        tasks.push(
          http
            .get(`/api/entries?project_id=${encodeURIComponent(proj.id)}`)
            .then((r) => {
              if (!cancelled) setEntries(unwrapList<ApiTimeEntry>(r))
            })
            .catch(() => {
              if (!cancelled) setEntries([])
            }),
        )
        tasks.push(
          http
            .get('/api/invoices')
            .then((r) => {
              if (!cancelled) setInvoices(unwrapList<ApiInvoice>(r))
            })
            .catch(() => {
              if (!cancelled) setInvoices([])
            }),
        )
        await Promise.all(tasks)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, entriesVersion])

  const trackedSeconds = useMemo(
    () => entries.reduce((acc, e) => acc + (e.duration_seconds ?? 0), 0),
    [entries],
  )
  const billableSeconds = useMemo(
    () =>
      entries.filter((e) => e.is_billable).reduce((acc, e) => acc + (e.duration_seconds ?? 0), 0),
    [entries],
  )

  const weekStart = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - d.getDay())
    return d.getTime()
  }, [])

  const trackedThisWeek = useMemo(
    () =>
      entries
        .filter((e) => new Date(e.started_at).getTime() >= weekStart)
        .reduce((acc, e) => acc + (e.duration_seconds ?? 0), 0),
    [entries, weekStart],
  )

  const projectInvoices = useMemo(
    () => (project?.client_id ? invoices.filter((i) => i.client_id === project.client_id) : []),
    [invoices, project?.client_id],
  )
  const openInvoices = useMemo(
    () =>
      projectInvoices.filter(
        (i) => i.status !== 'paid' && i.status !== 'void' && i.status !== 'cancelled',
      ),
    [projectInvoices],
  )
  const openInvoiceTotal = openInvoices.reduce((acc, i) => acc + (i.total_cents ?? 0), 0)

  const recentRows: ReadonlyArray<RowEntry> = useMemo(
    () =>
      entries.slice(0, 8).map((e) => ({
        id: e.id,
        description: e.description,
        projectName: project?.name ?? null,
        projectColor: project?.color ?? null,
        startLabel: formatTimeOfDay(e.started_at),
        endLabel: e.ended_at
          ? formatTimeOfDay(e.ended_at)
          : t('projectDetail.now', {}, { defaultValue: 'now' }),
        durationLabel: formatHms(e.duration_seconds ?? 0),
        billable: e.is_billable,
      })),
    [entries, project, t],
  )

  const onArchive = async () => {
    if (!project) return
    if (
      !window.confirm(
        t(
          'projectDetail.archiveConfirm',
          {},
          { defaultValue: 'Archive this project? It will hide from listings.' },
        ),
      )
    )
      return
    setArchiving(true)
    try {
      await http.post(`/api/projects/${project.id}/archive`, {})
      navigate('/projects')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to archive')
    } finally {
      setArchiving(false)
    }
  }

  if (loading) {
    return (
      <p
        className={cm.cn(
          cm.sp('p', 12),
          cm.textCenter,
          cm.textSize('sm'),
          'text-foreground-secondary',
        )}
        data-test="project-loading"
      >
        {t('projectDetail.loading', {}, { defaultValue: 'Loading project…' })}
      </p>
    )
  }

  if (!project) {
    return (
      <div
        className={cm.cn(cm.sp('p', 12), cm.textCenter, cm.stack(4))}
        data-test="project-missing"
      >
        <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-foreground')}>
          {t('projectDetail.notFound', {}, { defaultValue: 'Project not found.' })}
        </p>
        <Link to="/projects" className={cm.cn(cm.textSize('sm'), 'text-blue-600 hover:underline')}>
          {t('projectDetail.back', {}, { defaultValue: 'Back to projects' })}
        </Link>
      </div>
    )
  }

  const hourlyRate = (project.hourly_rate_cents ?? 0) / 100
  const trackedHours = trackedSeconds / 3600
  const revenueCents = Math.round((billableSeconds / 3600) * (project.hourly_rate_cents ?? 0))
  const budgetHours =
    project.budget_cents && project.hourly_rate_cents && project.hourly_rate_cents > 0
      ? project.budget_cents / project.hourly_rate_cents
      : null
  const burnPct =
    budgetHours && budgetHours > 0 ? Math.round((trackedHours / budgetHours) * 100) : 0
  const overBudget = burnPct > 100

  return (
    <div
      className={cm.cn(cm.sp('p', 8), cm.stack(6), 'max-w-[1400px] mx-auto')}
      data-test="project-detail"
    >
      <nav
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          cm.textSize('xs'),
          'text-foreground-secondary',
        )}
      >
        <Link
          to="/projects"
          className={cm.cn('hover:text-blue-600 uppercase tracking-widest font-bold')}
        >
          {t('nav.projects', {}, { defaultValue: 'Projects' })}
        </Link>
        <span className={cm.cn('material-symbols-outlined text-base')}>chevron_right</span>
        <span className={cm.cn('uppercase tracking-widest font-bold text-foreground')}>
          {project.name}
        </span>
      </nav>

      {error && (
        <p
          className={cm.cn(
            cm.sp('p', 3),
            cm.textSize('sm'),
            'text-error bg-rose-50 border border-rose-200 rounded-lg',
          )}
        >
          {error}
        </p>
      )}

      <section
        className={cm.cn(
          cm.flex({ direction: 'col', justify: 'between' }),
          cm.sp('p', 10),
          'relative overflow-hidden rounded-[2rem] text-white min-h-[260px]',
        )}
        style={{ background: `linear-gradient(135deg, ${project.color}, #0f172a 80%)` }}
      >
        <div className={cm.cn('relative z-10')}>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.sp('mb', 2),
              'font-bold uppercase tracking-widest text-white/70',
            )}
          >
            {client?.name ?? t('projectDetail.internal', {}, { defaultValue: 'Internal project' })}
          </p>
          <h1 className={cm.cn('text-5xl font-extrabold tracking-tight')}>{project.name}</h1>
          <div
            className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }), cm.sp('mt', 4))}
          >
            {project.billable && project.hourly_rate_cents != null && (
              <span
                className={cm.cn(
                  'inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest bg-surface/20 backdrop-blur-md',
                )}
              >
                <span className={cm.cn(cm.textSize('xs'), 'material-symbols-outlined')}>
                  attach_money
                </span>
                {t(
                  'projectDetail.billable',
                  { rate: hourlyRate },
                  { defaultValue: 'Billable · ${{rate}}/hr' },
                )}
              </span>
            )}
            {budgetHours != null && (
              <span
                className={cm.cn(
                  'inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest bg-surface/20 backdrop-blur-md',
                )}
              >
                <span className={cm.cn(cm.textSize('xs'), 'material-symbols-outlined')}>
                  schedule
                </span>
                {t(
                  'projectDetail.budget',
                  { hours: budgetHours.toFixed(0) },
                  { defaultValue: '{{hours}}h budget' },
                )}
              </span>
            )}
          </div>
        </div>
        <div className={cm.cn('relative z-10 grid grid-cols-3 gap-6')}>
          <Stat
            label={t('projectDetail.tracked', {}, { defaultValue: 'Tracked' })}
            value={formatHourMinute(trackedSeconds)}
          />
          <Stat
            label={t('projectDetail.remaining', {}, { defaultValue: 'Remaining' })}
            value={
              budgetHours != null ? `${Math.max(budgetHours - trackedHours, 0).toFixed(1)}h` : '—'
            }
          />
          <Stat
            label={t('projectDetail.revenue', {}, { defaultValue: 'Revenue' })}
            value={formatCents(revenueCents)}
          />
        </div>
        <div
          className={cm.cn(
            'absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-surface/10 blur-3xl',
          )}
        />
        <div
          className={cm.cn('absolute right-12 top-12 w-20 h-20 rounded-full bg-surface/15 blur-xl')}
        />
      </section>

      <section className={cm.cn(cm.flex({ justify: 'end', gap: 'sm' }))}>
        <button
          type="button"
          onClick={onArchive}
          disabled={archiving}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 4),
            cm.sp('py', 2.5),
            cm.fontWeight('semibold'),
            cm.textSize('sm'),
            'rounded-xl bg-surface border border-border text-foreground hover:bg-surface-secondary transition-colors disabled:opacity-60',
          )}
          data-test="project-archive"
        >
          <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>archive</span>
          {t('projectDetail.archive', {}, { defaultValue: 'Archive project' })}
        </button>
      </section>

      {budgetHours != null && (
        <section className={cm.cn(cm.sp('p', 6), 'bg-surface rounded-2xl shadow-sm')}>
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-foreground')}>
              {t('projectDetail.budgetTitle', {}, { defaultValue: 'Budget burn-down' })}
            </h2>
            <span
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                overBudget ? 'text-error' : 'text-foreground',
              )}
            >
              {trackedHours.toFixed(1)}h / {budgetHours.toFixed(0)}h · {burnPct}%
            </span>
          </div>
          <div
            className={cm.cn(
              'relative h-3 w-full rounded-full bg-surface-secondary overflow-hidden',
            )}
          >
            <div
              className={cm.cn(
                'absolute inset-y-0 left-0 rounded-full transition-all',
                overBudget ? 'bg-rose-500' : 'bg-emerald-500',
              )}
              style={{ width: `${Math.min(burnPct, 100)}%` }}
            />
          </div>
        </section>
      )}

      <section className={cm.cn('grid grid-cols-2 lg:grid-cols-4 gap-4')}>
        <DurationKpiCard
          label={t('status.thisWeek', {}, { defaultValue: 'This week' })}
          value={formatHourMinute(trackedThisWeek)}
          icon="schedule"
          accent="primary"
        />
        <DurationKpiCard
          label={t('projectDetail.kpi.openInvoices', {}, { defaultValue: 'Open invoices' })}
          value={String(openInvoices.length)}
          icon="receipt_long"
          accent="amber"
          mono={false}
          trend={openInvoiceTotal > 0 ? formatCents(openInvoiceTotal) : undefined}
        />
        <DurationKpiCard
          label={t('projectDetail.kpi.entries', {}, { defaultValue: 'Entries' })}
          value={String(entries.length)}
          icon="list"
          accent="emerald"
          mono={false}
        />
        <DurationKpiCard
          label={t('projectDetail.kpi.billable', {}, { defaultValue: 'Billable hours' })}
          value={formatHourMinute(billableSeconds)}
          icon="attach_money"
          accent="violet"
        />
      </section>

      <section className={cm.cn('bg-surface rounded-2xl shadow-sm overflow-hidden')}>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('px', 6),
            cm.sp('py', 5),
            'border-b border-border',
          )}
        >
          <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-foreground')}>
            {t('projectDetail.recentEntries', {}, { defaultValue: 'Recent entries' })}
          </h3>
          <Link
            to="/entries"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'text-blue-600 hover:underline',
            )}
          >
            {t('common.viewAll', {}, { defaultValue: 'View all' })}
          </Link>
        </div>
        {recentRows.length === 0 ? (
          <p
            className={cm.cn(
              cm.sp('p', 12),
              cm.textCenter,
              cm.textSize('sm'),
              'text-foreground-secondary',
            )}
            data-test="project-entries-empty"
          >
            {t(
              'projectDetail.noEntries',
              {},
              { defaultValue: 'No entries logged on this project yet.' },
            )}
          </p>
        ) : (
          <div className={cm.cn('divide-y divide-border')}>
            {recentRows.map((e) => (
              <TimeEntryRow key={e.id} entry={e} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  const cm = getClassMap()
  return (
    <div className={cm.stack(1)}>
      <p className={cm.cn('text-[10px] uppercase tracking-widest font-bold text-white/70')}>
        {label}
      </p>
      <p className={cm.cn(cm.textSize('2xl'), 'font-extrabold tabular-nums font-mono')}>{value}</p>
    </div>
  )
}

export default ProjectDetail
export { ProjectDetail as ProjectDetailPage }
