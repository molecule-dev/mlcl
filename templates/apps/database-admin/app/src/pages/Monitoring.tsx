import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { DatabaseAdminLayout } from '../components/DatabaseAdminLayout.js'
import { apiGet } from '../lib/api.js'

interface RecentRow {
  id: string
  status: string
  duration_ms: number
}

interface Connection {
  id: string
  name: string
}

export function Monitoring() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [recent, setRecent] = useState<RecentRow[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    void Promise.allSettled([
      apiGet<RecentRow[]>(http, '/api/queries/history?limit=200'),
      apiGet<Connection[]>(http, '/api/connections'),
    ]).then(([h, c]) => {
      if (cancelled) return
      if (h.status === 'fulfilled' && Array.isArray(h.value)) setRecent(h.value)
      if (c.status === 'fulfilled' && Array.isArray(c.value)) setConnections(c.value)
      setLoaded(true)
    })
    return () => {
      cancelled = true
    }
  }, [http])

  const total = recent.length
  const successes = recent.filter((r) => r.status === 'success').length
  const errors = recent.filter((r) => r.status === 'error').length
  const avgMs =
    recent.length === 0
      ? 0
      : Math.round(recent.reduce((sum, r) => sum + (r.duration_ms ?? 0), 0) / recent.length)

  return (
    <DatabaseAdminLayout>
      <div
        data-mol-id="monitoring-page"
        className={cm.cn('flex-1 overflow-y-auto p-6 space-y-4')}
        aria-label={t('monitoring.title', {}, { defaultValue: 'Monitoring' })}
      >
        <header className={cm.cn('flex items-center justify-between')}>
          <h1 className={cm.cn('text-2xl font-bold')}>
            {t('monitoring.title', {}, { defaultValue: 'Monitoring' })}
          </h1>
        </header>

        <div className={cm.cn('grid grid-cols-2 md:grid-cols-4 gap-3')}>
          <Stat
            label={t('monitoring.totalQueries', {}, { defaultValue: 'Total queries' })}
            value={total}
            dataMolId="mon-stat-total"
          />
          <Stat
            label={t('monitoring.successes', {}, { defaultValue: 'Successes' })}
            value={successes}
            dataMolId="mon-stat-success"
          />
          <Stat
            label={t('monitoring.errors', {}, { defaultValue: 'Errors' })}
            value={errors}
            dataMolId="mon-stat-error"
          />
          <Stat
            label={t('monitoring.avgDuration', {}, { defaultValue: 'Avg duration (ms)' })}
            value={avgMs}
            dataMolId="mon-stat-avg"
          />
        </div>

        <section className={cm.cn('rounded border border-border bg-surface p-4')}>
          <h2 className={cm.cn('text-sm font-bold uppercase text-muted mb-2')}>
            {t('nav.connections', {}, { defaultValue: 'Connections' })}
          </h2>
          <div data-mol-id="mon-connections-count" className={cm.cn('text-sm')}>
            {connections.length}
          </div>
          {!loaded && (
            <div className={cm.cn('text-xs text-muted')}>
              {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </div>
          )}
        </section>
      </div>
    </DatabaseAdminLayout>
  )
}

function Stat({ label, value, dataMolId }: { label: string; value: number; dataMolId: string }) {
  const cm = getClassMap()
  return (
    <div className={cm.cn('rounded border border-border bg-surface p-3')}>
      <div className={cm.cn('text-xs uppercase text-muted')}>{label}</div>
      <div data-mol-id={dataMolId} className={cm.cn('font-mono text-2xl')}>
        {value}
      </div>
    </div>
  )
}

export default Monitoring
