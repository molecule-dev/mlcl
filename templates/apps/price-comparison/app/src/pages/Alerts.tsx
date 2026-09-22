import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ConfirmButton } from '../components/ConfirmButton.js'
import { ErrorBanner } from '../components/ErrorBanner.js'
import { fmtUsd, unwrapList } from '../lib/unwrap.js'

interface ApiAlert {
  id: string
  product_id: string
  target_price: number
  alert_type: 'below' | 'drop'
  status: 'active' | 'paused' | 'triggered'
  channel: 'email' | 'push'
  times_triggered?: number
  product?: {
    id: string
    name: string
    brand?: string | null
    best_price?: number | null
    price?: number | null
  } | null
}

const STATUS_TONE: Record<ApiAlert['status'], string> = {
  active: 'border-tertiary bg-tertiary/5',
  triggered: 'border-secondary bg-secondary/10',
  paused: 'border-outline-variant bg-surface-container/30',
}

const STATUS_GLYPH: Record<ApiAlert['status'], { glyph: string; tint: string }> = {
  active: { glyph: 'visibility', tint: 'text-tertiary' },
  triggered: { glyph: 'notifications_active', tint: 'text-secondary' },
  paused: { glyph: 'pause_circle', tint: 'text-on-surface-variant' },
}

export function Alerts() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [alerts, setAlerts] = useState<ApiAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setErrorMsg(null)
    void (async () => {
      try {
        const res = await http.get('/api/alerts')
        if (cancelled) return
        setAlerts(unwrapList<ApiAlert>(res))
      } catch (_error) {
        if (!cancelled)
          setErrorMsg(t('alerts.loadFailed', {}, { defaultValue: 'Could not load your alerts.' }))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http, retryKey, t])

  const togglePause = async (alert: ApiAlert) => {
    setBusyId(alert.id)
    try {
      const next = alert.status === 'paused' ? 'active' : 'paused'
      await http.put(`/api/alerts/${alert.id}`, { status: next })
      void track({
        name: 'alert.updated',
        properties: { alert_id: alert.id, status: next },
      })
      setAlerts((prev) => prev.map((a) => (a.id === alert.id ? { ...a, status: next } : a)))
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (alertId: string) => {
    setBusyId(alertId)
    try {
      await http.delete(`/api/alerts/${alertId}`)
      void track({ name: 'alert.deleted', properties: { alert_id: alertId } })
      setAlerts((prev) => prev.filter((a) => a.id !== alertId))
    } finally {
      setBusyId(null)
    }
  }

  const firingCount = alerts.filter((a) => a.status === 'triggered').length
  const watchingCount = alerts.filter((a) => a.status === 'active').length

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')} data-test="alerts-page">
      <header
        className={cm.cn(
          cm.flex({ align: 'baseline', justify: 'between', wrap: 'wrap', gap: 'md' }),
        )}
      >
        <div>
          <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-primary')}>
            {t('alerts.eyebrow', {}, { defaultValue: 'Watching for you' })}
          </p>
          <h1
            className={cm.cn(
              'mt-1 text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface',
            )}
          >
            {t('alerts.heading', {}, { defaultValue: 'Price alerts' })}
          </h1>
          <p
            data-test="alerts-summary"
            className={cm.cn(
              cm.textSize('base'),
              cm.sp('mt', 2),
              'text-on-surface-variant max-w-3xl',
            )}
          >
            {t(
              'alerts.summary',
              { firing: firingCount, watching: watchingCount },
              {
                defaultValue:
                  '{{firing}} alerts firing right now, {{watching}} still on the lookout.',
              },
            )}
          </p>
        </div>
        <Link
          to="/search"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'rounded-full bg-primary text-on-primary uppercase tracking-wider hover:opacity-95 transition-all shadow-md shadow-primary/20',
          )}
        >
          {t('alerts.addCta', {}, { defaultValue: 'Add an alert' })}
        </Link>
      </header>

      {errorMsg ? (
        <ErrorBanner message={errorMsg} onRetry={() => setRetryKey((k) => k + 1)} />
      ) : alerts.length === 0 ? (
        <div
          data-test="alerts-empty"
          className={cm.cn(
            cm.sp('p', 12),
            cm.textCenter,
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 text-on-surface-variant',
          )}
        >
          <span
            aria-hidden="true"
            className={cm.cn('material-symbols-outlined text-5xl text-on-surface-variant/40')}
          >
            notifications_off
          </span>
          <p className={cm.cn(cm.sp('mt', 4), cm.fontWeight('semibold'))}>
            {loading
              ? t('alerts.loading', {}, { defaultValue: 'Loading your alerts…' })
              : t(
                  'alerts.empty',
                  {},
                  { defaultValue: 'No alerts yet — set one from any product page.' },
                )}
          </p>
        </div>
      ) : (
        <ul
          data-test="alerts-list"
          className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 lg:grid-cols-2')}
        >
          {alerts.map((a) => {
            const tone = STATUS_TONE[a.status]
            const status = STATUS_GLYPH[a.status]
            const productName = a.product?.name ?? a.product_id
            const brand = a.product?.brand ?? '—'
            const bestPrice = a.product?.best_price ?? a.product?.price ?? 0
            return (
              <li key={a.id} data-test={`alerts-item-${a.id}`}>
                <div
                  className={cm.cn(
                    cm.sp('p', 5),
                    'block rounded-2xl border-l-4 bg-surface-container-lowest shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md',
                    tone,
                    'border border-outline-variant/30',
                  )}
                >
                  <header
                    className={cm.cn(cm.flex({ align: 'baseline', justify: 'between', gap: 'sm' }))}
                  >
                    <p
                      className={cm.cn(
                        'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      {brand}
                    </p>
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'xs' }),
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        'uppercase tracking-wider',
                        status.tint,
                      )}
                    >
                      <span
                        className={cm.cn('material-symbols-outlined text-base')}
                        aria-hidden="true"
                      >
                        {status.glyph}
                      </span>
                      {t(`alerts.status.${a.status}`, {}, { defaultValue: a.status })}
                    </span>
                  </header>
                  <Link
                    to={`/alerts/${a.id}`}
                    className={cm.cn(
                      cm.sp('mt', 1),
                      cm.textSize('lg'),
                      cm.fontWeight('extrabold'),
                      'leading-snug text-on-surface block hover:text-primary transition-colors',
                    )}
                  >
                    {productName}
                  </Link>
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'baseline', gap: 'lg', wrap: 'wrap' }),
                      cm.sp('mt', 4),
                    )}
                  >
                    <div>
                      <p
                        className={cm.cn(
                          'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                        )}
                      >
                        {t('alerts.target', {}, { defaultValue: 'Target' })}
                      </p>
                      <p
                        className={cm.cn(
                          'mt-1 text-2xl font-extrabold tabular-nums tracking-tight text-primary',
                        )}
                      >
                        {fmtUsd(a.target_price)}
                      </p>
                    </div>
                    <div>
                      <p
                        className={cm.cn(
                          'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                        )}
                      >
                        {t('alerts.current', {}, { defaultValue: 'Current best' })}
                      </p>
                      <p
                        className={cm.cn(
                          'mt-1 text-2xl font-extrabold tabular-nums tracking-tight text-on-surface',
                        )}
                      >
                        {fmtUsd(bestPrice)}
                      </p>
                    </div>
                    <div>
                      <p
                        className={cm.cn(
                          'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                        )}
                      >
                        {t('alerts.channel', {}, { defaultValue: 'Channel' })}
                      </p>
                      <p
                        className={cm.cn(
                          'mt-1 text-sm font-bold tracking-tight text-on-surface uppercase',
                        )}
                      >
                        {t(`common.channel.${a.channel}`, {}, { defaultValue: a.channel })}
                      </p>
                    </div>
                  </div>
                  <footer className={cm.cn(cm.flex({ gap: 'sm' }), cm.sp('mt', 4))}>
                    <button
                      type="button"
                      onClick={() => togglePause(a)}
                      disabled={busyId === a.id}
                      data-test={
                        a.status === 'paused' ? `alert-resume-${a.id}` : `alert-pause-${a.id}`
                      }
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 2),
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        'rounded-full uppercase tracking-wider bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors disabled:opacity-50',
                      )}
                    >
                      {a.status === 'paused'
                        ? t('common.resume', {}, { defaultValue: 'Resume' })
                        : t('common.pause', {}, { defaultValue: 'Pause' })}
                    </button>
                    <ConfirmButton
                      testId={`alert-remove-${a.id}`}
                      label={t('common.remove', {}, { defaultValue: 'Remove' })}
                      confirmLabel={t(
                        'alerts.confirmRemove',
                        {},
                        { defaultValue: 'Confirm remove?' },
                      )}
                      onConfirm={() => remove(a.id)}
                      disabled={busyId === a.id}
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 2),
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        'rounded-full uppercase tracking-wider bg-error/10 hover:bg-error/20 text-error transition-colors disabled:opacity-50',
                      )}
                    />
                  </footer>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
