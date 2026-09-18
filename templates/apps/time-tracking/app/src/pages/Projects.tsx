import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ProjectBudgetCard } from '../components/ProjectBudgetCard.js'
import { useTimer } from '../lib/TimerContext.js'
import type { ApiClient, ApiProject, ApiTimeEntry } from '../lib/types.js'
import { unwrapList } from '../lib/unwrap.js'

const COLOR_PRESETS = [
  '#2563eb',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#0ea5e9',
  '#ef4444',
  '#14b8a6',
]

interface ProjectForm {
  name: string
  client_id: string
  color: string
  hourly_rate_cents: string
  budget_cents: string
  billable: boolean
}

function defaultForm(): ProjectForm {
  return {
    name: '',
    client_id: '',
    color: COLOR_PRESETS[0],
    hourly_rate_cents: '',
    budget_cents: '',
    billable: true,
  }
}

type Filter = 'all' | 'billable' | 'over-budget'

export function Projects() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { entriesVersion } = useTimer()

  const [projects, setProjects] = useState<ReadonlyArray<ApiProject>>([])
  const [clients, setClients] = useState<ReadonlyArray<ApiClient>>([])
  const [entries, setEntries] = useState<ReadonlyArray<ApiTimeEntry>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<ProjectForm>(() => defaultForm())
  const [submitting, setSubmitting] = useState(false)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      http.get('/api/projects').catch((e: unknown) => e),
      http.get('/api/clients').catch((e: unknown) => e),
      http.get('/api/entries').catch((e: unknown) => e),
    ])
      .then(([p, c, e]) => {
        if (cancelled) return
        if (p instanceof Error) setError(p.message)
        else setProjects(unwrapList<ApiProject>(p))
        if (!(c instanceof Error)) setClients(unwrapList<ApiClient>(c))
        if (!(e instanceof Error)) setEntries(unwrapList<ApiTimeEntry>(e))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, version, entriesVersion])

  const clientById = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients])

  const trackedSeconds = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of entries) {
      if (!e.project_id) continue
      map.set(e.project_id, (map.get(e.project_id) ?? 0) + (e.duration_seconds ?? 0))
    }
    return map
  }, [entries])

  const visible = useMemo(
    () =>
      projects
        .filter((p) => !p.archived)
        .filter((p) => {
          if (filter === 'billable') return p.billable
          if (filter === 'over-budget') {
            if (!p.budget_cents) return false
            const tracked = trackedSeconds.get(p.id) ?? 0
            const billed = (tracked / 3600) * ((p.hourly_rate_cents ?? 0) / 100)
            return billed * 100 > p.budget_cents
          }
          return true
        }),
    [projects, filter, trackedSeconds],
  )

  const filters: ReadonlyArray<{ key: Filter; label: string }> = [
    { key: 'all', label: t('status.all', {}, { defaultValue: 'All' }) },
    { key: 'billable', label: t('projects.filter.billable', {}, { defaultValue: 'Billable' }) },
    {
      key: 'over-budget',
      label: t('projects.filter.overBudget', {}, { defaultValue: 'Over budget' }),
    },
  ]

  const onCreate = async () => {
    if (!form.name.trim()) {
      setError(t('auth.signup.nameRequired', {}, { defaultValue: 'Name is required.' }))
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await http.post('/api/projects', {
        name: form.name.trim(),
        client_id: form.client_id || null,
        color: form.color,
        hourly_rate_cents: form.hourly_rate_cents ? Number(form.hourly_rate_cents) * 100 : null,
        budget_cents: form.budget_cents ? Number(form.budget_cents) * 100 : null,
        billable: form.billable,
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

  return (
    <div
      className={cm.cn(cm.sp('p', 8), cm.stack(6), 'max-w-[1400px] mx-auto')}
      data-test="projects-page"
    >
      <section className={cm.flex({ justify: 'between', align: 'end', wrap: 'wrap' })}>
        <div className={cm.stack(2)}>
          <p className={cm.cn('text-[11px] uppercase tracking-widest font-bold text-blue-600')}>
            {t('projects.eyebrow', {}, { defaultValue: 'Active engagements' })}
          </p>
          <h1
            className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight text-foreground')}
          >
            {t('nav.projects', {}, { defaultValue: 'Projects' })}
          </h1>
          <p className={cm.cn(cm.textSize('lg'), 'text-foreground-secondary')}>
            {t(
              'projects.subtitle',
              {},
              { defaultValue: 'Color-coded engagements with budgets and burn-down.' },
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
          data-test="new-project-toggle"
        >
          <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>add</span>
          {t('nav.newProject', {}, { defaultValue: 'New project' })}
        </button>
      </section>

      {error && (
        <p
          className={cm.cn(
            cm.sp('p', 3),
            cm.textSize('sm'),
            'text-error bg-rose-50 border border-rose-200 rounded-lg',
          )}
          data-test="projects-error"
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
          data-test="new-project-form"
        >
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-foreground')}>
            {t('projects.formTitle', {}, { defaultValue: 'Create project' })}
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
                {t('projects.form.name', {}, { defaultValue: 'Project name' })}
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
                data-test="project-name"
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
                {t('nav.client', {}, { defaultValue: 'Client' })}
              </span>
              <select
                value={form.client_id}
                onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30',
                )}
                data-test="project-client"
              >
                <option value="">
                  {t('projects.form.noClient', {}, { defaultValue: 'Internal (no client)' })}
                </option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={cm.stack(1)}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-foreground-secondary',
                )}
              >
                {t('projects.form.rate', {}, { defaultValue: 'Hourly rate (USD)' })}
              </span>
              <input
                type="number"
                min={0}
                step="1"
                value={form.hourly_rate_cents}
                onChange={(e) => setForm((f) => ({ ...f, hourly_rate_cents: e.target.value }))}
                className={cm.cn(cm.sp('px', 3), cm.sp('py', 2), 'border border-border rounded-lg')}
                data-test="project-rate"
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
                {t('projects.form.budget', {}, { defaultValue: 'Budget (USD)' })}
              </span>
              <input
                type="number"
                min={0}
                step="1"
                value={form.budget_cents}
                onChange={(e) => setForm((f) => ({ ...f, budget_cents: e.target.value }))}
                className={cm.cn(cm.sp('px', 3), cm.sp('py', 2), 'border border-border rounded-lg')}
                data-test="project-budget"
              />
            </label>
            <div className={cm.stack(2)}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-foreground-secondary',
                )}
              >
                {t('projects.form.color', {}, { defaultValue: 'Accent color' })}
              </span>
              <div className={cm.cn(cm.flex({ gap: 'xs' }), 'flex-wrap')}>
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, color: c }))}
                    aria-label={c}
                    className={cm.cn(
                      cm.w(8),
                      cm.h(8),
                      cm.roundedFull,
                      'border-2 transition-transform',
                      form.color === c ? 'border-slate-900 scale-110' : 'border-transparent',
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <label className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mt', 6))}>
              <input
                type="checkbox"
                checked={form.billable}
                onChange={(e) => setForm((f) => ({ ...f, billable: e.target.checked }))}
                data-test="project-billable"
              />
              <span className={cm.cn(cm.textSize('sm'), 'text-foreground')}>
                {t(
                  'projects.form.billable',
                  {},
                  { defaultValue: 'Time on this project is billable' },
                )}
              </span>
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
              data-test="project-submit"
            >
              {submitting
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('projects.save', {}, { defaultValue: 'Create project' })}
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

      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          cm.sp('px', 1),
          'inline-flex bg-surface rounded-full border border-border self-start',
        )}
      >
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'rounded-full transition-colors',
              filter === f.key
                ? 'bg-inverse-surface text-inverse-on-surface'
                : 'text-foreground-secondary hover:text-foreground',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p
          className={cm.cn(
            cm.sp('py', 12),
            cm.textCenter,
            cm.textSize('sm'),
            'text-foreground-secondary',
          )}
        >
          {t('projects.loading', {}, { defaultValue: 'Loading projects…' })}
        </p>
      ) : visible.length === 0 ? (
        <p
          className={cm.cn(
            cm.sp('py', 12),
            cm.textCenter,
            cm.textSize('sm'),
            'text-foreground-secondary',
          )}
          data-test="projects-empty"
        >
          {t(
            'projects.empty',
            {},
            { defaultValue: 'No projects yet. Create your first project above.' },
          )}
        </p>
      ) : (
        <section className={cm.cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4')}>
          {visible.map((p) => {
            const tracked = (trackedSeconds.get(p.id) ?? 0) / 3600
            const budgetHours =
              p.budget_cents && p.hourly_rate_cents && p.hourly_rate_cents > 0
                ? p.budget_cents / p.hourly_rate_cents
                : null
            const client = p.client_id ? clientById.get(p.client_id) : null
            return (
              <ProjectBudgetCard
                key={p.id}
                id={p.id}
                clientName={client?.name ?? null}
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
        </section>
      )}
    </div>
  )
}

export default Projects
export { Projects as ProjectsPage }
