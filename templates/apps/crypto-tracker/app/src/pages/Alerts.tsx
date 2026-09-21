import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import {
  AlertConditionCard,
  type AlertConditionCardData,
} from '../components/AlertConditionCard.js'
import { unwrapList } from '../lib/unwrap.js'

export function Alerts() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [alerts, setAlerts] = useState<AlertConditionCardData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/alerts')
      .then((res) => {
        if (!cancelled) setAlerts(unwrapList<AlertConditionCardData>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('alerts.loadError', {}, { defaultValue: 'Failed to load alerts.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const counts = useMemo(
    () => ({
      armed: alerts.filter((a) => a.active && !a.triggered_at).length,
      triggered: alerts.filter((a) => !!a.triggered_at).length,
      paused: alerts.filter((a) => !a.active).length,
    }),
    [alerts],
  )

  const handleDelete = async (id: string) => {
    const previous = alerts
    setAlerts((cur) => cur.filter((a) => a.id !== id))
    try {
      await http.delete(`/api/alerts/${id}`)
      void track({ name: 'alert.deleted', properties: { alert_id: id } })
    } catch (_error) {
      // optimistic update: restore previous list on failure
      setAlerts(previous)
    }
  }

  // Pause/resume an alert via the API's toggle endpoint.
  const handleToggle = async (id: string) => {
    const previous = alerts
    setAlerts((cur) => cur.map((a) => (a.id === id ? { ...a, active: !a.active } : a)))
    try {
      await http.put(`/api/alerts/${id}/toggle`, {})
      const flipped = previous.find((a) => a.id === id)
      void track({
        name: 'alert.toggled',
        properties: { alert_id: id, active: flipped ? !flipped.active : true },
      })
    } catch (_error) {
      // optimistic update: restore previous state on failure
      setAlerts(previous)
    }
  }

  return (
    <div
      className={cm.cn(
        cm.sp('px', 6),
        cm.sp('py', 8),
        cm.maxW('7xl'),
        cm.mxAuto,
        'lg:px-10 space-y-6',
      )}
    >
      <header
        className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'md' }), 'flex-wrap')}
      >
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
            {t('alerts.eyebrow', { appName: APP_NAME }, { defaultValue: '{{appName}} tripwires' })}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('3xl'),
              cm.fontWeight('bold'),
              cm.sp('mt', 1),
              'tracking-tight',
            )}
          >
            {t('nav.alerts', {}, { defaultValue: 'Alerts' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
            {t(
              'alerts.subheading',
              {},
              { defaultValue: 'Get pinged when price, change, or volume crosses your line.' },
            )}
          </p>
        </div>
        <Link
          to="/alerts/new"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('bold'),
            'rounded-full bg-primary text-on-primary hover:bg-primary/90 transition-colors',
          )}
        >
          {t('alerts.newCta', {}, { defaultValue: '+ New tripwire' })}
        </Link>
      </header>

      <section className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'sm:grid-cols-3')}>
        <SummaryTile
          label={t('alerts.summary.armed', {}, { defaultValue: 'Armed' })}
          value={counts.armed}
          icon="bolt"
          accent="success"
        />
        <SummaryTile
          label={t('alerts.summary.triggered', {}, { defaultValue: 'Triggered' })}
          value={counts.triggered}
          icon="notifications_active"
          accent="error"
        />
        <SummaryTile
          label={t('status.paused', {}, { defaultValue: 'Paused' })}
          value={counts.paused}
          icon="pause_circle"
          accent="muted"
        />
      </section>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : alerts.length === 0 ? (
        <div className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          <p>{t('alerts.empty', {}, { defaultValue: 'No alerts yet.' })}</p>
        </div>
      ) : (
        <ul className={cm.cn('space-y-3')}>
          {alerts.map((a) => (
            <li key={a.id}>
              <AlertConditionCard alert={a} onToggle={handleToggle} onDelete={handleDelete} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function SummaryTile({
  label,
  value,
  icon,
  accent,
}: {
  label: string
  value: number
  icon: string
  accent: 'success' | 'error' | 'muted'
}) {
  const cm = getClassMap()
  const accentColor =
    accent === 'success'
      ? 'text-success bg-success/15'
      : accent === 'error'
        ? 'text-error bg-error/15'
        : 'text-on-surface-variant bg-surface-container'
  return (
    <div
      className={cm.cn(
        cm.sp('p', 5),
        cm.flex({ align: 'center', gap: 'md' }),
        'rounded-2xl bg-surface-container-lowest border border-outline-variant/40 shadow-sm',
      )}
    >
      <span
        className={cm.cn(
          cm.w(12),
          cm.h(12),
          cm.roundedFull,
          cm.flex({ align: 'center', justify: 'center' }),
          accentColor,
        )}
      >
        <span className="material-symbols-outlined">{icon}</span>
      </span>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
          {label}
        </p>
        <p className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'tabular-nums mt-0.5')}>
          {value}
        </p>
      </div>
    </div>
  )
}
