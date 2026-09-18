import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { SURFACE_PANEL } from '../branding.js'
import { LatencySparkline } from '../components/LatencySparkline.js'
import { MetricStatCard } from '../components/MetricStatCard.js'
import { StatusPill } from '../components/StatusPill.js'

const PANEL_BORDER = 'var(--color-border)'

interface MonitorRow {
  id: string
  name?: string
  test_id?: string | null
  cron_schedule?: string
  is_active?: boolean
  last_run_at?: string | null
  last_status?: string | null
  success_rate_24h?: number | null
  p95_latency_ms?: number | null
}

interface TestRow {
  id: string
  name?: string
  request_id?: string | null
}

type Status = 'healthy' | 'degraded' | 'down' | 'idle'

function statusOf(monitor: MonitorRow): Status {
  if (monitor.last_status === 'failed') return 'down'
  const rate = monitor.success_rate_24h ?? null
  if (rate == null) return monitor.is_active ? 'idle' : 'down'
  if (rate >= 99.5) return 'healthy'
  if (rate >= 95) return 'degraded'
  return 'down'
}

function spark(monitor: MonitorRow): number[] {
  const base = monitor.p95_latency_ms ?? 0
  if (!base) return [0, 0, 0, 0, 0, 0, 0, 0]
  const trend: number[] = []
  for (let i = 0; i < 12; i++) {
    const wobble = ((i * 7) % 11) - 5
    trend.push(Math.max(0, base + wobble * (base / 25)))
  }
  return trend
}

function toneFor(status: Status): {
  badge: 'healthy' | 'degraded' | 'down' | 'pending'
  spark: string
} {
  if (status === 'healthy') return { badge: 'healthy', spark: 'var(--color-success)' }
  if (status === 'degraded') return { badge: 'degraded', spark: 'var(--color-warning)' }
  if (status === 'idle') return { badge: 'pending', spark: 'var(--color-text-muted)' }
  return { badge: 'down', spark: 'var(--color-error)' }
}

export function Monitors() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [monitors, setMonitors] = useState<MonitorRow[] | null>(null)
  const [tests, setTests] = useState<TestRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [runMessage, setRunMessage] = useState<string | null>(null)

  const load = async () => {
    try {
      const [monitorsRes, testsRes] = await Promise.all([
        http.get<MonitorRow[]>('/api/monitors'),
        http.get<TestRow[]>('/api/tests'),
      ])
      setMonitors(Array.isArray(monitorsRes.data) ? monitorsRes.data : [])
      setTests(Array.isArray(testsRes.data) ? testsRes.data : [])
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('monitors.fetchError', {}, { defaultValue: 'Could not load monitors.' }),
      )
      setMonitors([])
    }
  }

  useEffect(() => {
    let cancelled = false
    load().then(() => {
      if (cancelled) return
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleNew = async () => {
    if (creating) return
    setCreating(true)
    try {
      const defaultName = t(
        'monitors.defaultName',
        { n: (monitors?.length ?? 0) + 1 },
        { defaultValue: 'Untitled monitor {{n}}' },
      )
      await http.post('/api/monitors', {
        name: defaultName,
        cron_schedule: '0 * * * *',
        is_active: false,
      })
      await load()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('monitors.createError', {}, { defaultValue: 'Could not create monitor.' }),
      )
    } finally {
      setCreating(false)
    }
  }

  const bindTest = async (monitor: MonitorRow, testId: string | null) => {
    if (busyId) return
    setBusyId(monitor.id)
    try {
      await http.put(`/api/monitors/${monitor.id}`, {
        test_id: testId,
        is_active: testId ? true : false,
      })
      await load()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('monitors.updateError', {}, { defaultValue: 'Could not update monitor.' }),
      )
    } finally {
      setBusyId(null)
    }
  }

  const runMonitor = async (monitor: MonitorRow) => {
    if (busyId) return
    setBusyId(monitor.id)
    setRunMessage(null)
    try {
      const res = await http.post<{
        status?: string
        statusCode?: number
        durationMs?: number
        networkError?: string | null
      }>(`/api/monitors/${monitor.id}/run`, {})
      const data = res.data ?? {}
      if (data.networkError) {
        setRunMessage(
          t(
            'monitors.runError',
            { error: data.networkError },
            { defaultValue: 'Run finished with a network error: {{error}}' },
          ),
        )
      } else {
        setRunMessage(
          t(
            'monitors.runSuccess',
            {
              status: data.status ?? 'unknown',
              code: data.statusCode ?? 0,
              ms: data.durationMs ?? 0,
            },
            {
              defaultValue: 'Run {{status}} — upstream returned {{code}} in {{ms}}ms.',
            },
          ),
        )
      }
      await load()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : // Its own key: `monitors.runError` is the network-error message and its
            // translations carry `{{error}}`. Reusing it here with no values made
            // all 77 languages render the literal text `{{error}}`.
            t('monitors.runFailed', {}, { defaultValue: 'Run failed.' }),
      )
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (monitor: MonitorRow) => {
    if (busyId) return
    setBusyId(monitor.id)
    try {
      await http.delete(`/api/monitors/${monitor.id}`)
      await load()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('monitors.deleteError', {}, { defaultValue: 'Could not delete monitor.' }),
      )
    } finally {
      setBusyId(null)
    }
  }

  const list = monitors ?? []
  const healthy = list.filter((m) => statusOf(m) === 'healthy').length
  const degraded = list.filter((m) => statusOf(m) === 'degraded').length
  const down = list.filter((m) => statusOf(m) === 'down').length
  const avgUptime =
    list.length === 0
      ? 0
      : list.reduce((acc, m) => acc + (m.success_rate_24h ?? 0), 0) / list.length

  const eligibleTests = tests.filter((tst) => tst.request_id)

  return (
    <div className={cm.cn('p-6')}>
      <header className={cm.cn('flex items-start justify-between gap-6 flex-wrap mb-6')}>
        <div>
          <p
            className={cm.cn('font-mono text-xs font-bold uppercase tracking-widest mb-2')}
            style={{ color: 'var(--color-primary)' }}
          >
            {t('monitors.eyebrow', {}, { defaultValue: '$ pylon monitor --schedule' })}
          </p>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('monitors.heading', {}, { defaultValue: 'Monitors' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'monitors.subheading',
              {},
              {
                defaultValue:
                  'On-demand checks for any saved test. Bind a test, hit Run, and watch the 24-hour success rate update with every fire.',
              },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={handleNew}
          disabled={creating}
          className={cm.cn(
            'px-4 py-2 rounded-md font-mono text-xs font-extrabold uppercase tracking-widest transition-all hover:opacity-90 inline-flex items-center gap-2 disabled:opacity-60',
          )}
          style={{
            backgroundColor: 'var(--color-primary)',
            color: 'var(--color-on-primary)',
            boxShadow: '0 8px 22px -10px color-mix(in srgb, var(--color-primary) 60%, transparent)',
          }}
          data-mol-id="monitors-new"
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            add_alert
          </span>
          {creating
            ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
            : t('monitors.newMonitor', {}, { defaultValue: 'New monitor' })}
        </button>
      </header>

      {runMessage ? (
        <div
          role="status"
          className={cm.cn('mb-4 px-4 py-2 rounded-md font-mono text-xs')}
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-success) 10%, transparent)',
            color: 'var(--color-success)',
            border: '1px solid color-mix(in srgb, var(--color-success) 30%, transparent)',
          }}
          data-mol-id="monitors-run-message"
        >
          {runMessage}
        </div>
      ) : null}

      <section className={cm.cn('grid gap-4 grid-cols-2 md:grid-cols-4 mb-6')}>
        <MetricStatCard
          eyebrow={t('monitors.metric.uptime', {}, { defaultValue: 'Avg uptime' })}
          value={avgUptime.toFixed(2)}
          unit="%"
          icon="cloud_done"
          tone={avgUptime > 99.9 ? 'success' : avgUptime > 99 ? 'warning' : 'error'}
        />
        <MetricStatCard
          eyebrow={t('monitors.metric.healthy', {}, { defaultValue: 'Healthy' })}
          value={String(healthy)}
          icon="favorite"
          tone="success"
        />
        <MetricStatCard
          eyebrow={t('monitors.metric.degraded', {}, { defaultValue: 'Degraded' })}
          value={String(degraded)}
          icon="warning"
          tone={degraded > 0 ? 'warning' : 'neutral'}
        />
        <MetricStatCard
          eyebrow={t('monitors.metric.down', {}, { defaultValue: 'Down' })}
          value={String(down)}
          icon="error"
          tone={down > 0 ? 'error' : 'neutral'}
        />
      </section>

      {monitors === null ? (
        <p
          className={cm.cn('text-sm py-8 text-center')}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {t('monitors.loading', {}, { defaultValue: 'Loading monitors…' })}
        </p>
      ) : error ? (
        <p className={cm.cn('text-sm py-8 text-center')} style={{ color: 'var(--color-error)' }}>
          {error}
        </p>
      ) : monitors.length === 0 ? (
        <div
          className={cm.cn('py-16 text-center')}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <span
            className={cm.cn('material-symbols-outlined text-5xl opacity-40 mb-3 inline-block')}
            aria-hidden="true"
          >
            monitor_heart
          </span>
          <p className={cm.cn('text-sm')}>
            {t(
              'monitors.empty',
              {},
              { defaultValue: 'No monitors scheduled — click “New monitor” to add one.' },
            )}
          </p>
        </div>
      ) : (
        <ul className={cm.cn('space-y-3')}>
          {monitors.map((monitor) => {
            const status = statusOf(monitor)
            const tone = toneFor(status)
            const series = spark(monitor)
            const uptime = monitor.success_rate_24h ?? 0
            return (
              <li
                key={monitor.id}
                className={cm.cn(
                  'rounded-2xl overflow-hidden p-5 grid gap-5 grid-cols-1 md:grid-cols-[2fr_1fr_1fr_auto] items-center',
                )}
                style={{
                  backgroundColor: SURFACE_PANEL,
                  border: `1px solid ${PANEL_BORDER}`,
                  borderLeft: `4px solid ${tone.spark}`,
                }}
                data-mol-id={`monitor-row-${monitor.id}`}
              >
                <div className={cm.cn('flex flex-col gap-2 min-w-0')}>
                  <div className={cm.cn('flex items-center gap-3')}>
                    <h3
                      className={cm.cn('font-mono text-sm font-extrabold tracking-tight truncate')}
                      style={{ color: 'var(--color-text)' }}
                    >
                      {monitor.name ?? ''}
                    </h3>
                  </div>
                  <p
                    className={cm.cn('font-mono text-[11px]')}
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {monitor.cron_schedule ?? ''}
                    {monitor.is_active === false
                      ? ` · ${t('monitors.paused', {}, { defaultValue: 'paused' })}`
                      : ''}
                  </p>
                  <label
                    className={cm.cn('flex items-center gap-2')}
                    aria-label={t('monitors.boundTest', {}, { defaultValue: 'Bound test' })}
                  >
                    <span
                      className={cm.cn(
                        'font-mono text-[10px] font-black uppercase tracking-widest',
                      )}
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {t('monitors.bind', {}, { defaultValue: 'Test' })}
                    </span>
                    <select
                      value={monitor.test_id ?? ''}
                      onChange={(e) => bindTest(monitor, e.target.value || null)}
                      disabled={busyId === monitor.id}
                      className={cm.cn('font-mono text-xs rounded px-2 py-1')}
                      style={{
                        backgroundColor:
                          'color-mix(in srgb, var(--color-background) 60%, transparent)',
                        color: 'var(--color-text-primary)',
                        border: '1px solid color-mix(in srgb, var(--color-text) 12%, transparent)',
                      }}
                      data-mol-id={`monitor-bind-${monitor.id}`}
                    >
                      <option value="">
                        {t('monitors.unbound', {}, { defaultValue: '— pick a test —' })}
                      </option>
                      {eligibleTests.map((tst) => (
                        <option key={tst.id} value={tst.id}>
                          {tst.name ?? tst.id.slice(0, 8)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className={cm.cn('flex flex-col gap-2 items-start')}>
                  <span
                    className={cm.cn('text-[10px] font-black uppercase tracking-widest')}
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {t('monitors.uptime', {}, { defaultValue: 'Uptime · 24h' })}
                  </span>
                  <span
                    className={cm.cn('font-mono text-2xl font-extrabold tracking-tighter')}
                    style={{
                      color:
                        uptime > 99.9
                          ? 'var(--color-success)'
                          : uptime > 99
                            ? 'var(--color-warning)'
                            : 'var(--color-error)',
                    }}
                  >
                    {uptime.toFixed(2)}%
                  </span>
                </div>

                <div className={cm.cn('flex flex-col gap-1')}>
                  <span
                    className={cm.cn('text-[10px] font-black uppercase tracking-widest')}
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {t('monitors.latency', {}, { defaultValue: 'p95 latency' })}
                  </span>
                  <p
                    className={cm.cn('font-mono text-sm font-bold')}
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {monitor.p95_latency_ms ?? 0}ms
                  </p>
                  <LatencySparkline
                    values={series}
                    width={120}
                    height={28}
                    stroke={tone.spark}
                    ariaLabel={t('monitors.sparkLabel', {}, { defaultValue: 'Latency trend' })}
                  />
                </div>

                <div className={cm.cn('flex flex-col gap-2 items-end')}>
                  <StatusPill
                    status={tone.badge}
                    pulse={status === 'degraded' || status === 'down'}
                    emphasis
                  />
                  <div className={cm.cn('flex items-center gap-2')}>
                    <button
                      type="button"
                      onClick={() => runMonitor(monitor)}
                      disabled={busyId === monitor.id || !monitor.test_id}
                      className={cm.cn(
                        'px-3 py-1.5 rounded-md font-mono text-[11px] font-extrabold uppercase tracking-widest disabled:opacity-50',
                      )}
                      style={{
                        backgroundColor: 'var(--color-primary)',
                        color: 'var(--color-on-primary)',
                      }}
                      data-mol-id={`monitor-run-${monitor.id}`}
                    >
                      {busyId === monitor.id
                        ? t('monitors.running', {}, { defaultValue: 'Running…' })
                        : t('monitors.run', {}, { defaultValue: 'Run' })}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(monitor)}
                      disabled={busyId === monitor.id}
                      className={cm.cn(
                        'px-3 py-1.5 rounded-md font-mono text-[11px] font-bold uppercase tracking-widest border disabled:opacity-50',
                      )}
                      style={{
                        borderColor: 'color-mix(in srgb, var(--color-error) 35%, transparent)',
                        color: 'var(--color-error)',
                        backgroundColor: 'color-mix(in srgb, var(--color-error) 18%, transparent)',
                      }}
                      data-mol-id={`monitor-delete-${monitor.id}`}
                    >
                      {t('common.delete', {}, { defaultValue: 'Delete' })}
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
