import { useEffect, useState } from 'react'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { unwrapList } from '../lib/unwrap.js'

interface ApiTokenRecord {
  id: string
  label: string
  prefix: string
  created_at: string
}

interface IntegrationRecord {
  id: string
  provider: string
  name: string
  icon: string
  description: string
  connected: boolean
}

const DEFAULT_INTEGRATIONS: IntegrationRecord[] = [
  {
    id: 'gdrive',
    provider: 'google-drive',
    name: 'Google Drive',
    icon: 'cloud',
    description: 'Auto-file extracted documents into Drive folders.',
    connected: false,
  },
  {
    id: 'dbox',
    provider: 'dropbox',
    name: 'Dropbox',
    icon: 'cloud_circle',
    description: 'Mirror filed documents into a Dropbox tree.',
    connected: false,
  },
  {
    id: 'onedrv',
    provider: 'onedrive',
    name: 'OneDrive',
    icon: 'cloud_done',
    description: 'Sync filed documents to a OneDrive workspace.',
    connected: false,
  },
  {
    id: 'slack',
    provider: 'slack',
    name: 'Slack',
    icon: 'forum',
    description: 'Notify a channel when documents need review.',
    connected: false,
  },
]

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user, setUser } = useAuth<{ id: string; email: string; name?: string }>()

  const [accountName, setAccountName] = useState(user?.name ?? '')
  const [accountEmail, setAccountEmail] = useState(user?.email ?? '')
  const [accountSaving, setAccountSaving] = useState(false)
  const [accountSaved, setAccountSaved] = useState(false)
  const [accountError, setAccountError] = useState<string | null>(null)

  const [tokens, setTokens] = useState<ApiTokenRecord[]>([])
  const [tokensLoading, setTokensLoading] = useState(true)
  const [tokenLabel, setTokenLabel] = useState('')
  const [tokenCreating, setTokenCreating] = useState(false)
  const [newTokenSecret, setNewTokenSecret] = useState<string | null>(null)
  const [tokenError, setTokenError] = useState<string | null>(null)

  const [integrations, setIntegrations] = useState<IntegrationRecord[]>(DEFAULT_INTEGRATIONS)
  const [integrationLoading, setIntegrationLoading] = useState<string | null>(null)

  useEffect(() => {
    setAccountName(user?.name ?? '')
    setAccountEmail(user?.email ?? '')
  }, [user])

  useEffect(() => {
    let cancelled = false
    setTokensLoading(true)
    http
      .get('/api/api-tokens')
      .then((res) => {
        if (cancelled) return
        setTokens(unwrapList<ApiTokenRecord>(res))
      })
      .catch(() => {
        if (!cancelled) setTokens([])
      })
      .finally(() => {
        if (!cancelled) setTokensLoading(false)
      })
    http
      .get('/api/integrations')
      .then((res) => {
        if (cancelled) return
        const list = unwrapList<IntegrationRecord>(res)
        if (list.length) setIntegrations(list)
      })
      .catch(() => {
        if (!cancelled) setIntegrations(DEFAULT_INTEGRATIONS)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const handleAccountSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setAccountSaving(true)
    setAccountSaved(false)
    setAccountError(null)
    try {
      if (user?.id) {
        await http.patch(`/api/users/${user.id}`, { name: accountName, email: accountEmail })
        // Refresh local auth cache so reload reflects the saved name/email.
        setUser({ ...user, name: accountName, email: accountEmail })
      }
      setAccountSaved(true)
    } catch (err) {
      setAccountError(
        err instanceof Error
          ? err.message
          : t('settings.account.error', {}, { defaultValue: 'Failed to save.' }),
      )
    } finally {
      setAccountSaving(false)
    }
  }

  const handleCreateToken = async () => {
    if (!tokenLabel.trim()) return
    setTokenCreating(true)
    setTokenError(null)
    setNewTokenSecret(null)
    try {
      const res = await http.post('/api/api-tokens', { label: tokenLabel })
      const created = (res?.data ?? null) as (ApiTokenRecord & { secret?: string }) | null
      if (created) {
        setTokens((prev) => [created, ...prev])
        if (created.secret) setNewTokenSecret(created.secret)
      }
      setTokenLabel('')
    } catch (err) {
      setTokenError(
        err instanceof Error
          ? err.message
          : t('settings.api.error', {}, { defaultValue: 'Failed to create key.' }),
      )
    } finally {
      setTokenCreating(false)
    }
  }

  const handleRevokeToken = async (id: string) => {
    setTokens((prev) => prev.filter((tk) => tk.id !== id))
    try {
      await http.delete(`/api/api-tokens/${id}`)
    } catch (_error) {
      // Optimistic delete failed; attempt to restore the token list from server
      try {
        const res = await http.get('/api/api-tokens')
        setTokens(unwrapList<ApiTokenRecord>(res))
      } catch (_refetchError) {
        // Refetch also failed; leave optimistic state rather than looping
      }
    }
  }

  const handleToggleIntegration = async (record: IntegrationRecord) => {
    setIntegrationLoading(record.id)
    const next = !record.connected
    setIntegrations((prev) => prev.map((r) => (r.id === record.id ? { ...r, connected: next } : r)))
    try {
      if (next) {
        await http.post(`/api/integrations/${record.provider}/connect`)
      } else {
        await http.post(`/api/integrations/${record.provider}/disconnect`)
      }
    } catch (_error) {
      // Optimistic update: roll back connected state on failure
      setIntegrations((prev) =>
        prev.map((r) => (r.id === record.id ? { ...r, connected: !next } : r)),
      )
    } finally {
      setIntegrationLoading(null)
    }
  }

  return (
    <div
      data-mol-id="settings-page"
      className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, cm.stack(8))}
    >
      <header className={cm.flex({ direction: 'col', gap: 'xs' })}>
        <p
          className={cm.cn(cm.textSize('xs'), 'uppercase tracking-widest text-primary font-bold')}
          style={{ fontSize: 10 }}
        >
          {t('nav.workspace', {}, { defaultValue: 'Workspace' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'settings.subheading',
            { app: APP_NAME },
            {
              defaultValue:
                'Manage account, API keys, and filing integrations for your {{app}} workspace.',
            },
          )}
        </p>
      </header>

      <section
        data-mol-id="settings-account-section"
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm',
        )}
      >
        <header className={cm.cn(cm.sp('mb', 5))}>
          <h2 className={cm.cn(cm.textSize('lg'), 'font-bold')}>
            {t('settings.account', {}, { defaultValue: 'Account' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'settings.account.subheading',
              {},
              {
                defaultValue: 'Display name and primary email for notifications and audit history.',
              },
            )}
          </p>
        </header>
        <form
          className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-2')}
          onSubmit={handleAccountSave}
        >
          <label className={cm.flex({ direction: 'col', gap: 'xs' })}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                'uppercase tracking-widest text-on-surface-variant font-bold',
              )}
              style={{ fontSize: 10 }}
            >
              {t('settings.account.nameLabel', {}, { defaultValue: 'Workspace name' })}
            </span>
            <input
              data-mol-id="settings-account-name"
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                'rounded-lg bg-surface-container-low border border-outline-variant focus:outline-none focus:border-primary',
              )}
            />
          </label>
          <label className={cm.flex({ direction: 'col', gap: 'xs' })}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                'uppercase tracking-widest text-on-surface-variant font-bold',
              )}
              style={{ fontSize: 10 }}
            >
              {t('settings.account.emailLabel', {}, { defaultValue: 'Notification email' })}
            </span>
            <input
              data-mol-id="settings-account-email"
              type="email"
              value={accountEmail}
              onChange={(e) => setAccountEmail(e.target.value)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                'rounded-lg bg-surface-container-low border border-outline-variant focus:outline-none focus:border-primary',
              )}
            />
          </label>
          <div className={cm.cn('sm:col-span-2 flex items-center justify-between gap-3 flex-wrap')}>
            {accountError ? (
              <p
                data-mol-id="settings-account-error"
                role="alert"
                className={cm.cn(cm.textSize('sm'), 'text-error')}
              >
                {accountError}
              </p>
            ) : accountSaved ? (
              <p
                data-mol-id="settings-account-saved"
                className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
              >
                {t('common.savedPeriod', {}, { defaultValue: 'Saved.' })}
              </p>
            ) : (
              <span />
            )}
            <button
              type="submit"
              data-mol-id="settings-account-save"
              disabled={accountSaving}
              className={cm.cn(
                cm.sp('px', 6),
                cm.sp('py', 3),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-full bg-primary text-on-primary hover:opacity-90 transition-opacity disabled:opacity-60',
              )}
            >
              {accountSaving
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
            </button>
          </div>
        </form>
      </section>

      <section
        data-mol-id="settings-language-section"
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm',
        )}
      >
        <header className={cm.cn(cm.sp('mb', 5))}>
          <h2 className={cm.cn(cm.textSize('lg'), 'font-bold')}>
            {t('footer.language', {}, { defaultValue: 'Language' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'common.chooseTheLanguage',
              {},
              { defaultValue: 'Choose the language used throughout the app.' },
            )}
          </p>
        </header>
        <LanguagePicker />
      </section>

      <section className={cm.cn(cm.sp('p', 8), 'bg-surface-container-low rounded-xl')}>
        <div className={cm.sp('mb', 6)}>
          <h3 className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}>
            {t('nav.appearance', {}, { defaultValue: 'Appearance' })}
          </h3>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t(
              'common.toggleLightDark',
              {},
              { defaultValue: 'Toggle between light and dark mode.' },
            )}
          </p>
        </div>
        <ThemeToggle />
      </section>
      <section
        data-mol-id="settings-api-section"
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm',
        )}
      >
        <header className={cm.cn(cm.sp('mb', 5))}>
          <h2 className={cm.cn(cm.textSize('lg'), 'font-bold')}>
            {t('settings.api.heading', {}, { defaultValue: 'API keys' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'settings.api.subheading',
              {},
              {
                defaultValue:
                  'Use these to push documents from a script or your ERP. Rotate any key at any time.',
              },
            )}
          </p>
        </header>

        <div className={cm.cn(cm.flex({ gap: 'sm', wrap: 'wrap' }), cm.sp('mb', 4))}>
          <input
            data-mol-id="settings-api-label"
            type="text"
            value={tokenLabel}
            onChange={(e) => setTokenLabel(e.target.value)}
            placeholder={t(
              'settings.api.labelPlaceholder',
              {},
              { defaultValue: 'Key label (e.g. CI uploader)' },
            )}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'flex-1 min-w-[180px] rounded-lg bg-surface-container-low border border-outline-variant focus:outline-none focus:border-primary',
            )}
          />
          <button
            type="button"
            data-mol-id="settings-api-generate"
            onClick={handleCreateToken}
            disabled={tokenCreating || !tokenLabel.trim()}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'rounded-full bg-primary text-on-primary uppercase tracking-widest disabled:opacity-50',
            )}
            style={{ fontSize: 10 }}
          >
            {tokenCreating
              ? t('settings.api.generating', {}, { defaultValue: 'Generating…' })
              : t('settings.api.newKey', {}, { defaultValue: 'Generate key' })}
          </button>
        </div>

        {tokenError ? (
          <p
            data-mol-id="settings-api-error"
            role="alert"
            className={cm.cn(cm.textSize('sm'), cm.sp('mb', 3), 'text-error')}
          >
            {tokenError}
          </p>
        ) : null}

        {newTokenSecret ? (
          <div
            data-mol-id="settings-api-secret"
            className={cm.cn(
              cm.sp('p', 3),
              cm.sp('mb', 4),
              'rounded-md bg-tertiary/10 border border-tertiary/30 font-mono text-xs break-all',
            )}
          >
            <p
              className={cm.cn(
                cm.textSize('xs'),
                'uppercase tracking-widest text-on-surface-variant font-bold mb-1',
              )}
            >
              {t(
                'settings.api.copyOnce',
                {},
                { defaultValue: 'Copy this key — it will not be shown again' },
              )}
            </p>
            <code>{newTokenSecret}</code>
          </div>
        ) : null}

        <div
          className={cm.cn(
            'rounded-lg bg-surface-container-low border border-outline-variant/40 divide-y divide-outline-variant/30 font-mono text-sm',
          )}
        >
          {tokensLoading ? (
            <div className={cm.cn(cm.sp('p', 4), cm.textCenter, 'text-on-surface-variant text-sm')}>
              {t('settings.api.loading', {}, { defaultValue: 'Loading keys…' })}
            </div>
          ) : tokens.length === 0 ? (
            <div
              data-mol-id="settings-api-empty"
              className={cm.cn(cm.sp('p', 4), cm.textCenter, 'text-on-surface-variant text-sm')}
            >
              {t(
                'settings.api.empty',
                {},
                { defaultValue: 'No API keys yet. Generate one above.' },
              )}
            </div>
          ) : (
            tokens.map((key) => (
              <div
                key={key.id}
                data-mol-id={`settings-api-token-${key.id}`}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.flex({ align: 'center', justify: 'between' }),
                )}
              >
                <div>
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      'uppercase tracking-widest text-on-surface-variant font-bold',
                    )}
                    style={{ fontSize: 10 }}
                  >
                    {key.label}
                  </p>
                  <p className={cm.cn('text-on-surface tabular-nums')}>{key.prefix}…</p>
                </div>
                <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {t(
                      'settings.api.createdOn',
                      { date: new Date(key.created_at).toLocaleDateString() },
                      { defaultValue: 'Created {{date}}' },
                    )}
                  </p>
                  <button
                    type="button"
                    data-mol-id={`settings-api-revoke-${key.id}`}
                    onClick={() => handleRevokeToken(key.id)}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.textSize('xs'),
                      'rounded-md text-error hover:bg-error/10 font-bold uppercase tracking-widest',
                    )}
                    style={{ fontSize: 10 }}
                  >
                    {t('common.revoke', {}, { defaultValue: 'Revoke' })}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section
        data-mol-id="settings-integrations-section"
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm',
        )}
      >
        <header className={cm.cn(cm.sp('mb', 5))}>
          <h2 className={cm.cn(cm.textSize('lg'), 'font-bold')}>
            {t('settings.integrations.heading', {}, { defaultValue: 'Filing integrations' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'settings.integrations.subheading',
              {},
              {
                defaultValue:
                  'Send filed documents to the cloud drive or chat tool your team already lives in.',
              },
            )}
          </p>
        </header>
        <ul className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-2')}>
          {integrations.map((i) => (
            <li
              key={i.id}
              data-mol-id={`settings-integration-${i.provider}`}
              className={cm.cn(
                cm.sp('p', 4),
                cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
                'rounded-lg bg-surface-container-low border border-outline-variant/30',
              )}
            >
              <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'w-10 h-10 rounded-lg bg-primary/10 text-primary',
                  )}
                  aria-hidden="true"
                >
                  <span className={cm.cn('material-symbols-outlined')} style={{ fontSize: 20 }}>
                    {i.icon}
                  </span>
                </span>
                <div>
                  <p className={cm.cn(cm.textSize('sm'), 'font-bold')}>{i.name}</p>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {i.description}
                  </p>
                </div>
              </div>
              <button
                type="button"
                data-mol-id={`settings-integration-${i.provider}-toggle`}
                onClick={() => handleToggleIntegration(i)}
                disabled={integrationLoading === i.id}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'rounded-full uppercase tracking-widest transition-colors disabled:opacity-50',
                  i.connected
                    ? 'bg-primary/10 text-primary hover:bg-primary/20'
                    : 'border border-outline-variant text-on-surface hover:bg-surface-container',
                )}
                style={{ fontSize: 10 }}
              >
                {i.connected
                  ? t('common.disconnect', {}, { defaultValue: 'Disconnect' })
                  : t('common.connect', {}, { defaultValue: 'Connect' })}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
