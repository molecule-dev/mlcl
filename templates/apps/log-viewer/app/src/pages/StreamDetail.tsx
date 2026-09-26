import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BRAND_COLOR } from '../branding.js'
import { type LogLine, LogLineRow } from '../components/LogLineRow.js'
import { LogVolumeSparkline } from '../components/LogVolumeSparkline.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface StreamDetailData {
  id: string
  name: string
  source: string
  format: string
  rate_per_sec: number
  retention_days: number
  status: 'active' | 'paused'
  last_event_at: string
}

const SAMPLE_RATES = [180, 220, 240, 260, 290, 310, 340, 360, 380, 410, 412, 412]

const PARSING_RULES = [
  { field: 'severity', example: 'INFO|WARN|ERROR|FATAL', mapping: 'severity' },
  { field: 'service', example: '[checkout]', mapping: 'service' },
  { field: 'timestamp', example: 'ISO-8601', mapping: '@timestamp' },
  { field: 'trace_id', example: 'trc-xxxxx', mapping: 'trace.trace_id' },
]

function fmtRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function StreamDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const [stream, setStream] = useState<StreamDetailData | null>(null)
  const [logs, setLogs] = useState<LogLine[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([http.get(`/api/streams/${id}`), http.get('/api/logs')])
      .then(([streamRes, logsRes]) => {
        if (cancelled) return
        setStream(unwrapSingle<StreamDetailData>(streamRes))
        setLogs(unwrapList<LogLine>(logsRes).slice(0, 8))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('streamDetail.loadError', {}, { defaultValue: 'Failed to load stream.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, http, t])

  const isActive = stream?.status === 'active'

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <Link
        to="/streams"
        className={cm.cn(
          'inline-flex items-center gap-1 text-xs font-mono uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors',
        )}
      >
        <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
          arrow_back
        </span>
        {t('streamDetail.back', {}, { defaultValue: 'All streams' })}
      </Link>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), 'text-on-surface-variant')}>
          {t('streamDetail.loading', {}, { defaultValue: 'Loading stream…' })}
        </p>
      ) : !stream ? (
        <p className={cm.cn(cm.sp('py', 16), 'text-on-surface-variant')}>
          {t('streamDetail.notFound', {}, { defaultValue: 'Stream not found.' })}
        </p>
      ) : (
        <>
          <header
            className={cm.cn('relative overflow-hidden rounded-[1.5rem] mt-4 p-6 md:p-8')}
            style={{
              backgroundImage:
                'linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 32%, transparent), color-mix(in srgb, var(--color-accent) 18%, transparent))',
              backgroundColor: 'var(--color-background-tertiary)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div
              className={cm.cn(
                'absolute -right-16 -bottom-20 h-56 w-56 rounded-full blur-3xl pointer-events-none',
              )}
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-primary) 45%, transparent)',
              }}
              aria-hidden="true"
            />
            <div className={cm.cn('relative grid grid-cols-1 md:grid-cols-2 gap-8 items-center')}>
              <div>
                <p
                  className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest')}
                  style={{ color: BRAND_COLOR }}
                >
                  {t('streamDetail.eyebrow', {}, { defaultValue: 'live stream' })}
                </p>
                <h1
                  className={cm.cn(
                    'mt-2 font-mono text-3xl md:text-4xl font-extrabold tracking-tighter text-on-surface',
                  )}
                >
                  {stream.name}
                </h1>
                <p className={cm.cn('mt-1 font-mono text-sm font-medium text-on-surface-variant')}>
                  <span className={cm.cn('opacity-70')}>source </span>
                  {stream.source}
                </p>
                <div
                  className={cm.cn('mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full')}
                  style={{
                    backgroundColor: isActive
                      ? 'color-mix(in srgb, var(--color-success) 16%, transparent)'
                      : 'color-mix(in srgb, var(--color-severity-warn) 16%, transparent)',
                  }}
                >
                  <span
                    className={cm.cn('h-2 w-2 rounded-full', isActive && 'animate-pulse')}
                    style={{
                      backgroundColor: isActive
                        ? 'var(--color-live-tail-active)'
                        : 'var(--color-live-tail-paused)',
                    }}
                    aria-hidden="true"
                  />
                  <span
                    className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest')}
                    style={{
                      color: isActive
                        ? 'var(--color-success-light)'
                        : 'var(--color-severity-warn-light)',
                    }}
                  >
                    {isActive
                      ? t('streamDetail.statusActive', {}, { defaultValue: 'ingesting' })
                      : t('streamDetail.statusPaused', {}, { defaultValue: 'paused' })}
                  </span>
                </div>
              </div>
              <div>
                <LogVolumeSparkline
                  values={SAMPLE_RATES}
                  width={420}
                  height={100}
                  stroke="var(--color-primary)"
                  fill="var(--color-primary)"
                  strokeWidth={2.5}
                  ariaLabel={t(
                    'streamDetail.sparkAria',
                    {},
                    { defaultValue: 'Last hour ingest rate' },
                  )}
                />
                <p
                  className={cm.cn(
                    'mt-2 font-mono text-[10px] uppercase tracking-widest text-right',
                  )}
                  style={{ color: 'var(--color-on-surface-variant)' }}
                >
                  {t(
                    'streamDetail.lastEventAt',
                    { when: fmtRelative(stream.last_event_at) },
                    { defaultValue: 'last event {{when}}' },
                  )}
                </p>
              </div>
            </div>
          </header>

          <div className={cm.cn('mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6')}>
            <section className={cm.cn('lg:col-span-2')}>
              <h2
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-3',
                )}
              >
                {t('streamDetail.recentEventsHeading', {}, { defaultValue: 'Recent events' })}
              </h2>
              <div
                className={cm.cn('rounded-xl overflow-hidden')}
                style={{
                  backgroundColor: 'var(--color-background)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {logs.map((line) => (
                  <LogLineRow key={line.id} line={line} />
                ))}
              </div>
            </section>

            <aside className={cm.cn('space-y-6')}>
              <div
                className={cm.cn('rounded-xl p-5')}
                style={{
                  backgroundColor: 'var(--color-surface-container)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <h3
                  className={cm.cn(
                    'text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-3',
                  )}
                >
                  {t('streamDetail.statsHeading', {}, { defaultValue: 'Ingestion stats' })}
                </h3>
                <dl className={cm.cn('space-y-3')}>
                  <div className={cm.cn('flex items-baseline justify-between')}>
                    <dt
                      className={cm.cn(
                        'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      {t('streamDetail.rate', {}, { defaultValue: 'Rate / sec' })}
                    </dt>
                    <dd className={cm.cn('font-mono text-lg font-extrabold text-on-surface')}>
                      {stream.rate_per_sec.toLocaleString()}
                    </dd>
                  </div>
                  <div className={cm.cn('flex items-baseline justify-between')}>
                    <dt
                      className={cm.cn(
                        'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      {t('form.format', {}, { defaultValue: 'Format' })}
                    </dt>
                    <dd className={cm.cn('font-mono text-sm font-bold text-on-surface')}>
                      {stream.format.toUpperCase()}
                    </dd>
                  </div>
                  <div className={cm.cn('flex items-baseline justify-between')}>
                    <dt
                      className={cm.cn(
                        'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      {t('streamDetail.retention', {}, { defaultValue: 'Retention' })}
                    </dt>
                    <dd className={cm.cn('font-mono text-sm font-bold text-on-surface')}>
                      {stream.retention_days}d
                    </dd>
                  </div>
                </dl>
              </div>

              <div
                className={cm.cn('rounded-xl p-5')}
                style={{
                  backgroundColor: 'var(--color-surface-container)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <h3
                  className={cm.cn(
                    'text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-3',
                  )}
                >
                  {t('streamDetail.parsingHeading', {}, { defaultValue: 'Parsing rules' })}
                </h3>
                <ul className={cm.cn('space-y-2')}>
                  {PARSING_RULES.map((r) => (
                    <li
                      key={r.field}
                      className={cm.cn(
                        'grid grid-cols-12 gap-2 px-3 py-2 rounded-md font-mono text-[11px]',
                      )}
                      style={{ backgroundColor: 'var(--color-input-background)' }}
                    >
                      <span
                        className={cm.cn('col-span-3 font-bold')}
                        style={{ color: 'var(--color-accent)' }}
                      >
                        {r.field}
                      </span>
                      <span className={cm.cn('col-span-5 text-on-surface-variant truncate')}>
                        {r.example}
                      </span>
                      <span className={cm.cn('col-span-4 text-right text-on-surface')}>
                        {r.mapping}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        </>
      )}
    </div>
  )
}
