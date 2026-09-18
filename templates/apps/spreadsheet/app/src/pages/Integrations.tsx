import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { WorkbenchLayout } from '../components/WorkbenchLayout.js'

type ProviderId = 'google_drive' | 'slack' | 'zapier' | 'notion' | 'webhook'
type ConnectionStatus = 'pending' | 'connected' | 'revoked' | 'error'

interface IntegrationConnection {
  id: string
  user_id: string
  provider: ProviderId | string
  status: ConnectionStatus | string
  tokens: Record<string, unknown>
  created_at: string
  updated_at: string
}

interface ProviderMeta {
  id: ProviderId
  name: string
  description: string
  category: 'finance' | 'analytics' | 'comms' | 'storage' | 'engineering'
  glyph: string
}

const PROVIDERS: ProviderMeta[] = [
  {
    id: 'google_drive',
    name: 'Google Drive',
    description: 'Attach files inline. Workbook export to Drive on a schedule.',
    category: 'storage',
    glyph: 'cloud',
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Send automation alerts and respond to slash commands from any channel.',
    category: 'comms',
    glyph: 'chat',
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Trigger thousands of downstream apps when a row changes.',
    category: 'engineering',
    glyph: 'electric_bolt',
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Two-way sync of selected sheets to Notion databases.',
    category: 'storage',
    glyph: 'description',
  },
  {
    id: 'webhook',
    name: 'Webhook (custom)',
    description: 'POST any row change to a URL of your choosing. HMAC-signed.',
    category: 'engineering',
    glyph: 'link',
  },
]

const STATUS_TINT: Record<string, { bg: string; text: string; label: string }> = {
  connected: { bg: 'bg-success-light', text: 'text-success', label: 'Connected' },
  pending: { bg: 'bg-warning-light', text: 'text-warning', label: 'Pending' },
  available: {
    bg: 'bg-surface-container-high',
    text: 'text-on-surface-variant',
    label: 'Available',
  },
  revoked: { bg: 'bg-rose-100', text: 'text-error', label: 'Revoked' },
  error: { bg: 'bg-rose-100', text: 'text-error', label: 'Error' },
}

const CATEGORY_LABEL: Record<ProviderMeta['category'], string> = {
  finance: 'Finance',
  analytics: 'Analytics',
  comms: 'Communications',
  storage: 'Storage',
  engineering: 'Engineering',
}

export function Integrations() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [connections, setConnections] = useState<IntegrationConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyProvider, setBusyProvider] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function fetchConnections() {
      setLoading(true)
      setError(null)
      try {
        const res = await http.get<IntegrationConnection[]>('/integrations')
        if (cancelled) return
        setConnections(Array.isArray(res.data) ? res.data : [])
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchConnections()
    return () => {
      cancelled = true
    }
  }, [http])

  async function connect(provider: ProviderId): Promise<void> {
    setBusyProvider(provider)
    setError(null)
    try {
      const res = await http.post<IntegrationConnection>('/integrations', {
        provider,
        status: 'connected',
      })
      if (res.data) setConnections((prev) => [res.data!, ...prev])
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusyProvider(null)
    }
  }

  async function disconnect(connection: IntegrationConnection): Promise<void> {
    setBusyProvider(connection.provider)
    setError(null)
    try {
      await http.delete(`/integrations/${connection.id}`)
      setConnections((prev) => prev.filter((c) => c.id !== connection.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusyProvider(null)
    }
  }

  return (
    <WorkbenchLayout>
      <div>
        <p className={cm.cn('text-[10px] uppercase tracking-[0.25em] font-bold text-primary')}>
          {t(
            'integrations.eyebrow',
            { name: APP_NAME },
            { defaultValue: 'Connect {{name}} to the systems you already run' },
          )}
        </p>
        <h1
          className={cm.cn(
            cm.textSize('4xl'),
            'font-extrabold tracking-tight text-on-surface mt-1',
          )}
        >
          {t('nav.integrations', {}, { defaultValue: 'Integrations' })}
        </h1>
        <p
          className={cm.cn(cm.sp('mt', 1), cm.textSize('lg'), 'text-on-surface-variant max-w-2xl')}
        >
          {t(
            'integrations.subhead',
            {},
            {
              defaultValue:
                'Live data, two-way sync, webhooks. Every connection becomes a linked table so formulas can reference real numbers from the systems of record.',
            },
          )}
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className={cm.cn(cm.sp('p', 4), 'text-sm text-error bg-error-container/40 rounded-2xl')}
        >
          {error}
        </div>
      )}

      {loading ? (
        <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : (
        <div className={cm.cn(cm.grid({ cols: 3, gap: 'lg' }))} data-testid="integrations-grid">
          {PROVIDERS.map((provider) => {
            const connection = connections.find((c) => c.provider === provider.id)
            const status = connection?.status ?? 'available'
            const tint = STATUS_TINT[status] ?? STATUS_TINT.available!
            const isConnected = !!connection && status === 'connected'
            return (
              <article
                key={provider.id}
                data-testid={`integration-${provider.id}`}
                className={cm.cn(
                  cm.sp('p', 6),
                  'bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/40 hover:-translate-y-1 hover:shadow-md transition-all duration-300 flex flex-col gap-4',
                )}
              >
                <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.w(11),
                      cm.h(11),
                      'rounded-xl bg-primary-fixed text-primary',
                    )}
                    aria-hidden="true"
                  >
                    <span className="material-symbols-outlined text-[20px]">{provider.glyph}</span>
                  </span>
                  <span
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      'rounded-full text-[10px] font-black uppercase tracking-widest',
                      tint.bg,
                      tint.text,
                    )}
                  >
                    {tint.label}
                  </span>
                </div>
                <div>
                  <h3
                    className={cm.cn(
                      cm.textSize('lg'),
                      'font-extrabold tracking-tight text-on-surface',
                    )}
                  >
                    {provider.name}
                  </h3>
                  <p
                    className={cm.cn(
                      cm.sp('mt', 1),
                      cm.textSize('sm'),
                      'text-on-surface-variant leading-relaxed',
                    )}
                  >
                    {provider.description}
                  </p>
                </div>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    'mt-auto pt-3 border-t border-outline-variant/40',
                  )}
                >
                  <span className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
                    {CATEGORY_LABEL[provider.category]}
                  </span>
                  {isConnected && connection ? (
                    <button
                      onClick={() => disconnect(connection)}
                      disabled={busyProvider === provider.id}
                      type="button"
                      data-testid={`disconnect-${provider.id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-on-surface-variant hover:text-error transition-colors disabled:opacity-50"
                    >
                      {t('common.disconnect', {}, { defaultValue: 'Disconnect' })}
                    </button>
                  ) : (
                    <button
                      onClick={() => connect(provider.id)}
                      disabled={busyProvider === provider.id}
                      type="button"
                      data-testid={`connect-${provider.id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline disabled:opacity-50"
                    >
                      {busyProvider === provider.id
                        ? t('integrations.connecting', {}, { defaultValue: 'Connecting…' })
                        : t('common.connect', {}, { defaultValue: 'Connect' })}
                      <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                        arrow_forward
                      </span>
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </WorkbenchLayout>
  )
}

export default Integrations
