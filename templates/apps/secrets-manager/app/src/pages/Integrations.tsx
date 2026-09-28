import { type FormEvent, useEffect, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton } from '@molecule/app-ui-react'

import { SecretsManagerLayout } from '../components/SecretsManagerLayout.js'
import { SecretStatusPill, type SecretStatusTone } from '../components/SecretStatusPill.js'

interface IntegrationApi {
  id: string
  name: string
  category: 'doppler' | 'aws' | 'gcp' | 'azure' | 'vercel'
  status: 'connected' | 'disconnected' | 'error'
  last_sync?: string | null
}

const STATUS_TONE: Record<IntegrationApi['status'], SecretStatusTone> = {
  connected: 'active',
  disconnected: 'masked',
  error: 'revoked',
}

const CATEGORY_META: Record<
  IntegrationApi['category'],
  { icon: string; color: string; description: string }
> = {
  doppler: {
    icon: 'sync',
    color: '#a78bfa',
    description: 'Sync rotated secrets to Doppler config trees.',
  },
  aws: { icon: 'cloud', color: '#fb923c', description: 'Mirror vaults to AWS Secrets Manager.' },
  gcp: {
    icon: 'cloud_done',
    color: '#60a5fa',
    description: 'Bi-directional sync to GCP Secret Manager.',
  },
  azure: {
    icon: 'cloud_sync',
    color: '#3b82f6',
    description: 'Push to Azure Key Vault per resource group.',
  },
  vercel: {
    icon: 'rocket',
    color: '#33e6ad',
    description: 'Inject env vars into Vercel projects on deploy.',
  },
}

const CATEGORIES: IntegrationApi['category'][] = ['doppler', 'aws', 'gcp', 'azure', 'vercel']

export function Integrations() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [integrations, setIntegrations] = useState<IntegrationApi[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [category, setCategory] = useState<IntegrationApi['category']>('aws')
  const [submitting, setSubmitting] = useState(false)

  const reload = async () => {
    try {
      const res = await http.get<IntegrationApi[]>('/api/integrations')
      setIntegrations(Array.isArray(res.data) ? (res.data as IntegrationApi[]) : [])
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'load failed')
    }
  }

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        await reload()
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http])

  const submitNew = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    try {
      await http.post('/api/integrations', { name: name.trim(), category, config: {} })
      void track({ name: 'integration.connected', properties: { category } })
      setName('')
      setCategory('aws')
      setAdding(false)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'create failed')
    } finally {
      setSubmitting(false)
    }
  }

  const sync = async (id: string) => {
    try {
      await http.post(`/api/integrations/${id}/sync`, {})
      void track({ name: 'integration.synced', properties: { integration_id: id } })
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'sync failed')
    }
  }

  const remove = async (id: string) => {
    try {
      await http.delete(`/api/integrations/${id}`)
      void track({ name: 'integration.removed', properties: { integration_id: id } })
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'delete failed')
    }
  }

  return (
    <SecretsManagerLayout
      topAction={
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          data-mol-id="integrations-add-toggle"
          className={cm.cn(
            'inline-flex h-8 items-center gap-1 rounded bg-primary px-3 font-headline text-[12px] font-bold text-on-primary transition-colors hover:bg-primary/90',
          )}
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
            add
          </span>
          {t('integrations.add', {}, { defaultValue: 'Connect integration' })}
        </button>
      }
    >
      <div className={cm.cn('flex flex-col gap-5 p-6 pb-12 md:p-8')}>
        <header className={cm.cn('flex flex-col gap-2')}>
          <span className={cm.cn('font-mono text-[11px] uppercase tracking-widest text-muted')}>
            {t(
              'nav.integrations',
              { count: integrations.length },
              { defaultValue: `${integrations.length} integrations` },
            )}
          </span>
          <h1 className={cm.cn('font-headline text-3xl font-extrabold tracking-tight text-text')}>
            {t('integrations.heading', {}, { defaultValue: 'Integrations' })}
          </h1>
          <p className={cm.cn('font-body text-sm text-muted')}>
            {t(
              'integrations.subheading',
              {},
              {
                defaultValue:
                  'Sync rotated secrets to your cloud providers, CI runners, and orchestrators.',
              },
            )}
          </p>
        </header>

        {adding ? (
          <form
            onSubmit={submitNew}
            className={cm.cn(
              'flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 md:flex-row md:items-end md:gap-2',
            )}
          >
            <label
              className={cm.cn(
                'flex flex-1 flex-col gap-1 font-mono text-xs uppercase tracking-widest text-muted',
              )}
            >
              {t('form.displayName', {}, { defaultValue: 'Display name' })}
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={120}
                data-mol-id="integration-name"
                className={cm.cn(
                  'h-9 rounded-md border border-border bg-background px-3 font-mono text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
                )}
              />
            </label>
            <label
              className={cm.cn(
                'flex flex-col gap-1 font-mono text-xs uppercase tracking-widest text-muted',
              )}
            >
              {t('form.category', {}, { defaultValue: 'Category' })}
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as IntegrationApi['category'])}
                data-mol-id="integration-category"
                className={cm.cn(
                  'h-9 rounded-md border border-border bg-background px-3 font-mono text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
                )}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={submitting}
              data-mol-id="integration-submit"
              className={cm.cn(
                'inline-flex h-9 items-center gap-1 rounded bg-primary px-3 font-headline text-xs font-bold text-on-primary transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50',
              )}
            >
              {submitting
                ? t('common.connecting', {}, { defaultValue: 'Connecting…' })
                : t('common.connect', {}, { defaultValue: 'Connect' })}
            </button>
          </form>
        ) : null}

        {loading ? (
          <div
            data-mol-id="integrations-loading"
            className={cm.cn(
              'rounded-lg border border-border bg-surface p-6 text-center font-mono text-xs text-muted',
            )}
          >
            {t('integrations.loading', {}, { defaultValue: 'Loading integrations…' })}
          </div>
        ) : error ? (
          <div
            data-mol-id="integrations-error"
            className={cm.cn(
              'rounded-lg border border-error/40 bg-error/10 p-4 font-mono text-xs text-error',
            )}
          >
            {error}
          </div>
        ) : integrations.length === 0 ? (
          <div
            data-mol-id="integrations-empty"
            className={cm.cn(
              'flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-surface p-10 text-center',
            )}
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[28px] text-muted">
              cable
            </span>
            <p className={cm.cn('font-body text-sm text-muted')}>
              {t(
                'integrations.empty',
                {},
                {
                  defaultValue:
                    'No integrations connected. Plug into AWS, GCP, Vercel, or Doppler.',
                },
              )}
            </p>
          </div>
        ) : (
          <div className={cm.cn('grid gap-3 md:grid-cols-2')} data-mol-id="integrations-list">
            {integrations.map((integration) => {
              const meta = CATEGORY_META[integration.category]
              return (
                <article
                  key={integration.id}
                  data-mol-id={`integration-card-${integration.id}`}
                  className={cm.cn(
                    'flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary/40',
                    cm.accentCard({ tone: 'custom' }),
                  )}
                  style={{ ['--mol-accent' as string]: meta.color }}
                >
                  <header className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                    <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                      <span
                        className={cm.cn(
                          'inline-flex h-9 w-9 items-center justify-center rounded-md',
                        )}
                        style={{
                          backgroundColor: `color-mix(in srgb, ${meta.color} 12%, transparent)`,
                          color: meta.color,
                        }}
                      >
                        <span className="material-symbols-outlined text-[20px]">{meta.icon}</span>
                      </span>
                      <div className={cm.cn(cm.flex({ direction: 'col' }))}>
                        <h3 className={cm.cn('font-headline text-sm font-semibold text-text')}>
                          {integration.name}
                        </h3>
                        <span
                          className={cm.cn(
                            'font-mono text-[10px] uppercase tracking-widest text-muted',
                          )}
                        >
                          {integration.category}
                        </span>
                      </div>
                    </div>
                    <SecretStatusPill
                      tone={STATUS_TONE[integration.status]}
                      label={integration.status}
                      compact
                    />
                  </header>
                  <p className={cm.cn('font-body text-sm text-muted')}>{meta.description}</p>
                  <p className={cm.cn('font-mono text-[11px] text-muted')}>
                    {integration.last_sync
                      ? `Synced ${new Date(integration.last_sync).toLocaleString()}`
                      : t('integrations.neverSynced', {}, { defaultValue: 'Never synced' })}
                  </p>
                  <div className={cm.cn('flex items-center justify-end gap-2')}>
                    <button
                      type="button"
                      onClick={() => sync(integration.id)}
                      data-mol-id={`integration-sync-${integration.id}`}
                      className={cm.cn(
                        'inline-flex h-7 items-center gap-1 rounded border border-border bg-surface px-2 font-headline text-[11px] font-semibold text-text transition-colors hover:border-primary hover:text-primary',
                      )}
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
                        sync
                      </span>
                      {t('integrations.sync', {}, { defaultValue: 'Sync now' })}
                    </button>
                    {/* Two-step destructive confirm (arm → "Disconnect this
                        integration?" → commit, 6s auto-disarm, Escape,
                        aria-live) replacing window.confirm. */}
                    <ConfirmButton
                      label={t('common.disconnect', {}, { defaultValue: 'Disconnect' })}
                      confirmLabel={t(
                        'integrations.confirmDelete',
                        {},
                        { defaultValue: 'Disconnect this integration?' },
                      )}
                      onConfirm={() => remove(integration.id)}
                      color="error"
                      size="sm"
                      disarmSeconds={6}
                      data-mol-id={`integration-delete-${integration.id}`}
                    />
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </SecretsManagerLayout>
  )
}

export default Integrations
