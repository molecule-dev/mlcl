// Pattern source: derived from Settings per screen-map.json derivationNotes.
// Authed profile editor — avatar block, identity form, default provider, API token.
// Identity (name/email) saves through the molecule user resource
// (PATCH /users/:id); workspace defaults (bio, defaultProvider, timezone,
// apiToken) save through the app-specific PATCH /api/user-preferences
// handler — see api/src/handlers/user-preferences.ts.
import { useCallback, useEffect, useState } from 'react'

import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { PageHeader } from '../components/PageHeader.js'

const PROVIDERS = ['anthropic', 'openai', 'google'] as const

interface UserData {
  defaultProvider?: string
  defaultModel?: string
  timezone?: string
  bio?: string
  apiToken?: string
}

interface UserPreferencesRow {
  data?: UserData
}

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user, refresh } = useAuth<UserProfile & { data?: UserData }>()

  const userId = user?.id ?? ''

  const [userData, setUserData] = useState<UserData>({})
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [bio, setBio] = useState('')
  const [defaultProvider, setDefaultProvider] = useState('anthropic')
  const [timezone, setTimezone] = useState('UTC')
  const [apiToken, setApiToken] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const loadPrefs = useCallback(async () => {
    try {
      const res = await http.get<UserPreferencesRow>('/user-preferences')
      const next = (res.data?.data as UserData | undefined) ?? {}
      setUserData(next)
      setBio(next.bio ?? '')
      setDefaultProvider(next.defaultProvider ?? 'anthropic')
      setTimezone(next.timezone ?? 'UTC')
      setApiToken(next.apiToken ?? '')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [http])

  useEffect(() => {
    void loadPrefs()
  }, [loadPrefs])

  useEffect(() => {
    setName(user?.name ?? '')
    setEmail(user?.email ?? '')
  }, [user?.name, user?.email])

  const displayName = name || user?.name || 'Operator'
  const initials = displayName
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  function generateToken(): string {
    const random = Array.from(globalThis.crypto?.getRandomValues?.(new Uint8Array(16)) ?? [])
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('')
    return `neu_live_${random || Date.now().toString(36)}`
  }

  async function saveProfile(): Promise<void> {
    if (!userId) return
    setError(null)
    setInfo(null)
    try {
      // PATCH only the fields that actually have a value. Signup collects just
      // an email and a password, so a fresh account has no name — sending
      // `name: ''` made the resource reject the whole update with 400, and a
      // user who had only edited their EMAIL got "Request failed with status
      // 400." with nothing saved. Partial semantics are what PATCH is for.
      const changes: Record<string, string> = {}
      if (name.trim()) changes.name = name.trim()
      if (email.trim()) changes.email = email.trim()
      await http.patch(`/users/${userId}`, changes)
      const nextPrefs = {
        ...userData,
        bio,
        defaultProvider,
        timezone,
        apiToken,
      }
      await http.patch('/user-preferences', { data: nextPrefs })
      setUserData(nextPrefs)
      setInfo(t('common.profileSavedPeriod', {}, { defaultValue: 'Profile saved.' }))
      // Best-effort refresh of in-memory auth state. If the auth client
      // is not wired to issue refresh tokens (the default for this
      // template) this throws — the persisted PATCH already succeeded
      // so we swallow the error rather than rolling back the toast.
      try {
        await refresh()
      } catch (_error) {
        // ignore — the page will pick up the new name/email on next
        // navigation since the server is the source of truth.
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function selectProvider(provider: string): Promise<void> {
    setDefaultProvider(provider)
    if (!userId) return
    try {
      const next = { ...userData, defaultProvider: provider }
      await http.patch('/user-preferences', { data: next })
      setUserData(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function copyToken(): Promise<void> {
    try {
      await navigator.clipboard?.writeText?.(apiToken || '')
      setInfo(t('profile.tokenCopiedToast', {}, { defaultValue: 'Token copied.' }))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function regenerateToken(): Promise<void> {
    if (!userId) return
    const ok = window.confirm(
      t(
        'profile.regenerateConfirm',
        {},
        { defaultValue: 'Regenerate API token? Existing integrations will stop working.' },
      ),
    )
    if (!ok) return
    const next = generateToken()
    try {
      const nextPrefs = { ...userData, apiToken: next }
      await http.patch('/user-preferences', { data: nextPrefs })
      setApiToken(next)
      setUserData(nextPrefs)
      setInfo(t('profile.tokenRegeneratedToast', {}, { defaultValue: 'Token regenerated.' }))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  function cancelEdits(): void {
    setName(user?.name ?? '')
    setEmail(user?.email ?? '')
    setBio(userData.bio ?? '')
    setDefaultProvider(userData.defaultProvider ?? 'anthropic')
    setTimezone(userData.timezone ?? 'UTC')
    setApiToken(userData.apiToken ?? '')
    setError(null)
    setInfo(t('profile.cancelledToast', {}, { defaultValue: 'Edits discarded.' }))
  }

  const tokenDisplay = apiToken
    ? `${apiToken.slice(0, 9)}${'•'.repeat(Math.max(0, apiToken.length - 13))}${apiToken.slice(-4)}`
    : t('profile.noToken', {}, { defaultValue: 'no token yet' })

  return (
    <div data-mol-id="page-profile">
      <PageHeader
        subtitle={t(
          'profile.subtitle',
          {},
          { defaultValue: 'Personal preferences and your read-only API token.' },
        )}
        title={t('nav.profile', {}, { defaultValue: 'Profile' })}
      />

      {(error || info) && (
        <div className={cm.cn(cm.sp('mb', 4))}>
          {error && (
            <p
              className={cm.cn(cm.textSize('sm'), 'text-error font-mono')}
              data-mol-id="profile-error"
              role="alert"
            >
              {error}
            </p>
          )}
          {info && !error && (
            <p
              className={cm.cn(cm.textSize('sm'), 'text-success font-mono')}
              data-mol-id="profile-info"
            >
              {info}
            </p>
          )}
        </div>
      )}

      <div
        className={cm.cn(
          cm.sp('p', 6),
          'bg-surface-container-low rounded border border-outline-variant/15',
          'max-w-[720px] mx-auto',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }), cm.sp('mb', 6))}>
          <div
            className={cm.cn(
              cm.w(16),
              cm.h(16),
              cm.flex({ align: 'center', justify: 'center' }),
              cm.fontWeight('bold'),
              cm.textSize('xl'),
              cm.roundedFull,
              'bg-surface-container-highest text-on-surface font-mono uppercase ring-2 ring-primary',
            )}
          >
            {initials || 'OP'}
          </div>
          <div>
            <h2
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('lg'),
                'font-headline text-on-surface',
              )}
              data-mol-id="profile-display-name"
            >
              {displayName}
            </h2>
            <p className={'font-mono text-[10px] text-tertiary uppercase tracking-widest mt-1'}>
              {email || user?.email || ''}
            </p>
          </div>
        </div>

        <div className={cm.cn(cm.stack(4))}>
          <label className="block">
            <span
              className={cm.cn(
                cm.textSize('xs'),
                'font-label text-on-surface-variant block mb-1.5',
              )}
            >
              {t('profile.displayName', {}, { defaultValue: 'Display Name' })}
            </span>
            <input
              className={cm.cn(
                cm.w('full'),
                cm.sp('p', 3),
                cm.textSize('sm'),
                'bg-surface-container text-on-surface font-body rounded border border-outline-variant/15 focus:border-secondary focus:outline-none',
              )}
              data-mol-id="profile-name-input"
              onChange={(e) => setName(e.target.value)}
              type="text"
              value={name}
            />
          </label>
          <label className="block">
            <span
              className={cm.cn(
                cm.textSize('xs'),
                'font-label text-on-surface-variant block mb-1.5',
              )}
            >
              {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
            </span>
            <input
              className={cm.cn(
                cm.w('full'),
                cm.sp('p', 3),
                cm.textSize('sm'),
                'bg-surface-container text-on-surface font-mono rounded border border-outline-variant/15 focus:border-secondary focus:outline-none',
              )}
              data-mol-id="profile-email-input"
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              value={email}
            />
          </label>
          <label className="block">
            <span
              className={cm.cn(
                cm.textSize('xs'),
                'font-label text-on-surface-variant block mb-1.5',
              )}
            >
              {t('form.bio', {}, { defaultValue: 'Bio' })}
            </span>
            <textarea
              className={cm.cn(
                cm.w('full'),
                cm.sp('p', 3),
                cm.textSize('sm'),
                'h-[80px] bg-surface-container text-on-surface font-body rounded border border-outline-variant/15 focus:border-secondary focus:outline-none',
              )}
              data-mol-id="profile-bio-input"
              onChange={(e) => setBio(e.target.value)}
              value={bio}
            />
          </label>

          <div>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                'font-label text-on-surface-variant block mb-1.5',
              )}
            >
              {t('profile.defaultProvider', {}, { defaultValue: 'Default Provider' })}
            </span>
            <div className={cm.cn(cm.flex({ gap: 2 }), 'flex-wrap')}>
              {PROVIDERS.map((provider) => (
                <button
                  key={provider}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    cm.textSize('xs'),
                    'font-mono uppercase tracking-wider rounded border transition-colors',
                    defaultProvider === provider
                      ? 'bg-primary/15 text-primary border-primary'
                      : 'text-tertiary border-outline-variant/30 hover:border-outline-variant',
                  )}
                  data-mol-id={`profile-provider-${provider}`}
                  onClick={() => selectProvider(provider)}
                  type="button"
                >
                  {provider}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span
              className={cm.cn(
                cm.textSize('xs'),
                'font-label text-on-surface-variant block mb-1.5',
              )}
            >
              {t('form.timezone', {}, { defaultValue: 'Timezone' })}
            </span>
            <input
              className={cm.cn(
                cm.w('full'),
                cm.sp('p', 3),
                cm.textSize('sm'),
                'bg-surface-container text-on-surface font-mono rounded border border-outline-variant/15 focus:border-secondary focus:outline-none',
              )}
              data-mol-id="profile-timezone-input"
              onChange={(e) => setTimezone(e.target.value)}
              type="text"
              value={timezone}
            />
          </label>

          <div>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                'font-label text-on-surface-variant block mb-1.5',
              )}
            >
              {t('profile.apiToken', {}, { defaultValue: 'API Token' })}
            </span>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
              <code
                className={cm.cn(
                  cm.flex1,
                  cm.sp('p', 3),
                  cm.textSize('xs'),
                  'bg-surface-container text-on-surface font-mono rounded border border-outline-variant/15',
                )}
                data-mol-id="profile-api-token"
              >
                {tokenDisplay}
              </code>
              <button
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('xs'),
                  'font-mono uppercase tracking-wider text-on-surface bg-surface-container-high rounded hover:bg-surface-container-highest transition-colors',
                )}
                data-mol-id="profile-token-copy"
                disabled={!apiToken}
                onClick={copyToken}
                type="button"
              >
                {t('common.copy', {}, { defaultValue: 'Copy' })}
              </button>
              <button
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('xs'),
                  'font-mono uppercase tracking-wider text-error bg-surface-container-high rounded hover:bg-surface-container-highest transition-colors',
                )}
                data-mol-id="profile-token-regenerate"
                onClick={regenerateToken}
                type="button"
              >
                {t('profile.regenerate', {}, { defaultValue: 'Regenerate' })}
              </button>
            </div>
          </div>
        </div>

        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'end', gap: 3 }),
            cm.sp('mt', 6),
            cm.sp('pt', 4),
            'border-t border-outline-variant/15',
          )}
        >
          <button
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('medium'),
              cm.textSize('xs'),
              'font-mono uppercase tracking-wider text-tertiary hover:text-on-surface transition-colors',
            )}
            data-mol-id="profile-cancel"
            onClick={cancelEdits}
            type="button"
          >
            {t('common.cancel', {}, { defaultValue: 'Cancel' })}
          </button>
          <button
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('xs'),
              'btn-primary-gradient rounded text-on-primary-fixed font-mono uppercase tracking-wider',
            )}
            data-mol-id="profile-save"
            onClick={saveProfile}
            type="button"
          >
            {t('profile.save', {}, { defaultValue: 'Save Profile' })}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Profile
