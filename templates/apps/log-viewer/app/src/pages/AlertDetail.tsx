import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BRAND_COLOR } from '../branding.js'
import { LogVolumeSparkline } from '../components/LogVolumeSparkline.js'
import { type Severity, SeverityPill } from '../components/SeverityPill.js'
import { unwrapSingle } from '../lib/unwrap.js'

interface AlertRule {
  id: string
  name: string
  service: string
  severity: Severity
  condition: string
  channels: string[]
  status: 'firing' | 'monitoring' | 'ok'
  last_fired_at: string
  fire_count_24h: number
}

const SAMPLE_FIRE_HISTORY = [
  3, 4, 5, 6, 7, 8, 6, 5, 4, 6, 8, 12, 10, 8, 6, 5, 4, 6, 8, 9, 10, 12, 14, 18,
]
const SAMPLE_RUNBOOK = [
  'Verify the upstream provider status (stripe.com / status page).',
  'Inspect /api/v1/charges p95 latency and error code distribution.',
  'Roll back the most recent deploy to checkout if the regression aligns.',
  'Page the on-call payments engineer if the error rate persists > 5m.',
]

const STATUS_TINT: Record<
  AlertRule['status'],
  { bg: string; text: string; defaultLabel: string; accent: string }
> = {
  firing: {
    bg: 'color-mix(in srgb, var(--color-severity-fatal) 16%, transparent)',
    text: 'var(--color-severity-fatal-light)',
    defaultLabel: 'Firing',
    accent: 'var(--color-severity-fatal)',
  },
  monitoring: {
    bg: 'color-mix(in srgb, var(--color-severity-warn) 16%, transparent)',
    text: 'var(--color-severity-warn-light)',
    defaultLabel: 'Monitoring',
    accent: 'var(--color-severity-warn)',
  },
  ok: {
    bg: 'color-mix(in srgb, var(--color-success) 16%, transparent)',
    text: 'var(--color-success-light)',
    defaultLabel: 'OK',
    accent: 'var(--color-success)',
  },
}

function fmtRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function AlertDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const [alert, setAlert] = useState<AlertRule | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [silencing, setSilencing] = useState(false)
  const [silenceMsg, setSilenceMsg] = useState<string | null>(null)
  const [silenceErr, setSilenceErr] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get(`/api/alerts/${id}`)
      .then((res) => {
        if (!cancelled) setAlert(unwrapSingle<AlertRule>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('alertDetail.loadError', {}, { defaultValue: 'Failed to load alert.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, http, t])

  async function silenceFor1h() {
    if (!id) return
    setSilencing(true)
    setSilenceMsg(null)
    setSilenceErr(null)
    try {
      await http.post(`/api/alerts/${id}/silence`, { duration_minutes: 60 })
      setSilenceMsg(t('alertDetail.silenced', {}, { defaultValue: 'Silenced for 1 hour.' }))
      // Refresh the alert to reflect any server-side state change.
      const res = await http.get(`/api/alerts/${id}`)
      setAlert(unwrapSingle<AlertRule>(res))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setSilenceErr(
        msg || t('alertDetail.silenceError', {}, { defaultValue: 'Could not silence alert.' }),
      )
    } finally {
      setSilencing(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <Link
        to="/alerts"
        className={cm.cn(
          'inline-flex items-center gap-1 text-xs font-mono uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors',
        )}
      >
        <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
          arrow_back
        </span>
        {t('alertDetail.back', {}, { defaultValue: 'All alerts' })}
      </Link>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), 'text-on-surface-variant')}>
          {t('alertDetail.loading', {}, { defaultValue: 'Loading alert…' })}
        </p>
      ) : !alert ? (
        <p className={cm.cn(cm.sp('py', 16), 'text-on-surface-variant')}>
          {t('alertDetail.notFound', {}, { defaultValue: 'Alert not found.' })}
        </p>
      ) : (
        <>
          {(() => {
            const tint = STATUS_TINT[alert.status]
            return (
              <header
                className={cm.cn('relative overflow-hidden rounded-[1.5rem] mt-4 p-6 md:p-8')}
                style={{
                  backgroundImage: `linear-gradient(135deg, color-mix(in srgb, ${tint.accent} 20%, transparent), color-mix(in srgb, var(--color-accent) 18%, transparent))`,
                  backgroundColor: 'var(--color-background-tertiary)',
                  border: '1px solid var(--color-border)',
                  borderLeft: `4px solid ${tint.accent}`,
                }}
              >
                <div
                  className={cm.cn(
                    'absolute -right-16 -bottom-20 h-56 w-56 rounded-full blur-3xl pointer-events-none',
                  )}
                  style={{ backgroundColor: `color-mix(in srgb, ${tint.accent} 33%, transparent)` }}
                  aria-hidden="true"
                />
                <div className={cm.cn('relative')}>
                  <div className={cm.cn('flex items-center gap-2 flex-wrap')}>
                    <SeverityPill
                      severity={alert.severity}
                      emphasis
                      pulse={alert.status === 'firing'}
                    />
                    <span
                      className={cm.cn(
                        'inline-flex items-center px-2.5 py-1 rounded-full font-mono text-[11px] font-extrabold uppercase tracking-widest',
                      )}
                      style={{ backgroundColor: tint.bg, color: tint.text }}
                    >
                      {t(
                        `alertDetail.status.${alert.status}`,
                        {},
                        { defaultValue: tint.defaultLabel },
                      )}
                    </span>
                  </div>
                  <h1
                    className={cm.cn(
                      'mt-3 font-mono text-3xl md:text-4xl font-extrabold tracking-tighter text-on-surface',
                    )}
                  >
                    {alert.name}
                  </h1>
                  <p
                    className={cm.cn('mt-1 font-mono text-sm font-semibold')}
                    style={{ color: 'var(--color-accent)' }}
                  >
                    {alert.service}
                  </p>
                  <div className={cm.cn('mt-4 flex flex-wrap items-center gap-x-6 gap-y-2')}>
                    <div>
                      <p
                        className={cm.cn(
                          'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                        )}
                      >
                        {t('alertDetail.lastFired', {}, { defaultValue: 'Last fired' })}
                      </p>
                      <p className={cm.cn('font-mono text-sm font-bold text-on-surface')}>
                        {fmtRelative(alert.last_fired_at)}
                      </p>
                    </div>
                    <div>
                      <p
                        className={cm.cn(
                          'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                        )}
                      >
                        {t('alertDetail.fired24h', {}, { defaultValue: 'Fires 24h' })}
                      </p>
                      <p className={cm.cn('font-mono text-sm font-extrabold text-on-surface')}>
                        {alert.fire_count_24h}
                      </p>
                    </div>
                  </div>
                </div>
              </header>
            )
          })()}

          <div className={cm.cn('mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6')}>
            <section className={cm.cn('lg:col-span-2 space-y-6')}>
              <div
                className={cm.cn('rounded-xl p-5')}
                style={{
                  backgroundColor: 'var(--color-surface-container)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <h2
                  className={cm.cn(
                    'text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-3',
                  )}
                >
                  {t('alertDetail.condition', {}, { defaultValue: 'Condition' })}
                </h2>
                <pre
                  className={cm.cn(
                    'font-mono text-sm px-4 py-3 rounded-md overflow-x-auto whitespace-pre-wrap break-words',
                  )}
                  style={{
                    backgroundColor: 'var(--color-background)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-severity-debug-light)',
                  }}
                >
                  {alert.condition}
                </pre>
              </div>

              <div
                className={cm.cn('rounded-xl p-5')}
                style={{
                  backgroundColor: 'var(--color-surface-container)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <h2
                  className={cm.cn(
                    'text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-3',
                  )}
                >
                  {t('alertDetail.fireHistory', {}, { defaultValue: 'Fire history · 24h' })}
                </h2>
                <LogVolumeSparkline
                  values={SAMPLE_FIRE_HISTORY}
                  width={640}
                  height={80}
                  stroke="var(--color-severity-fatal)"
                  strokeWidth={2}
                  ariaLabel={t(
                    'alertDetail.fireAria',
                    {},
                    { defaultValue: 'Fire history sparkline' },
                  )}
                  className={cm.cn('w-full')}
                />
              </div>

              <div
                className={cm.cn('rounded-xl p-5')}
                style={{
                  backgroundColor: 'var(--color-surface-container)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <h2
                  className={cm.cn(
                    'text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-3',
                  )}
                >
                  {t('alertDetail.runbook', {}, { defaultValue: 'Runbook' })}
                </h2>
                <ol
                  className={cm.cn(
                    'space-y-2 list-decimal list-inside font-mono text-xs text-on-surface',
                  )}
                >
                  {SAMPLE_RUNBOOK.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>
            </section>

            <aside
              className={cm.cn('rounded-xl p-5')}
              style={{
                backgroundColor: 'var(--color-surface-container)',
                border: '1px solid var(--color-border)',
              }}
            >
              <h2
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-3',
                )}
              >
                {t('alertDetail.channels', {}, { defaultValue: 'Channels' })}
              </h2>
              <ul className={cm.cn('space-y-2')}>
                {alert.channels.map((ch) => (
                  <li
                    key={ch}
                    className={cm.cn(
                      'flex items-center gap-3 px-3 py-2 rounded-md font-mono text-xs',
                    )}
                    style={{
                      backgroundColor: 'var(--color-input-background)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-severity-debug-light)',
                    }}
                  >
                    <span
                      className={cm.cn(
                        'material-symbols-outlined text-base text-on-surface-variant',
                      )}
                      aria-hidden="true"
                    >
                      forum
                    </span>
                    {ch}
                  </li>
                ))}
              </ul>

              <div className={cm.cn('mt-6 space-y-2')}>
                <Link
                  to="/incidents"
                  className={cm.cn(
                    'block w-full text-center px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest hover:opacity-90',
                  )}
                  style={{ backgroundColor: BRAND_COLOR, color: 'var(--color-background)' }}
                >
                  {t('alertDetail.declareIncident', {}, { defaultValue: 'Declare incident' })}
                </Link>
                <button
                  type="button"
                  onClick={silenceFor1h}
                  disabled={silencing}
                  data-mol-id="alert-silence"
                  className={cm.cn(
                    'block w-full text-center px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest hover:bg-surface-container disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                  style={{
                    border: '1px solid var(--color-outline)',
                    color: 'var(--color-severity-debug-light)',
                  }}
                >
                  {silencing
                    ? t('alertDetail.silencing', {}, { defaultValue: 'Silencing…' })
                    : t('alertDetail.silence', {}, { defaultValue: 'Silence 1h' })}
                </button>
                {silenceMsg ? (
                  <p
                    data-mol-id="alert-silence-msg"
                    className={cm.cn('text-center text-xs font-mono')}
                    style={{ color: 'var(--color-json-string)' }}
                  >
                    {silenceMsg}
                  </p>
                ) : null}
                {silenceErr ? (
                  <p
                    data-mol-id="alert-silence-err"
                    className={cm.cn('text-center text-xs font-mono text-error')}
                  >
                    {silenceErr}
                  </p>
                ) : null}
              </div>
            </aside>
          </div>
        </>
      )}
    </div>
  )
}
