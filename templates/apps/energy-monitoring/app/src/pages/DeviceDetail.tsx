import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type EnergyKpi, EnergyKpiTriad } from '../components/EnergyKpiTriad.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface MeterRow {
  id: string
  name: string
  type: string
  location: string | null
  status: string
  unit: string
  description: string | null
  latest_reading?: { value: number | string; timestamp: string } | null
}

interface Reading {
  id: string
  value: string | number
  timestamp: string
}

interface MeterToken {
  id: string
  label: string | null
  enabled: boolean
  created_at: string
  token?: string
}

function buildSparkline(values: number[]): { fill: string; stroke: string } {
  const W = 400
  const H = 100
  if (values.length === 0) return { fill: `M0,${H} L${W},${H} Z`, stroke: '' }
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const stroke = values
    .map((v, i) => {
      const x = values.length === 1 ? W / 2 : (i / (values.length - 1)) * W
      const y = H - ((v - min) / range) * (H * 0.85) - H * 0.1
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  const fill = `${stroke} L${W},${H} L0,${H} Z`
  return { fill, stroke }
}

export function DeviceDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()

  const [meter, setMeter] = useState<MeterRow | null>(null)
  const [readings, setReadings] = useState<Reading[]>([])
  const [tokens, setTokens] = useState<MeterToken[] | null>(null)
  const [newTokenSecret, setNewTokenSecret] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function load(): Promise<void> {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [m, r, tok] = await Promise.all([
        http.get<MeterRow>(`/api/meters/${id}`),
        http.get<Reading[]>(`/api/readings?meter_id=${id}&limit=24`),
        http.get<MeterToken[]>(`/api/meters/${id}/tokens`),
      ])
      const meterData = unwrapSingle<MeterRow>(m)
      setMeter(meterData)
      setReadings(unwrapList<Reading>(r))
      setTokens(unwrapList<MeterToken>(tok))
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : t('deviceDetail.loadError', {}, { defaultValue: 'Could not load this meter.' })
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    if (!id) return
    void (async () => {
      try {
        const [m, r, tok] = await Promise.all([
          http.get<MeterRow>(`/api/meters/${id}`),
          http.get<Reading[]>(`/api/readings?meter_id=${id}&limit=24`),
          http.get<MeterToken[]>(`/api/meters/${id}/tokens`),
        ])
        if (cancelled) return
        setMeter(unwrapSingle<MeterRow>(m))
        setReadings(unwrapList<Reading>(r))
        setTokens(unwrapList<MeterToken>(tok))
      } catch (err) {
        if (cancelled) return
        const msg =
          err instanceof Error
            ? err.message
            : t('deviceDetail.loadError', {}, { defaultValue: 'Could not load this meter.' })
        setError(msg)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http, t, id])

  if (!id) {
    return (
      <p className={cm.cn(cm.sp('p', 8), cm.textCenter, 'text-on-surface-variant')}>
        {t('deviceDetail.missingId', {}, { defaultValue: 'No meter selected.' })}
      </p>
    )
  }

  const sortedReadings = [...readings].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  )
  const sparkValues = sortedReadings.map((r) => Number(r.value) * 1000) // kWh→W
  const sparkline = buildSparkline(sparkValues)
  const latestWatts = sparkValues.length > 0 ? Math.round(sparkValues[sparkValues.length - 1]) : 0
  const todayKwh = sortedReadings
    .filter((r) => {
      const d = new Date(r.timestamp)
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      return d >= start
    })
    .reduce((sum, r) => sum + Number(r.value), 0)
  const last7dKwh = sortedReadings.reduce((sum, r) => sum + Number(r.value), 0)

  const kpis: EnergyKpi[] = [
    {
      key: 'live',
      label: 'Latest hour',
      value: `${latestWatts.toLocaleString()} W`,
      icon: 'electric_bolt',
      tint: 'text-primary',
    },
    {
      key: 'today',
      label: 'Today',
      value: `${todayKwh.toFixed(1)} kWh`,
      icon: 'today',
      tint: 'text-success',
    },
    {
      key: 'recent',
      label: 'Last 24 samples',
      value: `${last7dKwh.toFixed(1)} kWh`,
      icon: 'timer',
      tint: 'text-warning',
    },
  ]

  async function deactivate(): Promise<void> {
    if (!meter) return
    setBusy('deactivate')
    try {
      await http.post(`/api/meters/${meter.id}/deactivate`, {})
      await load()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(
              'deviceDetail.errorDeactivate',
              {},
              { defaultValue: 'Could not deactivate the meter.' },
            ),
      )
    } finally {
      setBusy(null)
    }
  }

  async function deleteMeter(): Promise<void> {
    if (!meter) return
    setBusy('delete')
    try {
      await http.delete(`/api/meters/${meter.id}`)
      navigate('/devices')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('deviceDetail.errorDelete', {}, { defaultValue: 'Could not delete the meter.' }),
      )
    } finally {
      setBusy(null)
    }
  }

  async function mintToken(): Promise<void> {
    if (!meter) return
    setBusy('mint')
    setNewTokenSecret(null)
    try {
      const resp = await http.post<MeterToken>(`/api/meters/${meter.id}/tokens`, {
        label: 'IDE-issued',
      })
      const data = unwrapSingle<MeterToken>(resp)
      if (data?.token) setNewTokenSecret(data.token)
      await load()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('deviceDetail.errorMint', {}, { defaultValue: 'Could not issue a token.' }),
      )
    } finally {
      setBusy(null)
    }
  }

  return (
    <div
      data-mol-id="device-detail-page"
      className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}
    >
      <Link
        to="/devices"
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          cm.textSize('sm'),
          cm.fontWeight('semibold'),
          'text-on-surface-variant hover:text-on-surface',
        )}
      >
        <span className={'material-symbols-outlined text-base'} aria-hidden="true">
          arrow_back
        </span>
        {t('deviceDetail.back', {}, { defaultValue: 'All circuits' })}
      </Link>

      {error ? (
        <p
          data-mol-id="device-detail-error"
          role="alert"
          className={cm.cn(
            cm.sp('p', 4),
            'bg-error-container text-on-error-container rounded-xl text-sm',
          )}
        >
          {error}
        </p>
      ) : null}

      {loading && !meter ? (
        <p
          data-mol-id="device-detail-loading"
          className={cm.cn(
            cm.sp('p', 6),
            cm.textCenter,
            'bg-surface-container-lowest rounded-2xl text-on-surface-variant',
          )}
        >
          {t('deviceDetail.loading', {}, { defaultValue: 'Loading meter\u2026' })}
        </p>
      ) : !meter ? (
        <p
          data-mol-id="device-detail-not-found"
          className={cm.cn(
            cm.sp('p', 6),
            cm.textCenter,
            'bg-surface-container-lowest rounded-2xl text-on-surface-variant',
          )}
        >
          {t('deviceDetail.notFound', {}, { defaultValue: 'Meter not found.' })}
        </p>
      ) : (
        <>
          <header className={cm.flex({ direction: 'col', gap: 'xs' })}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-primary',
              )}
            >
              {t('deviceDetail.eyebrow', {}, { defaultValue: 'Circuit detail' })}
            </p>
            <h1
              data-mol-id="device-detail-name"
              className={cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'), 'tracking-tight')}
            >
              {meter.name}
            </h1>
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
              {meter.type} ·{' '}
              {meter.location ?? t('status.unassigned', {}, { defaultValue: 'Unassigned' })} ·{' '}
              {meter.status}
            </p>
          </header>

          <section
            className={cm.cn(
              cm.flex({ direction: 'col', justify: 'between' }),
              cm.sp('p', 10),
              'min-h-[280px] bg-gradient-to-br from-primary to-primary-container rounded-[2rem] text-white relative overflow-hidden',
            )}
          >
            <div className={cm.cn('relative z-10')}>
              <p
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  cm.sp('mb', 2),
                  'uppercase tracking-widest text-primary-fixed/80',
                )}
              >
                {t('deviceDetail.heroLabel', {}, { defaultValue: 'Last 24 samples' })}
              </p>
              <div className={cm.flex({ align: 'baseline', gap: 'md' })}>
                <span
                  data-mol-id="device-detail-watts"
                  className="font-mono text-6xl font-extrabold tracking-tighter tabular-nums"
                >
                  {latestWatts.toLocaleString()} W
                </span>
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    cm.roundedFull,
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'bg-surface/20 backdrop-blur-md',
                  )}
                >
                  <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
                    fiber_manual_record
                  </span>
                  {meter.status}
                </span>
              </div>
            </div>
            <div className={'relative z-10 mt-8 h-24'}>
              <svg
                className={cm.cn(cm.w('full'), cm.h('full'))}
                viewBox="0 0 400 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                {sparkline.stroke ? (
                  <>
                    <path d={sparkline.fill} fill="white" opacity="0.3" />
                    <path d={sparkline.stroke} fill="none" stroke="white" strokeWidth="3" />
                  </>
                ) : null}
              </svg>
            </div>
            <div
              className={
                'absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-surface/10 blur-3xl'
              }
              aria-hidden="true"
            />
          </section>

          <EnergyKpiTriad kpis={kpis} />

          <section
            className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl', cm.stack(4))}
          >
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
              {t('deviceDetail.controlsHeading', {}, { defaultValue: 'Quick controls' })}
            </h2>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}>
              <button
                type="button"
                data-mol-id="device-detail-deactivate"
                onClick={() => void deactivate()}
                disabled={busy === 'deactivate' || meter.status === 'inactive'}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.roundedFull,
                  cm.fontWeight('bold'),
                  cm.textSize('xs'),
                  'uppercase tracking-widest bg-surface-container text-on-surface hover:bg-surface-container-high transition-all disabled:opacity-60',
                )}
              >
                <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                  pause
                </span>
                {meter.status === 'inactive'
                  ? t('deviceDetail.alreadyOff', {}, { defaultValue: 'Already paused' })
                  : t('deviceDetail.deactivate', {}, { defaultValue: 'Pause meter' })}
              </button>
              <Link
                to="/alerts/rules/new"
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.roundedFull,
                  cm.fontWeight('bold'),
                  cm.textSize('xs'),
                  'uppercase tracking-widest bg-surface-container text-on-surface hover:bg-surface-container-high transition-all',
                )}
              >
                <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                  notifications_active
                </span>
                {t('deviceDetail.newRule', {}, { defaultValue: 'Add alert rule' })}
              </Link>
              <button
                type="button"
                data-mol-id="device-detail-mint-token"
                onClick={() => void mintToken()}
                disabled={busy === 'mint'}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.roundedFull,
                  cm.fontWeight('bold'),
                  cm.textSize('xs'),
                  'uppercase tracking-widest bg-primary text-on-primary hover:bg-primary/90 transition-all disabled:opacity-60',
                )}
              >
                <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                  vpn_key
                </span>
                {t('deviceDetail.mintToken', {}, { defaultValue: 'Issue ingest token' })}
              </button>
              <button
                type="button"
                data-mol-id="device-detail-delete"
                onClick={() => void deleteMeter()}
                disabled={busy === 'delete'}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.roundedFull,
                  cm.fontWeight('bold'),
                  cm.textSize('xs'),
                  'uppercase tracking-widest bg-error-container text-on-error-container hover:bg-error-container/80 transition-all disabled:opacity-60',
                )}
              >
                <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                  delete
                </span>
                {t('deviceDetail.delete', {}, { defaultValue: 'Delete meter' })}
              </button>
            </div>
            {newTokenSecret ? (
              <div
                data-mol-id="device-detail-new-token"
                className={cm.cn(
                  cm.sp('p', 4),
                  cm.textSize('sm'),
                  'rounded-xl bg-success-container text-on-success-container',
                  cm.stack(1),
                )}
              >
                <p className={cm.cn(cm.fontWeight('bold'))}>
                  {t(
                    'deviceDetail.tokenIssued',
                    {},
                    { defaultValue: 'New ingest token (shown once)' },
                  )}
                </p>
                <code className={cm.cn('font-mono break-all')}>{newTokenSecret}</code>
              </div>
            ) : null}
            {tokens && tokens.length > 0 ? (
              <div className={cm.stack(2)}>
                <p
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    cm.textSize('xs'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('deviceDetail.activeTokens', {}, { defaultValue: 'Active ingest tokens' })}
                </p>
                <ul className={cm.stack(1)}>
                  {tokens.map((tok) => (
                    <li
                      key={tok.id}
                      className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums')}
                    >
                      {tok.label || t('deviceDetail.unnamedToken', {}, { defaultValue: 'unnamed' })}{' '}
                      · {new Date(tok.created_at).toLocaleString()} ·{' '}
                      {tok.enabled
                        ? t('deviceDetail.tokenEnabled', {}, { defaultValue: 'enabled' })
                        : t('deviceDetail.tokenRevoked', {}, { defaultValue: 'revoked' })}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          <section
            className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl', cm.stack(4))}
          >
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
              {t('deviceDetail.recentHeading', {}, { defaultValue: 'Recent samples' })}
            </h2>
            {sortedReadings.length === 0 ? (
              <p
                data-mol-id="device-detail-no-readings"
                className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
              >
                {t(
                  'deviceDetail.noReadings',
                  {},
                  {
                    defaultValue:
                      'No readings yet — push some via the ingest token to see them here.',
                  },
                )}
              </p>
            ) : (
              <div
                data-mol-id="device-detail-readings"
                className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}
              >
                {sortedReadings
                  .slice()
                  .reverse()
                  .slice(0, 12)
                  .map((p) => {
                    const ts = new Date(p.timestamp)
                    return (
                      <div
                        key={p.id}
                        className={cm.cn(
                          cm.flex({ align: 'center', justify: 'between' }),
                          cm.sp('px', 3),
                          cm.sp('py', 2),
                          'border-b border-surface-container last:border-0',
                        )}
                      >
                        <span
                          className={cm.cn(
                            cm.textSize('xs'),
                            'text-on-surface-variant tabular-nums',
                          )}
                        >
                          {ts.toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span
                          className={cm.cn(cm.fontWeight('bold'), 'font-mono text-sm tabular-nums')}
                        >
                          {(Number(p.value) * 1000).toLocaleString()} W ·{' '}
                          {Number(p.value).toFixed(3)} kWh
                        </span>
                      </div>
                    )
                  })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
