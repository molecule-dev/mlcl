/**
 * Connections — grid of available integrations grouped by category. Status
 * (connected / available / coming soon) is resolved server-side from
 * environment configuration.
 *
 * Data source: GET /api/connections.
 */
import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { IntegrationCard, type IntegrationStatus } from '../components/IntegrationCard.js'
import { WorkflowAppShell } from '../components/WorkflowAppShell.js'

interface IntegrationItem {
  id: string
  name: string
  category: string
  icon: string
  brandColor: string
  status: IntegrationStatus
  description: string
  badge?: string
}

interface ConnectionsResponse {
  data: IntegrationItem[]
  categories: string[]
}

export function Connections() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [response, setResponse] = useState<ConnectionsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [acknowledgedId, setAcknowledgedId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get<ConnectionsResponse>('/api/connections')
      .then((res) => {
        if (cancelled) return
        setResponse(res.data ?? { data: [], categories: [] })
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(
          e instanceof Error
            ? e.message
            : t('connections.error', {}, { defaultValue: 'Could not load connections.' }),
        )
        setResponse({ data: [], categories: [] })
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const items = response?.data ?? []
  const categories = response?.categories ?? []
  const connectedCount = items.filter((i) => i.status === 'connected').length

  return (
    <WorkflowAppShell
      pageId="connections"
      eyebrow={t(
        'connections.eyebrow',
        { connected: connectedCount },
        { defaultValue: 'Integrations · {{connected}} connected' },
      )}
      title={t('nav.connections', {}, { defaultValue: 'Connections' })}
      description={t(
        'connections.description',
        {},
        {
          defaultValue:
            'Wire your workflows into the systems your team already runs on. Provider keys live in `api/.env`.',
        },
      )}
    >
      {error && (
        <div
          role="alert"
          data-mol-id="connections-error"
          className={cm.cn(cm.sp('p', 3), cm.sp('mb', 4), cm.textSize('sm'), 'rounded-xl')}
          style={{
            background: 'var(--color-status-error-bg)',
            color: 'var(--color-status-error-fg)',
          }}
        >
          {error}
        </div>
      )}

      {response === null ? (
        <div
          className={cm.cn(cm.sp('p', 12), cm.textCenter, cm.textMuted)}
          data-mol-id="connections-loading"
        >
          {t('connections.loading', {}, { defaultValue: 'Loading integrations…' })}
        </div>
      ) : items.length === 0 ? (
        <div
          className={cm.cn(cm.sp('p', 12), cm.textCenter, 'rounded-xl bg-surface')}
          data-mol-id="connections-empty"
          style={{ border: '1px dashed var(--color-border)' }}
        >
          <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
            {t(
              'connections.empty',
              {},
              {
                defaultValue:
                  'No integrations registered. Configure provider keys to enable bonds.',
              },
            )}
          </p>
        </div>
      ) : (
        categories.map((cat) => {
          const inCat = items.filter((i) => i.category === cat)
          if (inCat.length === 0) return null
          return (
            <section key={cat} className={cm.sp('mb', 10)}>
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 4))}>
                <h2
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest',
                  )}
                  style={{ color: 'var(--color-node-condition)' }}
                >
                  {cat}
                </h2>
                <span className={'flex-1 h-px'} style={{ background: 'var(--color-border)' }} />
                <span className={cm.cn(cm.textSize('xs'), cm.textMuted)}>
                  {t(
                    'connections.count',
                    { n: inCat.length },
                    { defaultValue: '{{n}} integrations' },
                  )}
                </span>
              </div>
              <div className={'grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3'}>
                {inCat.map((item) => (
                  <div key={item.id} data-mol-id={`connection-${item.id}`}>
                    <IntegrationCard
                      name={item.name}
                      category={item.category}
                      icon={item.icon}
                      brandColor={item.brandColor}
                      status={item.status}
                      description={item.description}
                      onAction={() => setAcknowledgedId(item.id)}
                      badge={
                        item.badge ? (
                          <span
                            className={cm.cn(
                              cm.textSize('xs'),
                              cm.fontWeight('semibold'),
                              'uppercase tracking-widest',
                            )}
                            style={{ color: 'var(--color-foreground-secondary)' }}
                          >
                            {item.badge}
                          </span>
                        ) : null
                      }
                    />
                    {acknowledgedId === item.id && (
                      <p
                        className={cm.cn(cm.sp('mt', 2), cm.textSize('xs'), cm.textMuted)}
                        data-mol-id={`connection-${item.id}-ack`}
                      >
                        {t(
                          'connections.openEnv',
                          {},
                          {
                            defaultValue:
                              'To connect this provider, set its API key in api/.env and restart the server.',
                          },
                        )}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )
        })
      )}
    </WorkflowAppShell>
  )
}

export default Connections
