import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { dayKey, formatTime, startOfWeek } from '../lib/format.js'
import { unwrapList } from '../lib/unwrap.js'

interface Technician {
  id: string
  name: string
  trade: string
  active: boolean
  active_jobs: number
}

interface Job {
  id: string
  customer: string
  title: string
  status: string
  scheduled_start: string | null
  scheduled_end: string | null
  technician_id: string | null
}

/** Assign UI state — the job currently picked for dispatch. */
interface PickedJob extends Job {
  technician: string | null
}

const STATUS_DOT: Record<string, string> = {
  scheduled: 'bg-info',
  en_route: 'bg-warning',
  in_progress: 'bg-primary',
  completed: 'bg-success',
  cancelled: 'bg-surface-variant',
}

export function Dispatch() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [weekOffset, setWeekOffset] = useState(0)
  const [pickedJobId, setPickedJobId] = useState<string | null>(null)
  const [assignTechId, setAssignTechId] = useState('')
  const [assignDay, setAssignDay] = useState('')
  const [assignTime, setAssignTime] = useState('09:00')
  const [acting, setActing] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get('/api/technicians').then((r) => unwrapList<Technician>(r)),
      http.get('/api/jobs').then((r) => unwrapList<Job>(r)),
    ])
      .then(([techs, js]) => {
        if (cancelled) return
        setTechnicians(techs)
        setJobs(js)
        setError(null)
      })
      .catch(() => {
        if (!cancelled)
          setError(t('dispatch.loadError', {}, { defaultValue: 'Failed to load the board.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const weekStart = useMemo(() => {
    const base = startOfWeek()
    base.setDate(base.getDate() + weekOffset * 7)
    return base
  }, [weekOffset])

  const dayColumns = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      return {
        key: dayKey(d.toISOString()),
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        date: d.getDate(),
        isToday: dayKey(new Date().toISOString()) === dayKey(d.toISOString()),
      }
    })
  }, [weekStart])

  const activeTechs = useMemo(() => technicians.filter((x) => x.active), [technicians])

  const scheduledJobs = useMemo(
    () => jobs.filter((j) => j.status !== 'cancelled' && j.scheduled_start),
    [jobs],
  )

  /** Jobs with no technician and not yet done — the dispatch queue. */
  const unassigned = useMemo(
    () =>
      jobs.filter((j) => !j.technician_id && (j.status === 'scheduled' || j.status === 'en_route')),
    [jobs],
  )

  const pickedJob = useMemo<PickedJob | null>(() => {
    if (!pickedJobId) return null
    const found = jobs.find((j) => j.id === pickedJobId)
    if (!found) return null
    return {
      ...found,
      technician: technicians.find((x) => x.id === found.technician_id)?.name ?? null,
    }
  }, [pickedJobId, jobs, technicians])

  function jobsForCell(techId: string, day: string): Job[] {
    return scheduledJobs
      .filter((j) => j.technician_id === techId && dayKey(j.scheduled_start) === day)
      .sort((a, b) => (a.scheduled_start ?? '').localeCompare(b.scheduled_start ?? ''))
  }

  async function assignPicked() {
    if (!pickedJob || acting) return
    if (!assignTechId || !assignDay) {
      setActionError(
        t('dispatch.pickTechAndDay', {}, { defaultValue: 'Pick a technician and a day.' }),
      )
      return
    }
    setActing(true)
    setActionError(null)
    try {
      const start = new Date(`${assignDay}T${assignTime || '09:00'}:00`)
      const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)
      await http.post(`/api/jobs/${pickedJob.id}/assign`, {
        technician_id: assignTechId,
        scheduled_start: start.toISOString(),
        scheduled_end: end.toISOString(),
      })
      track({
        name: 'job.scheduled',
        properties: { job_id: pickedJob.id, technician_id: assignTechId, day: assignDay },
      })
      setPickedJobId(null)
      setAssignTechId('')
      setAssignDay('')
      const refreshed = await http.get('/api/jobs')
      setJobs(unwrapList<Job>(refreshed))
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err))
    } finally {
      setActing(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, 'space-y-6')}>
      <header
        className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' }))}
      >
        <div>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
            {t('dispatch.heading', {}, { defaultValue: 'Dispatch board' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'dispatch.subheading',
              { unassigned: unassigned.length },
              { defaultValue: '{{unassigned}} jobs waiting for a technician' },
            )}
          </p>
        </div>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <button
            type="button"
            onClick={() => setWeekOffset((w) => w - 1)}
            aria-label={t('dispatch.prevWeek', {}, { defaultValue: 'Previous week' })}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'border border-outline-variant rounded-md',
            )}
          >
            ←
          </button>
          <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'px-2')}>
            {t(
              'dispatch.weekOf',
              { date: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) },
              { defaultValue: 'Week of {{date}}' },
            )}
          </span>
          <button
            type="button"
            onClick={() => setWeekOffset((w) => w + 1)}
            aria-label={t('dispatch.nextWeek', {}, { defaultValue: 'Next week' })}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'border border-outline-variant rounded-md',
            )}
          >
            →
          </button>
        </div>
      </header>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('dispatch.loading', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : (
        <>
          <section className={cm.cn(cm.card(), cm.sp('p', 5), cm.stack(3))}>
            <h2 className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
              {t('dispatch.queueHeading', {}, { defaultValue: 'Waiting for a technician' })}
            </h2>
            {unassigned.length === 0 ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t('dispatch.queueEmpty', {}, { defaultValue: 'Everything is covered.' })}
              </p>
            ) : (
              <ul className={cm.flex({ gap: 'sm', wrap: 'wrap' })}>
                {unassigned.map((j) => (
                  <li key={j.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setPickedJobId(pickedJobId === j.id ? null : j.id)
                        setActionError(null)
                      }}
                      aria-pressed={pickedJobId === j.id}
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 2),
                        cm.textSize('sm'),
                        'rounded-md border text-left',
                        pickedJobId === j.id
                          ? 'border-primary bg-primary-container text-on-primary-container'
                          : 'border-outline-variant hover:bg-surface-container',
                      )}
                    >
                      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                        {j.title}
                      </span>
                      <span className={cm.cn(cm.textSize('xs'), 'block text-on-surface-variant')}>
                        {j.customer}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {pickedJob ? (
              <div className={cm.cn(cm.stack(3), 'border-t border-outline-variant pt-3')}>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    'dispatch.assignPrompt',
                    {},
                    { defaultValue: 'Assign a technician and a day for' },
                  )}{' '}
                  <strong>{pickedJob.title}</strong>
                  {pickedJob.technician
                    ? t(
                        'dispatch.reassigning',
                        { name: pickedJob.technician },
                        { defaultValue: ' (currently {{name}})' },
                      )
                    : ''}
                </p>
                <div className={cm.grid({ cols: 4, gap: 'md' })}>
                  <label className={cm.stack(1)}>
                    <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {t('jobs.detail.technician', {}, { defaultValue: 'Technician' })}
                    </span>
                    <select
                      value={assignTechId}
                      onChange={(e) => setAssignTechId(e.target.value)}
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 2),
                        cm.textSize('sm'),
                        'border border-outline-variant rounded-md w-full',
                      )}
                    >
                      <option value="">
                        {t('quotes.form.pickCustomer', {}, { defaultValue: 'Pick…' })}
                      </option>
                      {activeTechs.map((tech) => (
                        <option key={tech.id} value={tech.id}>
                          {tech.name} · {tech.trade} · {tech.active_jobs}{' '}
                          {t('technicians.openJobs', {}, { defaultValue: 'open' })}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={cm.stack(1)}>
                    <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {t('form.day', {}, { defaultValue: 'Day' })}
                    </span>
                    <select
                      value={assignDay}
                      onChange={(e) => setAssignDay(e.target.value)}
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 2),
                        cm.textSize('sm'),
                        'border border-outline-variant rounded-md w-full',
                      )}
                    >
                      <option value="">
                        {t('quotes.form.pickCustomer', {}, { defaultValue: 'Pick…' })}
                      </option>
                      {dayColumns.map((d) => (
                        <option key={d.key} value={d.key}>
                          {d.label} {d.date}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={cm.stack(1)}>
                    <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {t('form.time', {}, { defaultValue: 'Start time' })}
                    </span>
                    <input
                      type="time"
                      value={assignTime}
                      onChange={(e) => setAssignTime(e.target.value)}
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 2),
                        cm.textSize('sm'),
                        'border border-outline-variant rounded-md w-full',
                      )}
                    />
                  </label>
                  <div className={cm.flex({ align: 'end' })}>
                    <button
                      type="button"
                      disabled={acting}
                      onClick={assignPicked}
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 2),
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        'bg-primary text-on-primary rounded-md disabled:opacity-50',
                      )}
                    >
                      {acting
                        ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                        : t('dispatch.assign', {}, { defaultValue: 'Schedule' })}
                    </button>
                  </div>
                </div>
                {actionError ? (
                  <p className={'text-error text-sm'} role="alert">
                    {actionError}
                  </p>
                ) : null}
              </div>
            ) : null}
          </section>

          <div className={cm.cn(cm.card(), 'overflow-x-auto')}>
            <table className={'w-full text-left text-sm border-collapse'}>
              <thead>
                <tr className={'border-b border-outline-variant'}>
                  <th
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                      'text-on-surface-variant uppercase tracking-wider sticky left-0 bg-surface',
                    )}
                  >
                    {t('dispatch.col.technician', {}, { defaultValue: 'Technician' })}
                  </th>
                  {dayColumns.map((d) => (
                    <th
                      key={d.key}
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 3),
                        cm.textSize('xs'),
                        cm.fontWeight('semibold'),
                        'text-on-surface-variant uppercase tracking-wider text-center',
                        d.isToday ? 'bg-primary-container/40' : '',
                      )}
                    >
                      {d.label} {d.date}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeTechs.map((tech) => (
                  <tr key={tech.id} className={'border-b border-outline-variant align-top'}>
                    <td
                      className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'sticky left-0 bg-surface')}
                    >
                      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                        {tech.name}
                      </span>
                      <span className={cm.cn(cm.textSize('xs'), 'block text-on-surface-variant')}>
                        {tech.trade} · {tech.active_jobs}{' '}
                        {t('technicians.openJobs', {}, { defaultValue: 'open' })}
                      </span>
                    </td>
                    {dayColumns.map((d) => {
                      const cellJobs = jobsForCell(tech.id, d.key)
                      return (
                        <td
                          key={d.key}
                          className={cm.cn(
                            cm.sp('px', 2),
                            cm.sp('py', 2),
                            'align-top min-w-40',
                            d.isToday ? 'bg-primary-container/20' : '',
                          )}
                        >
                          {cellJobs.length === 0 ? (
                            <span
                              className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant/50')}
                            >
                              —
                            </span>
                          ) : (
                            <ul className={cm.stack(1)}>
                              {cellJobs.map((j) => (
                                <li key={j.id}>
                                  <Link
                                    to={`/jobs/${j.id}`}
                                    className={cm.cn(
                                      cm.sp('px', 2),
                                      cm.sp('py', 1),
                                      'block rounded border border-outline-variant/60 hover:bg-surface-container',
                                    )}
                                  >
                                    <span
                                      className={cm.cn(
                                        cm.textSize('xs'),
                                        'font-mono text-on-surface-variant',
                                      )}
                                    >
                                      {formatTime(j.scheduled_start)}
                                    </span>
                                    <span
                                      className={cm.cn(
                                        cm.textSize('xs'),
                                        'block font-medium truncate',
                                      )}
                                    >
                                      <span
                                        className={cm.cn(
                                          'inline-block h-2 w-2 rounded-full mr-1',
                                          STATUS_DOT[j.status] ?? 'bg-surface-variant',
                                        )}
                                        aria-hidden="true"
                                      />
                                      {j.title}
                                    </span>
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
