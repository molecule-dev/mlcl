import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { PriceHistoryChart, type PriceHistoryPoint } from '../components/PriceHistoryChart.js'
import { fmtUsd, unwrapSingle } from '../lib/unwrap.js'

interface ApiAlert {
  id: string
  user_id: string
  product_id: string
  target_price: number
  alert_type: 'below' | 'drop'
  status: 'active' | 'paused' | 'triggered'
  channel: 'email' | 'push'
  times_triggered: number
  last_notified_at: string | null
  created_at: string
}

interface ApiHistoryResponse {
  product?: {
    id: string
    name: string
    brand?: string | null
    best_price?: number | null
  } | null
  history?: Array<{ recorded_at: string; price: number }>
}

const HISTORY_LABEL = (iso: string): string => {
  const d = new Date(iso)
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]
  return `${months[d.getMonth()]} ${d.getDate()}`
}

export function AlertDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const http = useHttpClient()
  const [alert, setAlert] = useState<ApiAlert | null>(null)
  const [productName, setProductName] = useState<string>('')
  const [productBrand, setProductBrand] = useState<string>('')
  const [bestPrice, setBestPrice] = useState<number>(0)
  const [history, setHistory] = useState<PriceHistoryPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    void (async () => {
      try {
        const res = await http.get(`/api/alerts/${id}`)
        if (cancelled) return
        const a = unwrapSingle<ApiAlert>(res)
        if (!a) return
        setAlert(a)

        const histRes = await http.get(`/api/prices/history/${a.product_id}?period=30d`)
        if (cancelled) return
        const wrapped = (histRes as { data?: ApiHistoryResponse }).data
        const points = wrapped?.history ?? []
        const grouped: Record<string, { price: number; count: number }> = {}
        for (const p of points) {
          const lbl = HISTORY_LABEL(p.recorded_at)
          if (!grouped[lbl]) grouped[lbl] = { price: 0, count: 0 }
          grouped[lbl].price += p.price
          grouped[lbl].count += 1
        }
        const series = Object.entries(grouped).map(([label, v]) => ({
          label,
          price_cents: Math.round(v.price / Math.max(1, v.count)),
        }))
        setHistory(series)

        if (wrapped?.product) {
          setProductName(wrapped.product.name)
          setProductBrand(wrapped.product.brand ?? '')
          setBestPrice(Number(wrapped.product.best_price ?? 0))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http, id])

  const togglePause = async () => {
    if (!alert) return
    setBusy(true)
    try {
      const next = alert.status === 'paused' ? 'active' : 'paused'
      await http.put(`/api/alerts/${alert.id}`, { status: next })
      setAlert({ ...alert, status: next })
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!alert) return
    setBusy(true)
    try {
      await http.delete(`/api/alerts/${alert.id}`)
      navigate('/alerts', { replace: true })
    } finally {
      setBusy(false)
    }
  }

  if (loading && !alert) {
    return (
      <div className={cm.cn(cm.sp('p', 8), cm.textCenter)} data-test="alert-loading">
        {t('alertDetail.loading', {}, { defaultValue: 'Loading alert…' })}
      </div>
    )
  }
  if (!alert) {
    return (
      <div className={cm.cn(cm.sp('p', 8), cm.textCenter)} data-test="alert-missing">
        {t('alertDetail.notFound', {}, { defaultValue: 'Alert not found.' })}
      </div>
    )
  }

  const firing = bestPrice > 0 && bestPrice <= alert.target_price

  return (
    <div
      className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-8')}
      data-test="alert-detail-page"
    >
      <nav>
        <Link
          to="/alerts"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant hover:text-primary',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            arrow_back
          </span>
          {t('alertDetail.backToAlerts', {}, { defaultValue: 'Back to alerts' })}
        </Link>
      </nav>

      <header
        className={cm.cn(
          cm.sp('p', 8),
          'relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-tertiary to-primary text-on-primary',
        )}
      >
        <div className={cm.cn('relative space-y-3 max-w-2xl')}>
          <p
            data-test="alert-detail-status"
            className={cm.cn('text-[10px] font-black uppercase tracking-widest text-on-primary/80')}
          >
            {productBrand} ·{' '}
            {t(`alerts.status.${alert.status}`, {}, { defaultValue: alert.status })}
          </p>
          <h1
            data-test="alert-product-name"
            className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight leading-tight')}
          >
            {productName || alert.product_id}
          </h1>
          <div
            className={cm.cn(
              cm.flex({ align: 'baseline', gap: 'lg', wrap: 'wrap' }),
              cm.sp('mt', 4),
            )}
          >
            <div>
              <p
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest text-on-primary/80',
                )}
              >
                {t('alertDetail.target', {}, { defaultValue: 'Target' })}
              </p>
              <p
                data-test="alert-detail-target"
                className={cm.cn('mt-1 text-3xl font-extrabold tabular-nums tracking-tighter')}
              >
                {fmtUsd(alert.target_price)}
              </p>
            </div>
            <div>
              <p
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest text-on-primary/80',
                )}
              >
                {t('alertDetail.current', {}, { defaultValue: 'Best now' })}
              </p>
              <p
                data-test="alert-current"
                className={cm.cn('mt-1 text-3xl font-extrabold tabular-nums tracking-tighter')}
              >
                {fmtUsd(bestPrice)}
              </p>
            </div>
            {firing && (
              <span
                data-test="alert-firing-badge"
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('extrabold'),
                  cm.textSize('xs'),
                  'rounded-full bg-secondary text-on-secondary uppercase tracking-wider',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                  notifications_active
                </span>
                {t('alertDetail.firing', {}, { defaultValue: 'Firing now' })}
              </span>
            )}
          </div>
          <div className={cm.cn(cm.flex({ gap: 'sm' }), cm.sp('mt', 4))}>
            <button
              type="button"
              onClick={togglePause}
              disabled={busy}
              data-test="alert-detail-pause"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'rounded-full bg-surface/25 backdrop-blur-md uppercase tracking-wider hover:bg-surface/35 transition-colors disabled:opacity-60',
              )}
            >
              {alert.status === 'paused'
                ? t('alertDetail.resume', {}, { defaultValue: 'Resume alert' })
                : t('alertDetail.pause', {}, { defaultValue: 'Pause alert' })}
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              data-test="alert-detail-delete"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'rounded-full bg-error/30 backdrop-blur-md uppercase tracking-wider hover:bg-error/40 transition-colors disabled:opacity-60',
              )}
            >
              {t('common.delete', {}, { defaultValue: 'Delete' })}
            </button>
          </div>
        </div>
      </header>

      <PriceHistoryChart
        points={history}
        targetCents={alert.target_price}
        eyebrow={t('status.last30Days', {}, { defaultValue: 'Last 30 days' })}
        heading={t('alertDetail.historyHeading', {}, { defaultValue: 'Price vs your target' })}
      />

      <section
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm space-y-3',
        )}
      >
        <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-tertiary')}>
          {t('alertDetail.metaEyebrow', {}, { defaultValue: 'Meta' })}
        </p>
        <h2
          className={cm.cn(
            cm.textSize('lg'),
            cm.fontWeight('extrabold'),
            'tracking-tight text-on-surface',
          )}
        >
          {t('alertDetail.metaHeading', {}, { defaultValue: 'Alert details' })}
        </h2>
        <dl className={cm.cn('grid grid-cols-2 gap-4 text-sm')}>
          <div>
            <dt
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('alertDetail.alertType', {}, { defaultValue: 'Alert type' })}
            </dt>
            <dd className={cm.cn(cm.fontWeight('semibold'), 'mt-1 text-on-surface uppercase')}>
              {t(
                `alertDetail.alertTypeValue.${alert.alert_type}`,
                {},
                { defaultValue: alert.alert_type },
              )}
            </dd>
          </div>
          <div>
            <dt
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('alertDetail.channel', {}, { defaultValue: 'Channel' })}
            </dt>
            <dd className={cm.cn(cm.fontWeight('semibold'), 'mt-1 text-on-surface uppercase')}>
              {t(`common.channel.${alert.channel}`, {}, { defaultValue: alert.channel })}
            </dd>
          </div>
          <div>
            <dt
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('alertDetail.timesTriggered', {}, { defaultValue: 'Times triggered' })}
            </dt>
            <dd className={cm.cn(cm.fontWeight('semibold'), 'mt-1 text-on-surface tabular-nums')}>
              {alert.times_triggered ?? 0}
            </dd>
          </div>
          <div>
            <dt
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('alertDetail.created', {}, { defaultValue: 'Created' })}
            </dt>
            <dd className={cm.cn(cm.fontWeight('semibold'), 'mt-1 text-on-surface')}>
              {new Date(alert.created_at).toLocaleDateString()}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  )
}
