import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BRAND_COLOR } from '../branding.js'
import { IncidentRow, type IncidentRowData } from '../components/IncidentRow.js'
import { type LogLine, LogLineRow } from '../components/LogLineRow.js'
import { LogVolumeSparkline } from '../components/LogVolumeSparkline.js'
import { MetricStatCard } from '../components/MetricStatCard.js'
import { unwrapList } from '../lib/unwrap.js'

interface SavedSearchSummary {
  id: string
  name: string
  query: string
  result_count: number
  last_run_at: string
}

const VOLUME_24H = [
  120, 145, 130, 160, 180, 210, 250, 280, 310, 340, 380, 420, 470, 510, 540, 590, 620, 640, 670,
  700, 720, 760, 790, 810,
]

const ERROR_VOLUME_24H = [
  4, 5, 3, 6, 8, 10, 12, 9, 7, 11, 14, 18, 22, 20, 16, 13, 15, 19, 24, 28, 30, 26, 22, 20,
]

function fmtRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [logs, setLogs] = useState<LogLine[]>([])
  const [incidents, setIncidents] = useState<IncidentRowData[]>([])
  const [saved, setSaved] = useState<SavedSearchSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([http.get('/api/logs'), http.get('/api/incidents'), http.get('/api/saved')])
      .then(([logsRes, incRes, savedRes]) => {
        if (cancelled) return
        setLogs(unwrapList<LogLine>(logsRes))
        setIncidents(unwrapList<IncidentRowData>(incRes))
        setSaved(unwrapList<SavedSearchSummary>(savedRes))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('dashboard.loadError', {}, { defaultValue: 'Failed to load dashboard data.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const counts = useMemo(() => {
    const total = logs.length
    const errors = logs.filter((l) => l.severity === 'error' || l.severity === 'fatal').length
    const warns = logs.filter((l) => l.severity === 'warn').length
    return { total, errors, warns }
  }, [logs])

  const activeIncidents = useMemo(
    () => incidents.filter((i) => i.resolved_at === null),
    [incidents],
  )

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <header className={cm.cn('flex items-start justify-between gap-6 flex-wrap mb-8')}>
        <div>
          <p
            className={cm.cn('font-mono text-xs font-bold uppercase tracking-widest mb-2')}
            style={{ color: BRAND_COLOR }}
          >
            {t('dashboard.eyebrow', {}, { defaultValue: '$ signalink dashboard --since=24h' })}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('3xl'),
              cm.fontWeight('bold'),
              'tracking-tight text-on-surface',
            )}
          >
            {t('dashboard.heading', {}, { defaultValue: 'Operations overview' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'dashboard.subheading',
              {},
              { defaultValue: 'Live signal across services, traces, and active incidents.' },
            )}
          </p>
        </div>
        <div
          className={cm.cn('inline-flex items-center gap-2 px-3 py-1.5 rounded-full')}
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-success) 10%, transparent)',
            border: '1px solid color-mix(in srgb, var(--color-success) 30%, transparent)',
          }}
        >
          <span
            className={cm.cn('h-2 w-2 rounded-full bg-success animate-pulse')}
            style={{
              boxShadow: '0 0 0 3px color-mix(in srgb, var(--color-success) 30%, transparent)',
            }}
            aria-hidden="true"
          />
          <span
            className={cm.cn(
              'font-mono text-[11px] font-extrabold uppercase tracking-widest text-success',
            )}
          >
            {t('dashboard.liveTail', {}, { defaultValue: 'live tail · 7 streams' })}
          </span>
        </div>
      </header>

      {/* Hero card — 24h volume gradient with mirror sparkline */}
      <section
        className={cm.cn('relative overflow-hidden rounded-[2rem] mb-8 p-6 md:p-8')}
        style={{
          backgroundImage:
            'linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 45%, transparent), color-mix(in srgb, var(--color-accent) 20%, transparent))',
          backgroundColor: 'var(--color-background-tertiary)',
          border: '1px solid var(--color-border)',
        }}
        data-mol-id="dashboard-hero"
      >
        <div
          className={cm.cn(
            'absolute -right-20 -bottom-20 h-72 w-72 rounded-full blur-3xl pointer-events-none',
          )}
          style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 45%, transparent)' }}
          aria-hidden="true"
        />
        <div
          className={cm.cn(
            'absolute -left-16 -top-16 h-56 w-56 rounded-full blur-3xl pointer-events-none',
          )}
          style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent) 30%, transparent)' }}
          aria-hidden="true"
        />
        <div className={cm.cn('relative grid grid-cols-1 lg:grid-cols-2 gap-6 items-end')}>
          <div>
            <p
              className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest mb-3')}
              style={{ color: 'var(--color-primary-light)' }}
            >
              {t('dashboard.totalVolumeLabel', {}, { defaultValue: 'Total log volume · last 24h' })}
            </p>
            <p
              className={cm.cn(
                'font-mono text-6xl md:text-7xl font-extrabold tracking-tighter text-on-surface',
              )}
            >
              28.4M
            </p>
            <span
              className={cm.cn(
                'inline-flex items-center gap-1 mt-3 px-3 py-1 rounded-full font-mono text-xs font-extrabold tracking-wider',
              )}
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-on-surface) 20%, transparent)',
                backdropFilter: 'blur(8px)',
                color: 'var(--color-primary-light)',
              }}
            >
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                trending_up
              </span>
              {t(
                'dashboard.deltaUp',
                { value: '+12.3%' },
                { defaultValue: '{{value}} vs yesterday' },
              )}
            </span>
            <p className={cm.cn('mt-3 text-sm text-on-surface-variant')}>
              {t(
                'dashboard.heroSubcopy',
                {},
                {
                  defaultValue:
                    'Aggregate ingest across 7 streams; live tail is on for prod and edge.',
                },
              )}
            </p>
          </div>
          <div className={cm.cn('flex justify-end')}>
            <LogVolumeSparkline
              values={VOLUME_24H}
              width={420}
              height={120}
              stroke="var(--color-primary)"
              fill="var(--color-primary)"
              strokeWidth={2.5}
              showLastDot={false}
              ariaLabel={t(
                'dashboard.volumeAria',
                {},
                { defaultValue: '24-hour log volume sparkline' },
              )}
            />
          </div>
        </div>
      </section>

      {/* KPI quad */}
      <section className={cm.cn('grid gap-4 grid-cols-2 md:grid-cols-4 mb-8')}>
        <MetricStatCard
          eyebrow={t('dashboard.metric.errors', {}, { defaultValue: 'Errors / 1h' })}
          value={(counts.errors * 412).toLocaleString()}
          icon="error"
          tone="error"
          changeLabel={t('dashboard.deltaUp', { value: '+18.2%' }, { defaultValue: '+18.2%' })}
          changeTone="error"
          sparkline={ERROR_VOLUME_24H}
          caption={t('dashboard.metric.errorsCaption', {}, { defaultValue: 'vs last 24h' })}
        />
        <MetricStatCard
          eyebrow={t('dashboard.metric.warns', {}, { defaultValue: 'Warnings / 1h' })}
          value={(counts.warns * 824).toLocaleString()}
          icon="warning"
          tone="warning"
          caption={t(
            'dashboard.metric.warnsCaption',
            {},
            { defaultValue: 'mostly billing webhooks' },
          )}
        />
        <MetricStatCard
          eyebrow={t('dashboard.metric.activeIncidents', {}, { defaultValue: 'Active incidents' })}
          value={String(activeIncidents.length)}
          icon="whatshot"
          tone="error"
          caption={t('dashboard.metric.activeCaption', {}, { defaultValue: 'pages on call' })}
        />
        <MetricStatCard
          eyebrow={t('dashboard.metric.p95', {}, { defaultValue: 'p95 latency' })}
          value="412"
          unit="ms"
          icon="speed"
          tone="primary"
          changeLabel={t('dashboard.deltaDown', { value: '-4.1%' }, { defaultValue: '-4.1%' })}
          changeTone="success"
          caption={t('dashboard.metric.p95Caption', {}, { defaultValue: 'vs last hour' })}
        />
      </section>

      {/* Two-column lists */}
      <div className={cm.cn('grid grid-cols-1 lg:grid-cols-3 gap-6')}>
        <section className={cm.cn('lg:col-span-2')}>
          <div className={cm.cn('flex items-end justify-between mb-3')}>
            <h2
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('dashboard.recentLogsHeading', {}, { defaultValue: 'Recent log lines' })}
            </h2>
            <Link
              to="/search"
              className={cm.cn('text-xs font-bold hover:underline')}
              style={{ color: BRAND_COLOR }}
            >
              {t('dashboard.openSearch', {}, { defaultValue: 'Open search →' })}
            </Link>
          </div>
          <div
            className={cm.cn('rounded-xl overflow-hidden')}
            style={{
              backgroundColor: 'var(--color-background)',
              border: '1px solid var(--color-border)',
            }}
          >
            {error ? (
              <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
            ) : loading ? (
              <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
                {t('dashboard.loading', {}, { defaultValue: 'Loading log stream…' })}
              </p>
            ) : logs.length === 0 ? (
              <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
                {t('dashboard.empty', {}, { defaultValue: 'No log lines in this window.' })}
              </p>
            ) : (
              logs.slice(0, 12).map((line) => <LogLineRow key={line.id} line={line} />)
            )}
          </div>
        </section>

        <aside className={cm.cn('space-y-6')}>
          <div>
            <h2
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-3',
              )}
            >
              {t('dashboard.activeIncidentsHeading', {}, { defaultValue: 'Active incidents' })}
            </h2>
            {activeIncidents.length === 0 ? (
              <p
                className={cm.cn(
                  'rounded-xl px-4 py-6 text-sm text-on-surface-variant text-center',
                )}
                style={{
                  backgroundColor: 'var(--color-surface-container)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {t(
                  'dashboard.noActiveIncidents',
                  {},
                  { defaultValue: 'No active incidents — go ship something.' },
                )}
              </p>
            ) : (
              <ul className={cm.cn('space-y-3')}>
                {activeIncidents.slice(0, 3).map((inc) => (
                  <li key={inc.id}>
                    <IncidentRow incident={inc} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h2
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-3',
              )}
            >
              {t('dashboard.savedSearchesHeading', {}, { defaultValue: 'Pinned searches' })}
            </h2>
            <ul className={cm.cn('space-y-2')}>
              {saved.slice(0, 4).map((s) => (
                <li key={s.id}>
                  <Link
                    to="/saved"
                    className={cm.cn(
                      'block rounded-xl px-4 py-3 transition-colors hover:bg-surface-container',
                    )}
                    style={{
                      backgroundColor: 'var(--color-surface-container)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <p className={cm.cn('font-mono text-sm font-bold text-on-surface truncate')}>
                      {s.name}
                    </p>
                    <p
                      className={cm.cn(
                        'mt-1 font-mono text-[11px] text-on-surface-variant truncate',
                      )}
                      title={s.query}
                    >
                      {s.query}
                    </p>
                    <p
                      className={cm.cn(
                        'mt-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      {t(
                        'dashboard.savedMeta',
                        { count: s.result_count, when: fmtRelative(s.last_run_at) },
                        { defaultValue: '{{count}} hits · {{when}}' },
                      )}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}
