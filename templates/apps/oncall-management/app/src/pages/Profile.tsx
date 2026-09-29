import { useCallback, useEffect, useState } from 'react'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BRAND_COLOR } from '../branding.js'
import { SeverityPill } from '../components/SeverityPill.js'

interface ProfileMe {
  user_id: string
  email: string
  display_name: string | null
  handle: string | null
  role: string | null
  location: string | null
  bio: string | null
  timezone: string | null
  oncall: boolean
  notification_prefs?: Record<string, boolean>
  alert_prefs?: Record<string, boolean>
}

interface ApiKey {
  id: string
  name: string
  prefix: string
  last_used_at: string | null
  last_used_label: string | null
  created_at: string
  revoked_at: string | null
  secret?: string
}

interface SessionRow {
  id: string
  user_agent: string
  ip_address: string | null
  city: string | null
  is_current: boolean
  last_seen_at: string | null
  created_at: string
}

interface ConnectedAccount {
  id?: string
  provider: string
  provider_username: string | null
  connected: boolean
  connected_at: string | null
}

interface TwoFactorSetup {
  QRImageUrl?: string
  keyUrl?: string
  secret?: string
}

const KNOWN_PROVIDERS = ['github', 'gitlab', 'google'] as const

function fmtRelative(iso: string | null): string {
  if (!iso) return 'never'
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 0) return 'just now'
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [me, setMe] = useState<ProfileMe | null>(null)
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([])
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null)
  const [creatingKey, setCreatingKey] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [savingDisplayName, setSavingDisplayName] = useState(false)
  const [displayNameDraft, setDisplayNameDraft] = useState('')
  const [editingDisplayName, setEditingDisplayName] = useState(false)
  const [savingEmail, setSavingEmail] = useState(false)
  const [emailDraft, setEmailDraft] = useState('')
  const [editingEmail, setEditingEmail] = useState(false)

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [tfMode, setTfMode] = useState<null | 'enable' | 'disable'>(null)
  const [tfSetup, setTfSetup] = useState<TwoFactorSetup | null>(null)
  const [tfToken, setTfToken] = useState('')
  const [tfLoading, setTfLoading] = useState(false)
  const [tfError, setTfError] = useState('')

  const reload = useCallback(async () => {
    try {
      const [meRes, keysRes, sessionsRes, accountsRes] = await Promise.all([
        http.get<ProfileMe>('/api/profile/me'),
        http.get<ApiKey[]>('/api/profile/api-keys'),
        http.get<SessionRow[]>('/api/profile/sessions'),
        http.get<ConnectedAccount[]>('/api/profile/connected-accounts'),
      ])
      setMe(meRes.data ?? null)
      setKeys(Array.isArray(keysRes.data) ? keysRes.data : [])
      setSessions(Array.isArray(sessionsRes.data) ? sessionsRes.data : [])
      const existing = Array.isArray(accountsRes.data) ? accountsRes.data : []
      const merged: ConnectedAccount[] = KNOWN_PROVIDERS.map((p) => {
        const found = existing.find((a) => a.provider === p)
        return (
          found ?? { provider: p, provider_username: null, connected: false, connected_at: null }
        )
      })
      setAccounts(merged)
    } catch (error) {
      logError('profile.reload', error)
      setError(t('profile.loadError', {}, { defaultValue: "Couldn't load profile data." }))
    }
  }, [http, t])

  useEffect(() => {
    void reload()
  }, [reload])

  // Read the persisted two-factor status from the canonical /users/me endpoint
  // (the bespoke /profile/me projection doesn't carry it). Best-effort: if the
  // app has no two-factor provider bonded or the read fails, it stays disabled.
  useEffect(() => {
    let cancelled = false
    http
      .get<{ props?: { twoFactorEnabled?: boolean }; twoFactorEnabled?: boolean }>('/api/users/me')
      .then((res) => {
        if (cancelled) return
        const body = res.data
        setTwoFactorEnabled(Boolean(body?.twoFactorEnabled ?? body?.props?.twoFactorEnabled))
      })
      .catch((error) => {
        logError('profile.twoFactorStatus', error)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const createKey = useCallback(async () => {
    setError(null)
    setRevealedSecret(null)
    if (!newKeyName.trim()) {
      setError(t('profile.apiKeyNameRequired', {}, { defaultValue: 'Name your key first.' }))
      return
    }
    try {
      const res = await http.post<ApiKey>('/api/profile/api-keys', { name: newKeyName.trim() })
      const created = res.data
      if (created?.secret) setRevealedSecret(created.secret)
      setNewKeyName('')
      setCreatingKey(false)
      await reload()
    } catch (error) {
      logError('profile.createKey', error)
      setError(t('profile.apiKeyCreateError', {}, { defaultValue: "Couldn't create key." }))
    }
  }, [http, newKeyName, reload, t])

  const revokeKey = useCallback(
    async (id: string) => {
      try {
        await http.delete(`/api/profile/api-keys/${id}`)
        await reload()
      } catch (error) {
        logError('profile.revokeKey', error)
        setError(t('profile.apiKeyRevokeError', {}, { defaultValue: "Couldn't revoke key." }))
      }
    },
    [http, reload, t],
  )

  const revokeSession = useCallback(
    async (id: string) => {
      try {
        await http.delete(`/api/profile/sessions/${id}`)
        await reload()
      } catch (error) {
        logError('profile.revokeSession', error)
        setError(t('profile.sessionRevokeError', {}, { defaultValue: "Couldn't revoke session." }))
      }
    },
    [http, reload, t],
  )

  const toggleAccount = useCallback(
    async (provider: string, connected: boolean) => {
      try {
        await http.put('/api/profile/connected-accounts', {
          provider,
          provider_username: connected ? (me?.email ?? null) : null,
          connected,
        })
        await reload()
      } catch (error) {
        logError('profile.toggleAccount', error)
        setError(t('profile.connectionError', {}, { defaultValue: "Couldn't update connection." }))
      }
    },
    [http, me, reload, t],
  )

  const saveDisplayName = useCallback(async () => {
    setSavingDisplayName(true)
    try {
      await http.patch('/api/profile/me', { display_name: displayNameDraft.trim() || null })
      await reload()
      setEditingDisplayName(false)
    } catch (error) {
      logError('profile.saveDisplayName', error)
      setError(t('profile.saveError', {}, { defaultValue: "Couldn't save profile." }))
    } finally {
      setSavingDisplayName(false)
    }
  }, [displayNameDraft, http, reload, t])

  const saveEmail = useCallback(async () => {
    const next = emailDraft.trim()
    if (!me?.user_id || !next || next === (me?.email ?? '')) {
      setEditingEmail(false)
      return
    }
    setSavingEmail(true)
    setError(null)
    try {
      await http.patch(`/api/users/${me.user_id}`, { email: next })
      await reload()
      setEditingEmail(false)
    } catch (error) {
      logError('profile.saveEmail', error)
      setError(t('profile.emailSaveError', {}, { defaultValue: "Couldn't update email." }))
    } finally {
      setSavingEmail(false)
    }
  }, [emailDraft, http, me, reload, t])

  const closeTwoFactor = useCallback(() => {
    setTfMode(null)
    setTfSetup(null)
    setTfToken('')
    setTfError('')
  }, [])

  const startEnableTwoFactor = useCallback(async () => {
    if (!me?.user_id) return
    setTfError('')
    setTfToken('')
    setTfSetup(null)
    setTfMode('enable')
    setTfLoading(true)
    try {
      const res = await http.post<TwoFactorSetup>(`/api/users/${me.user_id}/verify-two-factor`, {
        action: 'setup',
      })
      setTfSetup(res.data ?? null)
    } catch (error) {
      logError('profile.twoFactorSetup', error)
      setTfError(
        t(
          'profile.twoFactorUnavailable',
          {},
          { defaultValue: 'Two-factor authentication is not available right now.' },
        ),
      )
    } finally {
      setTfLoading(false)
    }
  }, [http, me, t])

  const startDisableTwoFactor = useCallback(() => {
    setTfError('')
    setTfToken('')
    setTfSetup(null)
    setTfMode('disable')
  }, [])

  const submitTwoFactor = useCallback(
    async (action: 'enable' | 'disable') => {
      if (!me?.user_id) return
      setTfError('')
      setTfLoading(true)
      try {
        await http.post(`/api/users/${me.user_id}/verify-two-factor`, {
          action,
          token: tfToken.trim(),
        })
        setTwoFactorEnabled(action === 'enable')
        closeTwoFactor()
      } catch (error) {
        logError('profile.twoFactorSubmit', error)
        setTfError(
          t('profile.twoFactorInvalidCode', {}, { defaultValue: 'Invalid code — try again.' }),
        )
      } finally {
        setTfLoading(false)
      }
    },
    [closeTwoFactor, http, me, t, tfToken],
  )

  const initial = (me?.display_name ?? me?.email ?? '?').slice(0, 1).toUpperCase()
  const displayName =
    me?.display_name ??
    (me?.email ? me.email.split('@')[0] : t('settings.account', {}, { defaultValue: 'Account' }))

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <header className={cm.cn('flex items-start gap-6 flex-wrap mb-8')}>
        <span
          className={cm.cn(
            'h-16 w-16 rounded-full flex items-center justify-center font-bold text-2xl shrink-0',
          )}
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-primary) 18%, transparent)',
            color: BRAND_COLOR,
            border: '2px solid color-mix(in srgb, var(--color-primary) 40%, transparent)',
          }}
          aria-hidden="true"
        >
          {initial}
        </span>
        <div>
          <p
            className={cm.cn('font-mono text-xs font-bold uppercase tracking-widest mb-1')}
            style={{ color: BRAND_COLOR }}
          >
            {t('profile.eyebrow', {}, { defaultValue: '// profile' })}
          </p>
          <h1
            className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}
            style={{ color: 'var(--color-text)' }}
          >
            {displayName}
          </h1>
          <p
            className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'font-mono')}
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {me?.email ?? '—'}
          </p>
          <h2
            className={cm.cn('mt-2 font-mono text-[10px] font-black uppercase tracking-widest')}
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            {t(
              'profile.identityHeading',
              {},
              { defaultValue: 'SRE Identity & Hardware Telemetry' },
            )}
          </h2>
        </div>
      </header>

      {error ? (
        <p
          role="alert"
          className={cm.cn('mb-4 font-mono text-xs')}
          style={{ color: 'var(--color-severity-critical)' }}
        >
          {error}
        </p>
      ) : null}

      {revealedSecret ? (
        <div
          role="dialog"
          aria-label={t(
            'profile.apiKeySecretTitle',
            {},
            { defaultValue: 'New API key — copy now' },
          )}
          className={cm.cn('mb-6 rounded-xl p-4')}
          style={{
            backgroundColor: 'var(--color-background-secondary)',
            border: '1px solid color-mix(in srgb, var(--color-primary) 40%, transparent)',
          }}
        >
          <p
            className={cm.cn('font-mono text-[10px] font-bold uppercase tracking-widest mb-2')}
            style={{ color: BRAND_COLOR }}
          >
            {t('profile.apiKeySecretEyebrow', {}, { defaultValue: '// new key — shown once' })}
          </p>
          <code
            data-testid="api-key-secret"
            className={cm.cn('block font-mono text-sm break-all')}
            style={{ color: 'var(--color-text)' }}
          >
            {revealedSecret}
          </code>
          <button
            type="button"
            onClick={() => setRevealedSecret(null)}
            className={cm.cn(
              'mt-3 px-3 py-1.5 rounded font-mono text-[10px] font-bold uppercase tracking-widest',
            )}
            style={{ backgroundColor: BRAND_COLOR, color: 'var(--color-on-primary)' }}
          >
            {t('profile.gotIt', {}, { defaultValue: "I've copied it" })}
          </button>
        </div>
      ) : null}

      <section className={cm.cn('grid gap-6 grid-cols-1 lg:grid-cols-12')}>
        <div className={cm.cn('min-w-0 lg:col-span-7 space-y-6')}>
          <Card
            title={t(
              'profile.coreIdentity',
              {},
              { defaultValue: '1. Core Identity & SRE Profile' },
            )}
          >
            {editingDisplayName ? (
              <div className={cm.cn('flex items-center gap-2 py-2.5')}>
                <span
                  className={cm.cn(
                    'font-mono text-[10px] font-black uppercase tracking-widest w-40 shrink-0',
                  )}
                  style={{ color: 'var(--color-severity-muted)' }}
                >
                  {t('form.displayName', {}, { defaultValue: 'Display name' })}
                </span>
                <input
                  data-testid="profile-display-name-input"
                  value={displayNameDraft}
                  onChange={(e) => setDisplayNameDraft(e.target.value)}
                  className={cm.cn('flex-1 px-2 py-1 rounded font-mono text-sm')}
                  style={{
                    backgroundColor: 'var(--color-background-secondary)',
                    color: 'var(--color-text)',
                    border: '1px solid var(--color-border)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => void saveDisplayName()}
                  disabled={savingDisplayName}
                  className={cm.cn(
                    'font-mono text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded disabled:opacity-50',
                  )}
                  style={{ backgroundColor: BRAND_COLOR, color: 'var(--color-on-primary)' }}
                >
                  {savingDisplayName ? '…' : t('common.save', {}, { defaultValue: 'Save' })}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingDisplayName(false)}
                  className={cm.cn(
                    'font-mono text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded hover:bg-surface/5',
                  )}
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                </button>
              </div>
            ) : (
              <FieldRow
                label={t('form.displayName', {}, { defaultValue: 'Display name' })}
                value={displayName}
                action={t('common.edit', {}, { defaultValue: 'Edit' })}
                onAction={() => {
                  setDisplayNameDraft(me?.display_name ?? '')
                  setEditingDisplayName(true)
                }}
                actionTestId="profile-display-name-edit"
              />
            )}
            {editingEmail ? (
              <div className={cm.cn('flex items-center gap-2 py-2.5')}>
                <span
                  className={cm.cn(
                    'font-mono text-[10px] font-black uppercase tracking-widest w-40 shrink-0',
                  )}
                  style={{ color: 'var(--color-severity-muted)' }}
                >
                  {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                </span>
                <input
                  data-testid="profile-email-input"
                  type="email"
                  autoComplete="email"
                  value={emailDraft}
                  onChange={(e) => setEmailDraft(e.target.value)}
                  className={cm.cn('flex-1 px-2 py-1 rounded font-mono text-sm')}
                  style={{
                    backgroundColor: 'var(--color-background-secondary)',
                    color: 'var(--color-text)',
                    border: '1px solid var(--color-border)',
                  }}
                />
                <button
                  type="button"
                  data-testid="profile-email-save"
                  onClick={() => void saveEmail()}
                  disabled={savingEmail}
                  className={cm.cn(
                    'font-mono text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded disabled:opacity-50',
                  )}
                  style={{ backgroundColor: BRAND_COLOR, color: 'var(--color-on-primary)' }}
                >
                  {savingEmail ? '…' : t('common.save', {}, { defaultValue: 'Save' })}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingEmail(false)}
                  className={cm.cn(
                    'font-mono text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded hover:bg-surface/5',
                  )}
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                </button>
              </div>
            ) : (
              <FieldRow
                label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                value={me?.email ?? '—'}
                mono
                action={t('common.edit', {}, { defaultValue: 'Edit' })}
                onAction={() => {
                  setEmailDraft(me?.email ?? '')
                  setEditingEmail(true)
                }}
                actionTestId="profile-email-edit"
              />
            )}
            <FieldRow
              label={t('auth.login.password', {}, { defaultValue: 'Password' })}
              value="••••••••••"
              action={t('profile.change', {}, { defaultValue: 'Change' })}
              onAction={() => {
                window.location.assign('/forgot-password')
              }}
            />
          </Card>

          {/* 2. Telephony & pager bindings — where pages reach this responder */}
          <Card
            title={t(
              'profile.pagerBindings',
              {},
              { defaultValue: '2. Multi-Carrier Telephony & Pager Bindings' },
            )}
          >
            <FieldRow
              label={t('profile.bindingInApp', {}, { defaultValue: 'In-app pager' })}
              value={t('profile.bindingInAppValue', {}, { defaultValue: 'Bound to this account' })}
              valueStyle={{ color: 'var(--color-severity-resolved)' }}
            />
            <FieldRow
              label={t('profile.bindingPush', {}, { defaultValue: 'Critical push' })}
              value={t(
                'profile.bindingPushValue',
                {},
                { defaultValue: 'APNs/FCM critical alerts — bypasses Do-Not-Disturb' },
              )}
            />
            <FieldRow
              label={t('profile.bindingVoice', {}, { defaultValue: 'Voice & SMS trunks' })}
              value={t(
                'profile.bindingVoiceValue',
                {},
                { defaultValue: 'Routed through the rotation schedules you belong to' },
              )}
            />
            <FieldRow
              label={t('profile.bindingEscalation', {}, { defaultValue: 'Escalation identity' })}
              value={t(
                'profile.bindingEscalationValue',
                {},
                { defaultValue: 'Paged by every policy ladder that lists you' },
              )}
            />
          </Card>

          <Card
            title={t(
              'profile.securityFido',
              {},
              { defaultValue: '3. Security, Master Password & Hardware FIDO2' },
            )}
          >
            <FieldRow
              label={t('profile.twoFactor', {}, { defaultValue: 'Two-factor auth' })}
              value={
                twoFactorEnabled
                  ? t('profile.twoFactorEnabled', {}, { defaultValue: 'Enabled' })
                  : t('profile.twoFactorDisabled', {}, { defaultValue: 'Disabled' })
              }
              valueStyle={{
                color: twoFactorEnabled ? BRAND_COLOR : 'var(--color-text-tertiary)',
              }}
              action={
                twoFactorEnabled
                  ? t('profile.twoFactorDisable', {}, { defaultValue: 'Disable' })
                  : t('profile.twoFactorEnable', {}, { defaultValue: 'Enable' })
              }
              onAction={
                twoFactorEnabled ? startDisableTwoFactor : () => void startEnableTwoFactor()
              }
              actionTestId="two-factor-toggle"
            />
            {tfMode ? (
              <div
                data-testid="two-factor-panel"
                className={cm.cn('mt-1 mb-2.5 rounded-lg p-3')}
                style={{
                  backgroundColor: 'var(--color-background-secondary)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {tfError ? (
                  <p
                    role="alert"
                    data-testid="two-factor-error"
                    className={cm.cn('font-mono text-xs mb-2')}
                    style={{ color: 'var(--color-severity-critical)' }}
                  >
                    {tfError}
                  </p>
                ) : null}
                {tfMode === 'enable' && tfSetup?.QRImageUrl ? (
                  <div className={cm.cn('mb-3 space-y-2 text-center')}>
                    <p
                      className={cm.cn('font-mono text-xs')}
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {t(
                        'profile.twoFactorScan',
                        {},
                        {
                          defaultValue:
                            'Scan this QR code with your authenticator app, then enter the 6-digit code.',
                        },
                      )}
                    </p>
                    <img
                      src={tfSetup.QRImageUrl}
                      alt={t('profile.twoFactorQrAlt', {}, { defaultValue: 'Two-factor QR code' })}
                      className={cm.cn('mx-auto w-40 h-40')}
                    />
                    {tfSetup.secret ? (
                      <p
                        className={cm.cn('font-mono text-[10px] break-all')}
                        style={{ color: 'var(--color-text-tertiary)' }}
                      >
                        {tfSetup.secret}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {tfMode === 'enable' && !tfSetup && !tfError ? (
                  <p
                    className={cm.cn('font-mono text-xs')}
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {t(
                      'profile.twoFactorSettingUp',
                      {},
                      { defaultValue: 'Generating setup code…' },
                    )}
                  </p>
                ) : null}
                {tfMode === 'disable' || tfSetup ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      void submitTwoFactor(tfMode === 'disable' ? 'disable' : 'enable')
                    }}
                    className={cm.cn('flex items-center gap-2')}
                  >
                    <input
                      data-testid="two-factor-code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={tfToken}
                      onChange={(e) => setTfToken(e.target.value)}
                      placeholder={t(
                        'profile.twoFactorCode',
                        {},
                        { defaultValue: 'Authentication code' },
                      )}
                      className={cm.cn('flex-1 px-2 py-1.5 rounded font-mono text-sm')}
                      style={{
                        backgroundColor: 'var(--color-surface)',
                        color: 'var(--color-text)',
                        border: '1px solid var(--color-border)',
                      }}
                    />
                    <button
                      type="submit"
                      data-testid="two-factor-submit"
                      disabled={tfLoading || !tfToken.trim()}
                      className={cm.cn(
                        'px-3 py-1.5 rounded font-mono text-[10px] font-bold uppercase tracking-widest disabled:opacity-50',
                      )}
                      style={{
                        backgroundColor:
                          tfMode === 'disable' ? 'var(--color-severity-critical)' : BRAND_COLOR,
                        color:
                          tfMode === 'disable'
                            ? 'var(--color-on-error)'
                            : 'var(--color-on-primary)',
                      }}
                    >
                      {tfLoading
                        ? '…'
                        : tfMode === 'disable'
                          ? t('profile.twoFactorDisable', {}, { defaultValue: 'Disable' })
                          : t('profile.twoFactorVerify', {}, { defaultValue: 'Verify' })}
                    </button>
                    <button
                      type="button"
                      onClick={closeTwoFactor}
                      className={cm.cn(
                        'px-3 py-1.5 rounded font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-surface/5',
                      )}
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                    </button>
                  </form>
                ) : (
                  <div className={cm.cn('mt-2')}>
                    <button
                      type="button"
                      onClick={closeTwoFactor}
                      className={cm.cn(
                        'px-3 py-1.5 rounded font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-surface/5',
                      )}
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                    </button>
                  </div>
                )}
              </div>
            ) : null}
            <FieldRow
              label={t('form.role', {}, { defaultValue: 'Role' })}
              value={me?.role ?? t('profile.roleNone', {}, { defaultValue: 'Not set' })}
              mono
            />
          </Card>

          <Card
            title={t(
              'profile.cliTokens',
              {},
              { defaultValue: '4. CLI Tokens & Personal API Access' },
            )}
          >
            {keys.length === 0 ? (
              <p
                data-testid="api-keys-empty"
                className={cm.cn('font-mono text-xs py-2')}
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {t(
                  'profile.noApiKeys',
                  {},
                  { defaultValue: 'No API keys yet — create one to ingest events from your CI.' },
                )}
              </p>
            ) : (
              <ul
                data-testid="api-keys-list"
                className={cm.cn('divide-y')}
                style={{ borderColor: 'var(--color-border-subtle)' }}
              >
                {keys.map((k) => (
                  <li
                    key={k.id}
                    data-testid="api-key-row"
                    className={cm.cn('flex items-center gap-3 py-3 first:pt-0')}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-base')}
                      style={{ color: BRAND_COLOR }}
                      aria-hidden="true"
                    >
                      key
                    </span>
                    <div className={cm.cn('flex-1 min-w-0')}>
                      <p
                        className={cm.cn('text-sm font-bold')}
                        style={{ color: 'var(--color-text)' }}
                      >
                        {k.name}
                      </p>
                      <p
                        className={cm.cn('font-mono text-xs')}
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        <span style={{ color: 'var(--color-text-code)' }}>{k.prefix}</span>
                        <span className={cm.cn('mx-1.5 opacity-50')}>·</span>
                        {t('profile.created', {}, { defaultValue: 'created' })}{' '}
                        {fmtRelative(k.created_at)}
                        <span className={cm.cn('mx-1.5 opacity-50')}>·</span>
                        {t('profile.lastUsed', {}, { defaultValue: 'used' })}{' '}
                        {k.last_used_label ?? fmtRelative(k.last_used_at)}
                      </p>
                    </div>
                    <button
                      onClick={() => void revokeKey(k.id)}
                      type="button"
                      data-testid="api-key-revoke"
                      className={cm.cn(
                        'font-mono text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded hover:bg-surface/5',
                      )}
                      style={{ color: 'var(--color-severity-critical)' }}
                    >
                      {t('common.revoke', {}, { defaultValue: 'Revoke' })}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {creatingKey ? (
              <div className={cm.cn('mt-3 flex items-center gap-2')}>
                <input
                  data-testid="api-key-name-input"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder={t(
                    'profile.apiKeyNamePlaceholder',
                    {},
                    { defaultValue: 'Production ingest' },
                  )}
                  className={cm.cn('flex-1 px-2 py-1.5 rounded font-mono text-sm')}
                  style={{
                    backgroundColor: 'var(--color-background-secondary)',
                    color: 'var(--color-text)',
                    border: '1px solid var(--color-border)',
                  }}
                />
                <button
                  type="button"
                  data-testid="api-key-create-confirm"
                  onClick={() => void createKey()}
                  className={cm.cn(
                    'px-3 py-1.5 rounded font-mono text-[10px] font-bold uppercase tracking-widest',
                  )}
                  style={{ backgroundColor: BRAND_COLOR, color: 'var(--color-on-primary)' }}
                >
                  {t('common.create', {}, { defaultValue: 'Create' })}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCreatingKey(false)
                    setNewKeyName('')
                  }}
                  className={cm.cn(
                    'px-3 py-1.5 rounded font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-surface/5',
                  )}
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                </button>
              </div>
            ) : (
              <button
                type="button"
                data-testid="api-key-create-open"
                onClick={() => setCreatingKey(true)}
                className={cm.cn(
                  'mt-3 px-3 py-1.5 rounded font-mono text-[10px] font-bold uppercase tracking-widest border',
                )}
                style={{
                  borderColor: 'color-mix(in srgb, var(--color-primary) 40%, transparent)',
                  color: BRAND_COLOR,
                }}
              >
                {t('profile.newApiKey', {}, { defaultValue: '+ New API key' })}
              </button>
            )}
          </Card>
        </div>

        <aside className={cm.cn('min-w-0 lg:col-span-5 space-y-6')}>
          <Card title={t('profile.connectedAccounts', {}, { defaultValue: 'Connected accounts' })}>
            <ul data-testid="connected-accounts" className={cm.cn('space-y-2.5')}>
              {accounts.map((c) => (
                <li key={c.provider} className={cm.cn('flex items-center gap-3')}>
                  <span
                    className={cm.cn('font-mono text-sm font-bold capitalize')}
                    style={{ color: 'var(--color-text)' }}
                  >
                    {c.provider}
                  </span>
                  <span
                    className={cm.cn('font-mono text-xs')}
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {c.provider_username ?? '—'}
                  </span>
                  <span className={cm.cn('ml-auto')}>
                    <SeverityPill
                      severity={c.connected ? 'resolved' : 'ignored'}
                      label={
                        c.connected
                          ? t('status.connected', {}, { defaultValue: 'Connected' })
                          : t('profile.notConnected', {}, { defaultValue: 'Not connected' })
                      }
                    />
                  </span>
                  <button
                    type="button"
                    data-testid={`connect-${c.provider}`}
                    onClick={() => void toggleAccount(c.provider, !c.connected)}
                    className={cm.cn(
                      'font-mono text-[10px] font-bold uppercase tracking-widest hover:opacity-80',
                    )}
                    style={{
                      color: c.connected
                        ? 'var(--color-severity-critical)'
                        : 'var(--color-text-code)',
                    }}
                  >
                    {c.connected
                      ? t('common.disconnect', {}, { defaultValue: 'Disconnect' })
                      : t('common.connect', {}, { defaultValue: 'Connect' })}
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <Card title={t('nav.activeSessions', {}, { defaultValue: 'Active sessions' })}>
            {sessions.length === 0 ? (
              <p
                className={cm.cn('font-mono text-xs')}
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {t('profile.noSessions', {}, { defaultValue: 'No active sessions.' })}
              </p>
            ) : (
              <ul data-testid="sessions-list" className={cm.cn('space-y-2.5')}>
                {sessions.map((s) => (
                  <li
                    key={s.id}
                    data-testid="session-row"
                    data-current={s.is_current ? 'true' : 'false'}
                    className={cm.cn('flex items-center gap-3 rounded-md px-3 py-2.5')}
                    style={{
                      backgroundColor: 'var(--color-background-tertiary)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-base')}
                      style={{ color: BRAND_COLOR }}
                      aria-hidden="true"
                    >
                      devices
                    </span>
                    <div className={cm.cn('flex-1 min-w-0')}>
                      <p
                        className={cm.cn('text-sm font-bold truncate')}
                        style={{ color: 'var(--color-text)' }}
                      >
                        {s.user_agent ||
                          t('profile.unknownDevice', {}, { defaultValue: 'Unknown device' })}
                      </p>
                      <p
                        className={cm.cn('font-mono text-xs')}
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        <span style={{ color: 'var(--color-text-code)' }}>
                          {s.ip_address ?? '—'}
                        </span>
                        <span className={cm.cn('mx-1.5 opacity-50')}>·</span>
                        {s.city ?? t('profile.unknownLocation', {}, { defaultValue: 'unknown' })}
                        <span className={cm.cn('mx-1.5 opacity-50')}>·</span>
                        {fmtRelative(s.last_seen_at ?? s.created_at)}
                      </p>
                    </div>
                    {s.is_current ? (
                      <span
                        className={cm.cn(
                          'font-mono text-[10px] font-bold uppercase tracking-widest',
                        )}
                        style={{ color: BRAND_COLOR }}
                      >
                        {t('profile.thisDevice', {}, { defaultValue: 'this device' })}
                      </span>
                    ) : (
                      <button
                        onClick={() => void revokeSession(s.id)}
                        type="button"
                        data-testid="session-revoke"
                        className={cm.cn(
                          'font-mono text-[10px] font-bold uppercase tracking-widest hover:opacity-80',
                        )}
                        style={{ color: 'var(--color-severity-critical)' }}
                      >
                        {t('common.revoke', {}, { defaultValue: 'Revoke' })}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={t('nav.preferences', {}, { defaultValue: 'Preferences' })}>
            <FieldRow
              label={t('form.timezone', {}, { defaultValue: 'Timezone' })}
              value={me?.timezone ?? 'UTC'}
              mono
            />
            <FieldRow
              label={t('profile.oncall', {}, { defaultValue: 'On-call' })}
              value={
                me?.oncall
                  ? t('profile.oncallYes', {}, { defaultValue: 'Active rotation' })
                  : t('profile.oncallNo', {}, { defaultValue: 'Not on-call' })
              }
              valueStyle={me?.oncall ? { color: BRAND_COLOR } : undefined}
            />
          </Card>
        </aside>
      </section>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  const cm = getClassMap()
  return (
    <section
      className={cm.cn('rounded-2xl p-6')}
      style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      <h2
        className={cm.cn('text-sm font-mono font-black uppercase tracking-widest mb-4')}
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {title}
      </h2>
      {children}
    </section>
  )
}

function FieldRow({
  label,
  value,
  action,
  mono = false,
  valueStyle,
  onAction,
  actionTestId,
}: {
  label: string
  value: string
  action?: string
  mono?: boolean
  valueStyle?: React.CSSProperties
  onAction?: () => void
  actionTestId?: string
}) {
  const cm = getClassMap()
  return (
    <div className={cm.cn('flex items-center gap-3 py-2.5 first:pt-0 last:pb-0')}>
      <span
        className={cm.cn(
          'font-mono text-[10px] font-black uppercase tracking-widest w-40 shrink-0',
        )}
        style={{ color: 'var(--color-severity-muted)' }}
      >
        {label}
      </span>
      <span
        className={mono ? 'font-mono text-sm' : 'text-sm'}
        style={{ color: 'var(--color-text)', ...(valueStyle ?? {}) }}
      >
        {value}
      </span>
      {action ? (
        <button
          onClick={onAction}
          type="button"
          data-testid={actionTestId}
          className={cm.cn(
            'ml-auto font-mono text-[10px] font-bold uppercase tracking-widest hover:opacity-80',
          )}
          style={{ color: 'var(--color-text-code)' }}
        >
          {action}
        </button>
      ) : null}
    </div>
  )
}
