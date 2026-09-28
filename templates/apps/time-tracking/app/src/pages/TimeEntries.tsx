import { useEffect, useMemo, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type TimeEntry as RowEntry, TimeEntryRow } from '../components/TimeEntryRow.js'
import {
  dateKey,
  formatHms,
  formatHourMinute,
  formatRelativeDay,
  formatTimeOfDay,
} from '../lib/format.js'
import { useTimer } from '../lib/TimerContext.js'
import type { ApiProject, ApiTimeEntry } from '../lib/types.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

type Filter = 'all' | 'billable' | 'non-billable'

interface ManualForm {
  description: string
  project_id: string
  date: string
  start_time: string
  end_time: string
  is_billable: boolean
}

function isoForLocal(date: string, time: string): string {
  if (!date || !time) return ''
  return new Date(`${date}T${time}`).toISOString()
}

function defaultManualForm(): ManualForm {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const end = `${pad(now.getHours())}:${pad(now.getMinutes())}`
  const startDate = new Date(now.getTime() - 60 * 60 * 1000)
  const start = `${pad(startDate.getHours())}:${pad(startDate.getMinutes())}`
  return {
    description: '',
    project_id: '',
    date: today,
    start_time: start,
    end_time: end,
    is_billable: true,
  }
}

export function TimeEntries() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { running, elapsedSeconds, entriesVersion, refresh: refreshTimer } = useTimer()

  const [entries, setEntries] = useState<ReadonlyArray<ApiTimeEntry>>([])
  const [projects, setProjects] = useState<ReadonlyArray<ApiProject>>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState<ManualForm>(() => defaultManualForm())
  const [submitting, setSubmitting] = useState(false)
  const [version, setVersion] = useState(0)

  const reloadEntries = async (): Promise<ReadonlyArray<ApiTimeEntry>> => {
    const res = await http.get('/api/entries')
    const list = unwrapList<ApiTimeEntry>(res)
    setEntries(list)
    return list
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      http.get('/api/entries').catch((err: unknown) => err),
      http.get('/api/projects').catch((err: unknown) => err),
    ])
      .then(([e, p]) => {
        if (cancelled) return
        if (e instanceof Error) setError(e.message)
        else setEntries(unwrapList<ApiTimeEntry>(e))
        if (!(p instanceof Error)) setProjects(unwrapList<ApiProject>(p))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, version, entriesVersion])

  const projectById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects])

  const filtered = useMemo(() => {
    if (filter === 'billable') return entries.filter((e) => e.is_billable)
    if (filter === 'non-billable') return entries.filter((e) => !e.is_billable)
    return entries
  }, [entries, filter])

  const grouped = useMemo(() => {
    const map = new Map<string, ApiTimeEntry[]>()
    for (const e of filtered) {
      const key = dateKey(e.started_at)
      const arr = map.get(key) ?? []
      arr.push(e)
      map.set(key, arr)
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filtered])

  const totalBillable = filtered
    .filter((e) => e.is_billable)
    .reduce((acc, e) => acc + (e.duration_seconds ?? 0), 0)
  const totalAll = filtered.reduce((acc, e) => acc + (e.duration_seconds ?? 0), 0)
  const totalRevenue = filtered
    .filter((e) => e.is_billable)
    .reduce((acc, e) => {
      const project = e.project_id ? projectById.get(e.project_id) : null
      const rate = project?.hourly_rate_cents ?? 0
      return acc + ((e.duration_seconds ?? 0) / 3600) * (rate / 100)
    }, 0)

  const filters: ReadonlyArray<{ key: Filter; label: string }> = [
    { key: 'all', label: t('status.all', {}, { defaultValue: 'All' }) },
    { key: 'billable', label: t('timeEntries.filter.billable', {}, { defaultValue: 'Billable' }) },
    {
      key: 'non-billable',
      label: t('timeEntries.filter.nonBillable', {}, { defaultValue: 'Non-billable' }),
    },
  ]

  const onDelete = async (id: string) => {
    try {
      await http.delete(`/api/entries/${id}`)
      void track({ name: 'entry.deleted', properties: { entry_id: id } })
      await reloadEntries()
      await refreshTimer()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  const onAdd = async () => {
    if (!form.date || !form.start_time || !form.end_time) return
    const started_at = isoForLocal(form.date, form.start_time)
    const ended_at = isoForLocal(form.date, form.end_time)
    if (!started_at || !ended_at || new Date(ended_at) <= new Date(started_at)) {
      setError(
        t('timeEntries.invalidRange', {}, { defaultValue: 'End time must be after start time.' }),
      )
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await http.post('/api/entries', {
        description: form.description,
        project_id: form.project_id || null,
        started_at,
        ended_at,
        is_billable: form.is_billable,
      })
      const created = unwrapSingle<{ id?: string }>(res)
      void track({
        name: 'entry.created',
        properties: {
          entry_id: created?.id ?? null,
          project_id: form.project_id || null,
          is_billable: form.is_billable,
          manual: true,
        },
      })
      setForm(defaultManualForm())
      setShowAdd(false)
      setVersion((n) => n + 1)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add entry')
    } finally {
      setSubmitting(false)
    }
  }

  const onExport = () => {
    const lines = ['date,description,project,started_at,ended_at,duration_seconds,billable']
    for (const e of filtered) {
      const project = e.project_id ? projectById.get(e.project_id) : null
      const cells = [
        new Date(e.started_at).toISOString().slice(0, 10),
        JSON.stringify(e.description ?? ''),
        JSON.stringify(project?.name ?? ''),
        e.started_at,
        e.ended_at ?? '',
        String(e.duration_seconds ?? ''),
        e.is_billable ? '1' : '0',
      ]
      lines.push(cells.join(','))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `time-entries-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const runningRow: RowEntry | null = running
    ? {
        id: running.id,
        description: running.description,
        projectName: running.project_id
          ? (projectById.get(running.project_id)?.name ?? null)
          : null,
        projectColor: running.project_id
          ? (projectById.get(running.project_id)?.color ?? null)
          : null,
        startLabel: formatTimeOfDay(running.started_at),
        endLabel: t('timeEntries.now', {}, { defaultValue: 'now' }),
        durationLabel: formatHms(elapsedSeconds),
        billable: running.is_billable,
      }
    : null

  return (
    <div
      className={cm.cn(cm.sp('p', 8), cm.stack(6), 'max-w-[1400px] mx-auto')}
      data-test="entries-page"
    >
      <section className={cm.flex({ justify: 'between', align: 'end', wrap: 'wrap' })}>
        <div className={cm.stack(2)}>
          <p className={cm.cn('text-[11px] uppercase tracking-widest font-bold text-blue-600')}>
            {t('timeEntries.eyebrow', {}, { defaultValue: 'Activity log' })}
          </p>
          <h1
            className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight text-foreground')}
          >
            {t('timeEntries.title', {}, { defaultValue: 'Time entries' })}
          </h1>
          <p className={cm.cn(cm.textSize('lg'), 'text-foreground-secondary')}>
            {t(
              'timeEntries.subtitle',
              {},
              { defaultValue: 'Every session tracked, grouped by day.' },
            )}
          </p>
        </div>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <button
            onClick={onExport}
            type="button"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 5),
              cm.sp('py', 2.5),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-xl bg-surface border border-border text-foreground hover:bg-surface-secondary transition-colors',
            )}
            data-test="export-csv"
          >
            <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
              file_download
            </span>
            {t('common.exportCsv', {}, { defaultValue: 'Export CSV' })}
          </button>
          <button
            onClick={() => setShowAdd((v) => !v)}
            type="button"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 5),
              cm.sp('py', 2.5),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'rounded-xl bg-gradient-to-br from-blue-600 to-emerald-500 text-white shadow-md hover:shadow-lg transition-all',
            )}
            data-test="add-entry-toggle"
          >
            <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>add</span>
            {t('timeEntries.addEntry', {}, { defaultValue: 'Add entry' })}
          </button>
        </div>
      </section>

      {error && (
        <p
          className={cm.cn(
            cm.sp('p', 3),
            cm.textSize('sm'),
            'text-error bg-rose-50 border border-rose-200 rounded-lg',
          )}
          data-test="entries-error"
        >
          {error}
        </p>
      )}

      {showAdd && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void onAdd()
          }}
          className={cm.cn(
            cm.sp('p', 6),
            cm.stack(4),
            'bg-surface rounded-2xl shadow-sm border border-border',
          )}
          data-test="add-entry-form"
        >
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-foreground')}>
            {t('timeEntries.addManual', {}, { defaultValue: 'Add manual entry' })}
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
                {t('form.description', {}, { defaultValue: 'Description' })}
              </span>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30',
                )}
                data-test="add-entry-description"
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
                {t('timeEntries.projectLabel', {}, { defaultValue: 'Project' })}
              </span>
              <select
                value={form.project_id}
                onChange={(e) => setForm((f) => ({ ...f, project_id: e.target.value }))}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30',
                )}
                data-test="add-entry-project"
              >
                <option value="">
                  {t('timeEntries.noProject', {}, { defaultValue: 'No project' })}
                </option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
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
                {t('form.date', {}, { defaultValue: 'Date' })}
              </span>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className={cm.cn(cm.sp('px', 3), cm.sp('py', 2), 'border border-border rounded-lg')}
                data-test="add-entry-date"
              />
            </label>
            <div className={cm.cn('grid grid-cols-2 gap-2')}>
              <label className={cm.stack(1)}>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest text-foreground-secondary',
                  )}
                >
                  {t('common.start', {}, { defaultValue: 'Start' })}
                </span>
                <input
                  type="time"
                  value={form.start_time}
                  onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'border border-border rounded-lg',
                  )}
                  data-test="add-entry-start"
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
                  {t('timeEntries.endLabel', {}, { defaultValue: 'End' })}
                </span>
                <input
                  type="time"
                  value={form.end_time}
                  onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'border border-border rounded-lg',
                  )}
                  data-test="add-entry-end"
                />
              </label>
            </div>
          </div>
          <label className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
            <input
              type="checkbox"
              checked={form.is_billable}
              onChange={(e) => setForm((f) => ({ ...f, is_billable: e.target.checked }))}
              data-test="add-entry-billable"
            />
            <span className={cm.cn(cm.textSize('sm'), 'text-foreground')}>
              {t('timeEntries.billableLabel', {}, { defaultValue: 'Billable time' })}
            </span>
          </label>
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
              data-test="add-entry-submit"
            >
              {submitting
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('timeEntries.save', {}, { defaultValue: 'Save entry' })}
            </button>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
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

      <section className={cm.cn('grid grid-cols-1 sm:grid-cols-3 gap-4')}>
        <SummaryCell
          label={t('timeEntries.summary.total', {}, { defaultValue: 'Total tracked' })}
          value={formatHourMinute(totalAll)}
          accent="emerald"
          testId="summary-total"
        />
        <SummaryCell
          label={t('timeEntries.summary.billable', {}, { defaultValue: 'Billable' })}
          value={formatHourMinute(totalBillable)}
          accent="violet"
          testId="summary-billable"
        />
        <SummaryCell
          label={t('timeEntries.summary.revenue', {}, { defaultValue: 'Estimated revenue' })}
          value={`$${totalRevenue.toFixed(0)}`}
          accent="primary"
          testId="summary-revenue"
        />
      </section>

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
            data-test={`filter-${f.key}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {runningRow && (
        <section
          className={cm.cn(
            'bg-success-light rounded-2xl border border-emerald-200/60 overflow-hidden',
          )}
          data-test="entries-running"
        >
          <div className={cm.cn(cm.sp('px', 6), cm.sp('py', 3), 'border-b border-emerald-200/60')}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-success',
              )}
            >
              {t('timeEntries.runningHeader', {}, { defaultValue: 'Running now' })}
            </span>
          </div>
          <TimeEntryRow entry={runningRow} />
        </section>
      )}

      <section className={cm.cn('bg-surface rounded-2xl shadow-sm overflow-hidden')}>
        {loading ? (
          <p
            className={cm.cn(
              cm.sp('p', 12),
              cm.textCenter,
              cm.textSize('sm'),
              'text-foreground-secondary',
            )}
          >
            {t('timeEntries.loading', {}, { defaultValue: 'Loading entries…' })}
          </p>
        ) : grouped.length === 0 ? (
          <p
            className={cm.cn(
              cm.sp('p', 12),
              cm.textCenter,
              cm.textSize('sm'),
              'text-foreground-secondary',
            )}
            data-test="entries-empty"
          >
            {t(
              'timeEntries.empty',
              {},
              { defaultValue: 'No entries yet. Start the timer or add one manually.' },
            )}
          </p>
        ) : (
          grouped.map(([key, dayEntries]) => {
            const dayTotal = dayEntries.reduce((acc, e) => acc + (e.duration_seconds ?? 0), 0)
            return (
              <div key={key}>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('px', 6),
                    cm.sp('py', 3),
                    'bg-surface-secondary border-y border-border',
                  )}
                >
                  <span
                    className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-foreground')}
                  >
                    {formatRelativeDay(key)}
                  </span>
                  <span
                    className={cm.cn(
                      cm.textSize('sm'),
                      'tabular-nums font-mono font-bold text-foreground',
                    )}
                  >
                    {formatHourMinute(dayTotal)}
                  </span>
                </div>
                <div className={cm.cn('divide-y divide-border')}>
                  {dayEntries.map((e) => {
                    const project = e.project_id ? projectById.get(e.project_id) : null
                    const row: RowEntry = {
                      id: e.id,
                      description: e.description,
                      projectName: project?.name ?? null,
                      projectColor: project?.color ?? null,
                      startLabel: formatTimeOfDay(e.started_at),
                      endLabel: e.ended_at
                        ? formatTimeOfDay(e.ended_at)
                        : t('timeEntries.now', {}, { defaultValue: 'now' }),
                      durationLabel: formatHms(e.duration_seconds ?? 0),
                      billable: e.is_billable,
                    }
                    return <TimeEntryRow key={e.id} entry={row} onDelete={onDelete} />
                  })}
                </div>
              </div>
            )
          })
        )}
      </section>
    </div>
  )
}

function SummaryCell({
  label,
  value,
  accent,
  testId,
}: {
  label: string
  value: string
  accent: 'primary' | 'emerald' | 'violet'
  testId?: string
}) {
  const cm = getClassMap()
  // The accent color: the inset bar and the label (DESIGN.md → "Accent bars").
  const tone =
    accent === 'emerald'
      ? 'var(--color-emerald-500)'
      : accent === 'violet'
        ? 'var(--color-violet-500)'
        : 'var(--color-blue-500)'
  return (
    <div
      className={cm.cn(
        cm.sp('p', 5),
        cm.accentCard({ tone: 'custom' }),
        'bg-surface rounded-xl shadow-sm',
      )}
      style={{ ['--mol-accent' as string]: tone }}
      data-test={testId}
    >
      <p className={cm.accentCardLabel({ tone: 'custom' })}>{label}</p>
      <p
        className={cm.cn(
          cm.textSize('2xl'),
          'font-extrabold tabular-nums font-mono text-foreground mt-1',
        )}
      >
        {value}
      </p>
    </div>
  )
}

export default TimeEntries
export { TimeEntries as TimeEntriesPage }
