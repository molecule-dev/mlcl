import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ProjectNav } from '../components/ProjectNav.js'
import { dayKeyOffset, formatDateLong, labelize } from '../lib/format.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface LogEntry {
  id: string
  area: string
  work_performed: string
}

interface DailyLog {
  id: string
  project_id: string
  project: string
  log_date: string
  weather: string
  crew_count: number
  hours: number
  notes: string
  entries: LogEntry[]
}

const WEATHER = [
  'sunny',
  'partly_cloudy',
  'cloudy',
  'rain',
  'snow',
  'wind',
  'extreme_heat',
  'extreme_cold',
] as const

export function DailyLogs() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { projectId } = useParams<{ projectId: string }>()
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Create form
  const [showForm, setShowForm] = useState(false)
  const [logDate, setLogDate] = useState(dayKeyOffset(0))
  const [weather, setWeather] = useState<string>('sunny')
  const [crewCount, setCrewCount] = useState('')
  const [hours, setHours] = useState('')
  const [notes, setNotes] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Entry form (per selected log)
  const [entryLogId, setEntryLogId] = useState<string | null>(null)
  const [entryArea, setEntryArea] = useState('')
  const [entryWork, setEntryWork] = useState('')

  useEffect(() => {
    let cancelled = false
    if (!projectId) return
    setLoading(true)
    http
      .get(`/api/daily-logs?project_id=${projectId}`)
      .then((res) => {
        if (!cancelled) setLogs(unwrapList<DailyLog>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('dailyLogs.loadError', {}, { defaultValue: 'Failed to load daily logs.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, projectId, t])

  async function handleCreate(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!projectId) return
    setSaving(true)
    setFormError(null)
    try {
      const res = await http.post('/api/daily-logs', {
        project_id: projectId,
        log_date: logDate,
        weather,
        crew_count: crewCount ? Number(crewCount) : 0,
        hours: hours ? Number(hours) : 0,
        notes,
      })
      const created = (res as unknown as { data?: DailyLog }).data
      if (created) setLogs((prev) => [created, ...prev])
      setShowForm(false)
      setNotes('')
      setCrewCount('')
      setHours('')
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : t('dailyLogs.createError', {}, { defaultValue: 'Failed to file the daily log.' }),
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleAddEntry(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!entryLogId) return
    try {
      await http.post(`/api/daily-logs/${entryLogId}/entries`, {
        area: entryArea,
        work_performed: entryWork,
      })
      const refreshed = await http.get(`/api/daily-logs/${entryLogId}`)
      const fresh = unwrapSingle<DailyLog>(refreshed)
      if (fresh) setLogs((prev) => prev.map((l) => (l.id === entryLogId ? fresh : l)))
      setEntryLogId(null)
      setEntryArea('')
      setEntryWork('')
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : t('dailyLogs.entryError', {}, { defaultValue: 'Failed to add the entry.' }),
      )
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, 'space-y-6')}>
      <header className={cm.flex({ align: 'center', justify: 'between' })}>
        <div>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
            {t('dailyLogs.heading', {}, { defaultValue: 'Daily logs' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'dailyLogs.subheading',
              { count: logs.length },
              { defaultValue: '{{count}} logs on file' },
            )}
          </p>
        </div>
        <button
          type="button"
          data-mol-id="daily-logs-new-button"
          onClick={() => setShowForm((v) => !v)}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'rounded-md brand-gradient text-on-primary',
          )}
        >
          {showForm
            ? t('dailyLogs.cancelNew', {}, { defaultValue: 'Cancel' })
            : t('dailyLogs.newButton', {}, { defaultValue: "File today's log" })}
        </button>
      </header>

      <ProjectNav projectId={projectId ?? ''} />

      {showForm && (
        <form
          data-mol-id="daily-logs-new-form"
          onSubmit={handleCreate}
          className={cm.cn(cm.card(), cm.sp('p', 6), 'space-y-4')}
        >
          <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'md:grid-cols-4')}>
            <label className={'block space-y-1'}>
              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                {t('dailyLogs.field.date', {}, { defaultValue: 'Date' })}
              </span>
              <input
                type="date"
                required
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                data-mol-id="daily-logs-field-date"
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'border border-outline-variant rounded-md bg-surface',
                )}
              />
            </label>
            <label className={'block space-y-1'}>
              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                {t('dailyLogs.field.weather', {}, { defaultValue: 'Weather' })}
              </span>
              <select
                value={weather}
                onChange={(e) => setWeather(e.target.value)}
                data-mol-id="daily-logs-field-weather"
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'border border-outline-variant rounded-md bg-surface',
                )}
              >
                {WEATHER.map((w) => (
                  <option key={w} value={w}>
                    {t(`dailyLogs.weather.${w}`, {}, { defaultValue: labelize(w) })}
                  </option>
                ))}
              </select>
            </label>
            <label className={'block space-y-1'}>
              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                {t('dailyLogs.field.crew', {}, { defaultValue: 'Crew on site' })}
              </span>
              <input
                type="number"
                min="0"
                value={crewCount}
                onChange={(e) => setCrewCount(e.target.value)}
                data-mol-id="daily-logs-field-crew"
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'border border-outline-variant rounded-md bg-surface',
                )}
                placeholder="24"
              />
            </label>
            <label className={'block space-y-1'}>
              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                {t('dailyLogs.field.hours', {}, { defaultValue: 'Hours worked' })}
              </span>
              <input
                type="number"
                min="0"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                data-mol-id="daily-logs-field-hours"
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'border border-outline-variant rounded-md bg-surface',
                )}
                placeholder="192"
              />
            </label>
          </div>
          <label className={'block space-y-1'}>
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
              {t('dailyLogs.field.notes', {}, { defaultValue: 'Delays / notes' })}
            </span>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              data-mol-id="daily-logs-field-notes"
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'border border-outline-variant rounded-md bg-surface',
              )}
            />
          </label>
          {formError && (
            <p className={cm.cn(cm.textSize('sm'), 'text-error')} role="alert">
              {formError}
            </p>
          )}
          <button
            type="submit"
            disabled={saving}
            data-mol-id="daily-logs-create-submit"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'rounded-md brand-gradient text-on-primary disabled:opacity-50',
            )}
          >
            {saving
              ? t('dailyLogs.saving', {}, { defaultValue: 'Filing…' })
              : t('dailyLogs.submit', {}, { defaultValue: 'File log' })}
          </button>
        </form>
      )}

      {error ? (
        <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loading', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : logs.length === 0 ? (
        <p className={cm.cn(cm.card(), cm.sp('p', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t('dailyLogs.empty', {}, { defaultValue: 'No logs yet — file the first daily log.' })}
        </p>
      ) : (
        <div className={'space-y-5'}>
          {logs.map((log) => (
            <article
              key={log.id}
              data-mol-id={`daily-log-${log.id}`}
              className={cm.cn(cm.card(), cm.sp('p', 6))}
            >
              <div
                className={cm.flex({
                  align: 'center',
                  justify: 'between',
                  gap: 'md',
                  wrap: 'wrap',
                })}
              >
                <div>
                  <h2 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                    {formatDateLong(log.log_date)}
                  </h2>
                  <p
                    className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-on-surface-variant')}
                  >
                    {t(
                      `dailyLogs.weather.${log.weather}`,
                      {},
                      { defaultValue: labelize(log.weather) },
                    )}{' '}
                    ·{' '}
                    {t(
                      'dailyLogs.crew',
                      { count: log.crew_count },
                      { defaultValue: '{{count}} on site' },
                    )}{' '}
                    ·{' '}
                    {t(
                      'dailyLogs.hours',
                      { hours: log.hours },
                      { defaultValue: '{{hours}} hours worked' },
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  data-mol-id={`daily-log-add-entry-${log.id}`}
                  onClick={() => setEntryLogId(entryLogId === log.id ? null : log.id)}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 1.5),
                    cm.textSize('xs'),
                    cm.fontWeight('medium'),
                    'rounded-md border border-outline-variant hover:bg-surface-container',
                  )}
                >
                  {t('dailyLogs.addEntry', {}, { defaultValue: '+ Work entry' })}
                </button>
              </div>

              {log.notes ? (
                <p
                  className={cm.cn(
                    cm.sp('mt', 3),
                    cm.textSize('sm'),
                    'text-on-surface-variant',
                    'italic',
                  )}
                >
                  {log.notes}
                </p>
              ) : null}

              {entryLogId === log.id && (
                <form onSubmit={handleAddEntry} className={cm.cn(cm.sp('mt', 4), 'space-y-3')}>
                  <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'md:grid-cols-3')}>
                    <label className={'block space-y-1'}>
                      <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
                        {t('dailyLogs.entry.area', {}, { defaultValue: 'Area / grid location' })}
                      </span>
                      <input
                        required
                        value={entryArea}
                        onChange={(e) => setEntryArea(e.target.value)}
                        data-mol-id="daily-logs-entry-area"
                        className={cm.cn(
                          cm.w('full'),
                          cm.sp('px', 3),
                          cm.sp('py', 2),
                          cm.textSize('sm'),
                          'border border-outline-variant rounded-md bg-surface',
                        )}
                        placeholder={t(
                          'dailyLogs.entry.areaPlaceholder',
                          {},
                          { defaultValue: 'Level 2 — Grid C4' },
                        )}
                      />
                    </label>
                    <label className={cm.cn('block space-y-1 md:col-span-2')}>
                      <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
                        {t('dailyLogs.entry.work', {}, { defaultValue: 'Work performed' })}
                      </span>
                      <input
                        required
                        value={entryWork}
                        onChange={(e) => setEntryWork(e.target.value)}
                        data-mol-id="daily-logs-entry-work"
                        className={cm.cn(
                          cm.w('full'),
                          cm.sp('px', 3),
                          cm.sp('py', 2),
                          cm.textSize('sm'),
                          'border border-outline-variant rounded-md bg-surface',
                        )}
                      />
                    </label>
                  </div>
                  <button
                    type="submit"
                    data-mol-id="daily-logs-entry-submit"
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      'rounded-md brand-gradient text-on-primary',
                    )}
                  >
                    {t('dailyLogs.entry.submit', {}, { defaultValue: 'Add entry' })}
                  </button>
                </form>
              )}

              {log.entries.length > 0 && (
                <ul className={cm.cn(cm.sp('mt', 4), 'divide-y divide-outline-variant')}>
                  {log.entries.map((entry) => (
                    <li key={entry.id} className={cm.cn(cm.flex({ gap: 'md' }), 'py-3')}>
                      <span
                        className={cm.cn(
                          cm.textSize('xs'),
                          cm.fontWeight('semibold'),
                          'text-primary whitespace-nowrap pt-0.5',
                        )}
                      >
                        {entry.area}
                      </span>
                      <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                        {entry.work_performed}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      )}

      <p>
        <Link
          to={projectId ? `/projects/${projectId}` : '/projects'}
          className={cm.cn(cm.textSize('sm'), 'text-primary hover:underline')}
        >
          {t('project.backToOverview', {}, { defaultValue: '← Back to project overview' })}
        </Link>
      </p>
    </div>
  )
}

export default DailyLogs
