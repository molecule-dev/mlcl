import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { AuthSection } from '@molecule/app-settings-panel-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { DatabaseAdminLayout } from '../components/DatabaseAdminLayout.js'
import { apiGet, apiPatch } from '../lib/api.js'

interface UserProps {
  id: string
  email: string
  name?: string | null
  username?: string | null
  planKey?: string | null
}

// The user resource API returns `{ props, plan }`. We only care about props
// for display.
interface UserResponse {
  props: UserProps
}

interface BillingStatus {
  planKey?: string
  name?: string
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { user, logout } = useAuth<UserProps>()
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [tier, setTier] = useState<string>('Free')
  const [savedOk, setSavedOk] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const loadProfile = useCallback(async () => {
    if (!user?.id) return
    setError(null)
    try {
      const u = await apiGet<UserResponse>(http, `/api/users/${user.id}`)
      const props = u?.props ?? ({} as UserProps)
      setName(props.name ?? '')
      setUsername(props.username ?? '')
      setEmail(props.email ?? '')
    } catch (e) {
      setError((e as Error).message ?? 'load failed')
    }
  }, [http, user?.id])

  // Load freshest copy from /api/users/:id (read-after-write proves persistence).
  useEffect(() => {
    void loadProfile()
  }, [loadProfile])

  useEffect(() => {
    void apiGet<BillingStatus>(http, '/api/billing/status')
      .then((s) => {
        if (s?.name) setTier(s.name)
        else if (s?.planKey) setTier(s.planKey)
      })
      .catch(() => {
        /* tier stays 'Free' — billing endpoint may not exist on smoke */
      })
  }, [http])

  const onSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault()
      if (!user?.id) return
      setSaving(true)
      setSavedOk(false)
      setError(null)
      try {
        // Backend rejects empty username strings — only send when set.
        // The user update handler accepts name + email (+ username).
        const payload: { name: string; email?: string; username?: string } = { name }
        if (email) payload.email = email
        if (username) payload.username = username
        await apiPatch(http, `/api/users/${user.id}`, payload)
        setSavedOk(true)
        // Read-after-write: confirm the API actually persisted by reloading.
        await loadProfile()
      } catch (e) {
        setError((e as Error).message ?? 'save failed')
      } finally {
        setSaving(false)
      }
    },
    [email, http, loadProfile, name, user?.id, username],
  )

  const onSignOut = useCallback(async () => {
    try {
      await logout()
    } catch (_error) {
      /* ignore — logout failure is non-blocking; navigate to /login regardless */
    }
    navigate('/login')
  }, [logout, navigate])

  return (
    <DatabaseAdminLayout>
      <div
        data-mol-id="settings-page"
        className={cm.cn('flex-1 overflow-y-auto p-6 space-y-6')}
        aria-label={t('nav.settings', {}, { defaultValue: 'Settings' })}
      >
        <header className={cm.cn('flex items-center justify-between')}>
          <div>
            <h1 className={cm.cn('text-2xl font-bold')}>
              {t('nav.settings', {}, { defaultValue: 'Settings' })}
            </h1>
            <p className={cm.cn('text-sm text-muted')}>
              {t('settings.subtitle', {}, { defaultValue: 'Manage your account and plan.' })}
            </p>
          </div>
          <Link to="/pricing" className={cm.cn('rounded px-2 py-2 text-xs underline')}>
            {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
          </Link>
        </header>

        <section className={cm.cn('rounded border border-border bg-surface p-4 space-y-3')}>
          <h2 className={cm.cn('text-sm font-bold uppercase text-muted')}>
            {t('nav.profile', {}, { defaultValue: 'Profile' })}
          </h2>
          <form onSubmit={onSubmit} className={cm.cn('grid grid-cols-1 md:grid-cols-2 gap-4')}>
            <div className={cm.cn('space-y-1')}>
              <label
                htmlFor="settings-name"
                className={cm.cn('block text-xs uppercase text-muted')}
              >
                {t('form.name', {}, { defaultValue: 'Name' })}
              </label>
              <input
                id="settings-name"
                data-mol-id="settings-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={cm.cn(
                  'h-10 w-full rounded border border-border bg-bg px-3 font-mono text-sm focus:border-primary focus:outline-none',
                )}
              />
            </div>
            <div className={cm.cn('space-y-1')}>
              <label
                htmlFor="settings-username"
                className={cm.cn('block text-xs uppercase text-muted')}
              >
                {t('auth.username', {}, { defaultValue: 'Username' })}
              </label>
              <input
                id="settings-username"
                data-mol-id="settings-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={cm.cn(
                  'h-10 w-full rounded border border-border bg-bg px-3 font-mono text-sm focus:border-primary focus:outline-none',
                )}
              />
            </div>
            <div className={cm.cn('space-y-1')}>
              <label
                htmlFor="settings-email"
                className={cm.cn('block text-xs uppercase text-muted')}
              >
                {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
              </label>
              <input
                id="settings-email"
                data-mol-id="settings-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className={cm.cn(
                  'h-10 w-full rounded border border-border bg-bg px-3 font-mono text-sm focus:border-primary focus:outline-none',
                )}
              />
            </div>
            <div className={cm.cn('space-y-1')}>
              <label className={cm.cn('block text-xs uppercase text-muted')}>
                {t('nav.plan', {}, { defaultValue: 'Plan' })}
              </label>
              <div
                data-mol-id="settings-tier-value"
                className={cm.cn(
                  'h-10 w-full rounded border border-border bg-bg px-3 flex items-center font-mono text-sm',
                )}
              >
                {tier}
              </div>
            </div>
            <div className={cm.cn('md:col-span-2 flex items-center gap-3')}>
              <button
                type="submit"
                data-mol-id="settings-save"
                disabled={saving}
                className={cm.cn('rounded bg-primary px-3 py-2 text-sm font-bold text-on-primary')}
              >
                {saving
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                  : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
              </button>
              {savedOk && (
                <span data-mol-id="settings-saved-ok" className={cm.cn('text-xs text-primary')}>
                  {t('common.savedPeriod', {}, { defaultValue: 'Saved.' })}
                </span>
              )}
            </div>
            {error && (
              <div
                role="alert"
                data-mol-id="settings-error"
                className={cm.cn(
                  'md:col-span-2 rounded border border-error/30 bg-error/10 px-3 py-2 text-xs text-error',
                )}
              >
                {error}
              </div>
            )}
          </form>
        </section>

        <section className={cm.cn('rounded border border-border bg-surface p-4 space-y-3')}>
          <AuthSection />
        </section>

        <section className={cm.cn('rounded border border-border bg-surface p-4 space-y-3')}>
          <h2 className={cm.cn('text-sm font-bold uppercase text-muted')}>
            {t('footer.language', {}, { defaultValue: 'Language' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-muted')}>
            {t(
              'common.chooseTheLanguage',
              {},
              { defaultValue: 'Choose the language used throughout the app.' },
            )}
          </p>
          <LanguagePicker />
        </section>

        <section className={cm.cn('rounded border border-border bg-surface p-4 space-y-3')}>
          <h2 className={cm.cn('text-sm font-bold uppercase text-muted')}>
            {t('nav.appearance', {}, { defaultValue: 'Appearance' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-muted')}>
            {t(
              'common.toggleLightDark',
              {},
              { defaultValue: 'Toggle between light and dark mode.' },
            )}
          </p>
          <ThemeToggle />
        </section>
        <section className={cm.cn('rounded border border-border bg-surface p-4 space-y-3')}>
          <h2 className={cm.cn('text-sm font-bold uppercase text-muted')}>
            {t('settings.session', {}, { defaultValue: 'Session' })}
          </h2>
          <button
            type="button"
            data-mol-id="settings-signout"
            onClick={onSignOut}
            className={cm.cn('rounded border border-border px-3 py-2 text-sm')}
          >
            {t('settings.logOut', {}, { defaultValue: 'Sign out' })}
          </button>
        </section>
      </div>
    </DatabaseAdminLayout>
  )
}

export default Settings
