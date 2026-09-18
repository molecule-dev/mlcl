import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

const SECTIONS = [
  { key: 'account', defaultLabel: 'Account', icon: 'person' },
  { key: 'environments', defaultLabel: 'Environments', icon: 'public' },
  { key: 'apiKeys', defaultLabel: 'API keys', icon: 'vpn_key' },
  { key: 'webhooks', defaultLabel: 'Webhooks', icon: 'webhook' },
  { key: 'appearance', defaultLabel: 'Appearance', icon: 'dark_mode' },
  { key: 'language', defaultLabel: 'Language', icon: 'language' },
  { key: 'tiers', defaultLabel: 'Plan & billing', icon: 'workspace_premium' },
] as const

interface DeviceTokenRow {
  id: string
  device_id: string
  device_name?: string
  label: string | null
  enabled: boolean
  created_at: string
  last_used_at?: string | null
}

interface IotDevice {
  id: string
  name: string
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [active, setActive] = useState<(typeof SECTIONS)[number]['key']>('account')
  const [devices, setDevices] = useState<IotDevice[]>([])
  const [tokens, setTokens] = useState<DeviceTokenRow[]>([])
  const [tokensLoading, setTokensLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/devices?limit=500')
      .then(async (res) => {
        if (cancelled) return
        const list = unwrapList<Record<string, unknown>>(res).map((d) => ({
          id: String(d.id),
          name: String(d.name ?? d.id),
        }))
        setDevices(list)
        // Walk every device and collect its tokens
        const all: DeviceTokenRow[] = []
        await Promise.all(
          list.map(async (d) => {
            try {
              const tres = await http.get(`/api/devices/${d.id}/tokens`)
              const ts = unwrapList<Record<string, unknown>>(tres)
              for (const tk of ts) {
                all.push({
                  id: String(tk.id),
                  device_id: d.id,
                  device_name: d.name,
                  label: tk.label ? String(tk.label) : null,
                  enabled: Boolean(tk.enabled ?? true),
                  created_at: String(tk.created_at ?? new Date().toISOString()),
                  last_used_at: tk.last_used_at ? String(tk.last_used_at) : null,
                })
              }
            } catch (_error) {
              /* ignore per-device errors; other devices still load */
            }
          }),
        )
        if (cancelled) return
        all.sort((a, b) => b.created_at.localeCompare(a.created_at))
        setTokens(all)
      })
      .catch(() => {
        if (!cancelled) setTokens([])
      })
      .finally(() => {
        if (!cancelled) setTokensLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}>
      <header>
        <h1 className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight')}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'settings.subheading',
            {},
            { defaultValue: 'Account, environments, API keys, webhooks, and billing.' },
          )}
        </p>
      </header>

      <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-[220px_1fr]')}>
        <aside>
          <ul className={cm.cn('space-y-1')}>
            {SECTIONS.map((s) => {
              const isActive = active === s.key
              return (
                <li key={s.key}>
                  <button
                    type="button"
                    onClick={() => setActive(s.key)}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      cm.w('full'),
                      cm.flex({ align: 'center', gap: 'sm' }),
                      'rounded-xl text-sm font-bold transition-colors',
                      isActive
                        ? 'bg-primary-container text-on-primary-container'
                        : 'text-on-surface-variant hover:bg-surface-container-low',
                    )}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-base')}
                      aria-hidden="true"
                    >
                      {s.icon}
                    </span>
                    <span>
                      {t(`settings.section.${s.key}`, {}, { defaultValue: s.defaultLabel })}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </aside>

        <section className={cm.cn('bg-surface-container-lowest rounded-2xl shadow-sm p-8')}>
          {active === 'account' && <AccountPanel />}
          {active === 'environments' && <EnvironmentsPanel />}
          {active === 'apiKeys' && (
            <ApiKeysPanel
              tokens={tokens}
              loading={tokensLoading}
              devices={devices}
              onCreate={async (deviceId, label) => {
                const res = await http.post(`/api/devices/${deviceId}/tokens`, { label })
                const created = unwrapSingle<Record<string, unknown>>(res)
                if (created && created.id) {
                  setTokens((prev) => [
                    {
                      id: String(created.id),
                      device_id: deviceId,
                      device_name: devices.find((d) => d.id === deviceId)?.name,
                      label: created.label ? String(created.label) : null,
                      enabled: true,
                      created_at: String(created.created_at ?? new Date().toISOString()),
                      last_used_at: null,
                    },
                    ...prev,
                  ])
                }
                return created?.token ? String(created.token) : null
              }}
              onRevoke={async (deviceId, tokenId) => {
                await http.delete(`/api/devices/${deviceId}/tokens/${tokenId}`)
                setTokens((prev) => prev.filter((t) => t.id !== tokenId))
              }}
            />
          )}
          {active === 'webhooks' && <WebhooksPanel />}
          {active === 'appearance' && <AppearancePanel />}
          {active === 'language' && <LanguagePanel />}
          {active === 'tiers' && <TiersPanel />}
        </section>
      </div>
    </div>
  )
}

function AppearancePanel() {
  const { t } = useTranslation()
  return (
    <div>
      <PanelHeading
        title={t('settings.appearance.title', {}, { defaultValue: 'Appearance' })}
        body={t(
          'settings.appearance.description',
          {},
          { defaultValue: 'Toggle between light and dark mode.' },
        )}
      />
      <ThemeToggle />
    </div>
  )
}

function PanelHeading({ title, body }: { title: string; body: string }) {
  const cm = getClassMap()
  return (
    <div className={cm.sp('mb', 6)}>
      <h2 className={cm.cn('text-xl font-extrabold tracking-tight')}>{title}</h2>
      <p className={cm.cn('text-sm text-on-surface-variant mt-1')}>{body}</p>
    </div>
  )
}

function AccountPanel() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { state } = useAuth<{ id: string; email: string; name: string | null }>()
  const http = useHttpClient()
  const user = state.user

  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (user) {
      setName(user.name ?? '')
      setEmail(user.email ?? '')
    }
  }, [user])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || busy) return
    setBusy(true)
    setMessage(null)
    try {
      await http.patch(`/api/users/${user.id}`, { name: name.trim(), email: email.trim() })
      setMessage({
        kind: 'success',
        text: t('settings.account.saved', {}, { defaultValue: 'Profile saved.' }),
      })
    } catch (err) {
      setMessage({
        kind: 'error',
        text:
          err instanceof Error
            ? err.message
            : t('settings.account.saveError', {}, { defaultValue: 'Failed to save.' }),
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PanelHeading
        title={t('settings.account', {}, { defaultValue: 'Account' })}
        body={t(
          'settings.account.body',
          {},
          { defaultValue: 'Profile, password, and notification preferences.' },
        )}
      />
      {message && (
        <div
          className={cm.cn(
            cm.sp('mb', 4),
            cm.sp('px', 4),
            cm.sp('py', 3),
            'rounded-lg text-sm font-medium border',
            message.kind === 'success'
              ? 'bg-success-container text-on-success-container border-success'
              : 'bg-error-container text-on-error-container border-error',
          )}
        >
          {message.text}
        </div>
      )}
      <form onSubmit={onSubmit} className={cm.cn('grid grid-cols-1 md:grid-cols-2 gap-6')}>
        <Field
          label={t('settings.account.nameLabel', {}, { defaultValue: 'Display name' })}
          value={name}
          onChange={setName}
          placeholder={t('settings.account.namePlaceholder', {}, { defaultValue: 'Riley Ortega' })}
        />
        <Field
          label={t('settings.account.emailLabel', {}, { defaultValue: 'Email' })}
          value={email}
          onChange={setEmail}
          placeholder={t(
            'settings.account.emailPlaceholder',
            {},
            { defaultValue: 'riley@filament.io' },
          )}
        />
        <div className={cm.cn('md:col-span-2 flex justify-end gap-3')}>
          <button
            type="submit"
            disabled={busy}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              'rounded-lg bg-primary text-on-primary text-sm font-bold disabled:opacity-60',
            )}
          >
            {busy
              ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
              : t('common.save', {}, { defaultValue: 'Save' })}
          </button>
        </div>
      </form>
    </div>
  )
}

function EnvironmentsPanel() {
  const cm = getClassMap()
  const { t } = useTranslation()
  // The Filament backend exposes one HTTP ingest endpoint today
  // (POST /api/telemetry, POST /api/commands, POST /api/devices/:id/heartbeat,
  // authenticated with a per-device bearer token from the API keys panel).
  // Future releases will add MQTT brokers, regional cohorts, and per-env
  // staging/production isolation. We surface the actual ingest URL the
  // user should configure their devices against — no fake "CONNECTED"
  // pills for endpoints that don't exist yet.
  const apiBase = (() => {
    const env = import.meta.env?.VITE_API_URL
    if (env && typeof env === 'string') return env.replace(/\/$/, '')
    if (typeof window !== 'undefined') return `${window.location.origin}/api`
    return '/api'
  })()
  const ingestRoutes = [
    { path: '/devices/:id/telemetry', purpose: 'Telemetry ingest' },
    { path: '/devices/:id/heartbeat', purpose: 'Heartbeat / liveness' },
    { path: '/commands/:id/ack', purpose: 'Command acknowledgement' },
  ]
  return (
    <div>
      <PanelHeading
        title={t('settings.environments.title', {}, { defaultValue: 'Ingest endpoints' })}
        body={t(
          'settings.environments.body',
          {},
          {
            defaultValue:
              'Devices authenticate with a per-device bearer token (issue tokens in the API keys panel) and POST telemetry to the routes below.',
          },
        )}
      />
      <div
        className={cm.cn(
          'rounded-xl border border-outline-variant p-4 space-y-3 bg-surface-container-low',
        )}
      >
        <div>
          <p
            className={cm.cn(
              'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('settings.environments.baseUrl', {}, { defaultValue: 'API base URL' })}
          </p>
          <p className={cm.cn('text-sm font-mono text-primary mt-1 break-all')}>{apiBase}</p>
        </div>
        <ul className={cm.cn('space-y-2 pt-2 border-t border-outline-variant')}>
          {ingestRoutes.map((r) => (
            <li key={r.path} className={cm.cn('flex items-baseline justify-between gap-4')}>
              <span className={cm.cn('text-xs font-mono text-on-surface')}>
                POST {apiBase}
                {r.path}
              </span>
              <span
                className={cm.cn('text-[10px] uppercase tracking-widest text-on-surface-variant')}
              >
                {r.purpose}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <p className={cm.cn(cm.sp('mt', 4), cm.textSize('xs'), 'text-on-surface-variant')}>
        {t(
          'settings.environments.mqttRoadmap',
          {},
          {
            defaultValue:
              'Native MQTT broker peering and per-region cohorts arrive in a follow-up release.',
          },
        )}
      </p>
    </div>
  )
}

interface ApiKeysPanelProps {
  tokens: DeviceTokenRow[]
  loading: boolean
  devices: IotDevice[]
  onCreate: (deviceId: string, label: string) => Promise<string | null>
  onRevoke: (deviceId: string, tokenId: string) => Promise<void>
}

function ApiKeysPanel({ tokens, loading, devices, onCreate, onRevoke }: ApiKeysPanelProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [showCreate, setShowCreate] = useState(false)
  const [createDeviceId, setCreateDeviceId] = useState(devices[0]?.id ?? '')
  const [createLabel, setCreateLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [issuedToken, setIssuedToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!createDeviceId && devices.length > 0) setCreateDeviceId(devices[0].id)
  }, [createDeviceId, devices])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createDeviceId || busy) return
    setBusy(true)
    setError(null)
    try {
      const token = await onCreate(createDeviceId, createLabel.trim())
      setIssuedToken(
        token ?? t('settings.apiKeys.noTokenReturned', {}, { defaultValue: '(no token returned)' }),
      )
      setCreateLabel('')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('settings.apiKeys.createError', {}, { defaultValue: 'Failed to create token.' }),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PanelHeading
        title={t('settings.apiKeys.title', {}, { defaultValue: 'Device API tokens' })}
        body={t(
          'settings.apiKeys.body',
          {},
          {
            defaultValue:
              'Per-device bearer tokens for telemetry ingest, command ack, and heartbeat. Plaintext shown once at issue — store immediately.',
          },
        )}
      />
      <div className={cm.cn(cm.flex({ justify: 'end' }), cm.sp('mb', 4))}>
        <button
          type="button"
          onClick={() => {
            setShowCreate(true)
            setIssuedToken(null)
          }}
          disabled={devices.length === 0}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            'rounded-lg bg-primary text-on-primary text-sm font-bold disabled:opacity-50',
          )}
        >
          {t('settings.apiKeys.create', {}, { defaultValue: '+ Issue token' })}
        </button>
      </div>
      {loading ? (
        <p className={cm.cn('text-sm text-on-surface-variant py-4')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : tokens.length === 0 ? (
        <p className={cm.cn('text-sm text-on-surface-variant py-4')}>
          {devices.length === 0
            ? t(
                'settings.apiKeys.noDevices',
                {},
                { defaultValue: 'Register a device first to issue ingest tokens.' },
              )
            : t('settings.apiKeys.empty', {}, { defaultValue: 'No tokens issued yet.' })}
        </p>
      ) : (
        <ul className={cm.cn('space-y-3')}>
          {tokens.map((k) => (
            <li
              key={k.id}
              className={cm.cn(
                'rounded-xl border border-outline-variant p-4 flex items-start justify-between gap-4',
              )}
            >
              <div>
                <p className={cm.cn('text-sm font-bold')}>
                  {k.label || t('settings.apiKeys.unlabeled', {}, { defaultValue: '(unlabeled)' })}
                </p>
                <p className={cm.cn('text-[11px] font-mono text-on-surface-variant mt-1')}>
                  {k.device_name ?? k.device_id}
                </p>
                <p className={cm.cn('text-[10px] text-on-surface-variant mt-1')}>
                  id: {k.id.slice(0, 8)}… ·{' '}
                  {k.enabled
                    ? t('settings.apiKeys.enabled', {}, { defaultValue: 'enabled' })
                    : t('settings.apiKeys.revoked', {}, { defaultValue: 'revoked' })}
                </p>
              </div>
              <div className={cm.cn('text-right shrink-0')}>
                <p
                  className={cm.cn(
                    'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('settings.apiKeys.createdLabel', {}, { defaultValue: 'created' })}
                </p>
                <p className={cm.cn('text-[10px] font-mono mt-0.5')}>
                  {new Date(k.created_at).toLocaleString()}
                </p>
                {k.enabled && (
                  <button
                    type="button"
                    onClick={() => onRevoke(k.device_id, k.id)}
                    className={cm.cn(
                      cm.sp('mt', 2),
                      'text-[10px] font-bold uppercase tracking-widest text-error hover:underline',
                    )}
                  >
                    {t('common.revoke', {}, { defaultValue: 'Revoke' })}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {showCreate && (
        <div
          className={cm.cn(
            'fixed inset-0 z-50 bg-on-surface/40 backdrop-blur-sm flex items-center justify-center p-4',
          )}
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleCreate}
            className={cm.cn(
              'bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-lg',
              cm.sp('p', 6),
              cm.stack(4),
            )}
          >
            <h2 className={cm.cn('text-xl font-bold')}>
              {issuedToken
                ? t('settings.apiKeys.issuedTitle', {}, { defaultValue: 'Token issued' })
                : t('settings.apiKeys.createTitle', {}, { defaultValue: 'Issue new device token' })}
            </h2>
            {issuedToken ? (
              <>
                <p className={cm.cn('text-sm text-on-surface-variant')}>
                  {t(
                    'settings.apiKeys.issuedBody',
                    {},
                    { defaultValue: 'Copy this token — it will not be shown again:' },
                  )}
                </p>
                <pre
                  className={cm.cn(
                    'rounded-lg bg-surface-container p-3 text-xs font-mono break-all',
                  )}
                >
                  {issuedToken}
                </pre>
                <div className={cm.flex({ justify: 'end' })}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreate(false)
                      setIssuedToken(null)
                    }}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      'rounded-lg bg-primary text-on-primary text-sm font-bold',
                    )}
                  >
                    {t('common.done', {}, { defaultValue: 'Done' })}
                  </button>
                </div>
              </>
            ) : (
              <>
                {error && <p className={cm.cn('text-sm text-error')}>{error}</p>}
                <label className={cm.stack(2)}>
                  <span
                    className={cm.cn(
                      'text-xs font-bold uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('settings.apiKeys.deviceLabel', {}, { defaultValue: 'Device' })}
                  </span>
                  <select
                    value={createDeviceId}
                    onChange={(e) => setCreateDeviceId(e.target.value)}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      'rounded-lg border border-outline bg-surface text-sm',
                    )}
                  >
                    {devices.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={cm.stack(2)}>
                  <span
                    className={cm.cn(
                      'text-xs font-bold uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('settings.apiKeys.tokenLabel', {}, { defaultValue: 'Label (optional)' })}
                  </span>
                  <input
                    value={createLabel}
                    onChange={(e) => setCreateLabel(e.target.value)}
                    placeholder={t(
                      'settings.apiKeys.labelPlaceholder',
                      {},
                      { defaultValue: 'production-ingest' },
                    )}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      'rounded-lg border border-outline bg-surface text-sm',
                    )}
                  />
                </label>
                <div className={cm.flex({ justify: 'end', gap: 'sm' })}>
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      'text-sm font-semibold rounded-lg hover:bg-surface-container-low',
                    )}
                  >
                    {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                  </button>
                  <button
                    type="submit"
                    disabled={busy || !createDeviceId}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      'text-sm font-bold rounded-lg bg-primary text-on-primary disabled:opacity-60',
                    )}
                  >
                    {busy
                      ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
                      : t('settings.apiKeys.issue', {}, { defaultValue: 'Issue token' })}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      )}
    </div>
  )
}

function WebhooksPanel() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div>
      <PanelHeading
        title={t('settings.webhooks.title', {}, { defaultValue: 'Webhooks' })}
        body={t(
          'settings.webhooks.body',
          {},
          {
            defaultValue:
              'Forward alert and firmware events to PagerDuty, Slack, or any HTTPS endpoint.',
          },
        )}
      />
      <div
        className={cm.cn(
          'rounded-xl border border-dashed border-outline-variant p-8 text-center text-sm text-on-surface-variant',
        )}
      >
        <span
          className={cm.cn('material-symbols-outlined text-4xl text-on-surface-variant')}
          aria-hidden="true"
        >
          webhook
        </span>
        <p className={cm.cn(cm.sp('mt', 2), 'font-medium text-on-surface')}>
          {t(
            'settings.webhooks.empty.title',
            {},
            { defaultValue: 'Webhook delivery on the roadmap' },
          )}
        </p>
        <p className={cm.cn(cm.sp('mt', 1))}>
          {t(
            'settings.webhooks.empty.body',
            {},
            {
              defaultValue:
                'For now, alerts are queryable via /api/alerts and pushed via the realtime channel. Webhook fan-out arrives in the next release.',
            },
          )}
        </p>
      </div>
    </div>
  )
}

function LanguagePanel() {
  const { t } = useTranslation()
  return (
    <div>
      <PanelHeading
        title={t('footer.language', {}, { defaultValue: 'Language' })}
        body={t(
          'common.chooseTheLanguage',
          {},
          { defaultValue: 'Choose the language used throughout the app.' },
        )}
      />
      <LanguagePicker />
    </div>
  )
}

interface BillingStatus {
  planKey: string | null
  planExpiresAt: string | null
  planAutoRenews: boolean
}

function TiersPanel() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const [status, setStatus] = useState<BillingStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/billing/status')
      .then((res) => {
        if (cancelled) return
        const body = (res as { data?: unknown })?.data ?? res
        const obj = (body as Record<string, unknown>) ?? {}
        setStatus({
          planKey: obj.planKey ? String(obj.planKey) : null,
          planExpiresAt: obj.planExpiresAt ? String(obj.planExpiresAt) : null,
          planAutoRenews: Boolean(obj.planAutoRenews),
        })
      })
      .catch(() => {
        if (!cancelled) setStatus({ planKey: null, planExpiresAt: null, planAutoRenews: false })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const planLabel = loading
    ? t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })
    : status?.planKey
      ? status.planKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      : t('nav.free', {}, { defaultValue: 'Free' })

  return (
    <div>
      <PanelHeading
        title={t('nav.planAndBilling', {}, { defaultValue: 'Plan & billing' })}
        body={t(
          'settings.tiers.body',
          {},
          { defaultValue: 'Per-device pricing, fleet add-ons, and annual discounts.' },
        )}
      />
      <div
        className={cm.cn('relative overflow-hidden rounded-2xl p-6 text-white shadow-xl')}
        style={{
          background:
            'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
        }}
      >
        <p className={cm.cn('text-[11px] font-bold uppercase tracking-widest opacity-80')}>
          {t('nav.currentPlan', {}, { defaultValue: 'Current plan' })}
        </p>
        <p className={cm.cn('text-3xl font-extrabold mt-2')}>{planLabel}</p>
        <p className={cm.cn('text-sm opacity-80 mt-1')}>
          {status?.planExpiresAt
            ? t(
                'settings.tiers.renews',
                { date: new Date(status.planExpiresAt).toLocaleDateString() },
                { defaultValue: 'Renews {{date}}' },
              )
            : t('settings.tiers.noExpiry', {}, { defaultValue: 'No expiry' })}
        </p>
        <div
          className={cm.cn(cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }), cm.sp('mt', 5))}
        >
          <button
            type="button"
            onClick={() => navigate('/pricing')}
            className={cm.cn(
              'px-4 py-2 rounded-full text-xs font-bold bg-white text-primary hover:opacity-90 transition-opacity',
            )}
          >
            {t('settings.tiers.upgrade', {}, { defaultValue: 'View plans' })}
          </button>
        </div>
        <div
          className={cm.cn(
            'absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-white/10 blur-3xl pointer-events-none',
          )}
          aria-hidden="true"
        />
      </div>
    </div>
  )
}

function Field({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string
  placeholder: string
  value?: string
  onChange?: (value: string) => void
}) {
  const cm = getClassMap()
  return (
    <label className={cm.flex({ direction: 'col', gap: 'xs' })}>
      <span
        className={cm.cn('text-[10px] font-bold uppercase tracking-widest text-on-surface-variant')}
      >
        {label}
      </span>
      <input
        type="text"
        placeholder={placeholder}
        value={value ?? ''}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        readOnly={!onChange}
        className={cm.cn(
          cm.sp('px', 4),
          cm.sp('py', 2),
          'bg-surface-container-low rounded-xl border border-outline-variant text-sm focus:outline-none focus:ring-2 focus:ring-primary/30',
        )}
      />
    </label>
  )
}
