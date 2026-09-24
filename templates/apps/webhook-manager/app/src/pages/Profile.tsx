import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'

import { getClient as getHttpClient } from '@molecule/app-http'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Alert, ConfirmButton, PromptDialog } from '@molecule/app-ui-react'

import { APP_NAME, BRAND_COLOR } from '../branding.js'
import { StatusPill } from '../components/StatusPill.js'
import { useApi } from '../lib/useApi.js'

const PANEL_BG = 'var(--mol-color-surface)'
const PANEL_BORDER = 'var(--mol-color-border)'
const FIELD_BORDER = 'var(--mol-color-border)'

interface ApiUser {
  id: string
  name?: string | null
  username?: string | null
  email?: string | null
  emailAddress?: string | null
  preferences?: unknown
  createdAt?: string
  updatedAt?: string
}

interface ApiSession {
  id: string
  userId: string
  name?: string | null
  pushPlatform?: string | null
  createdAt?: string
  updatedAt?: string
}

interface PrefDef {
  id: string
  defaultLabel: string
  defaultBody: string
}

const PREF_DEFS: PrefDef[] = [
  {
    id: 'darkTheme',
    defaultLabel: 'Default to dark theme',
    defaultBody: '{{app}} defaults to dark; light mode follows your OS preference if disabled.',
  },
  {
    id: 'compactRows',
    defaultLabel: 'Compact log rows',
    defaultBody: 'Tighter padding in Deliveries — fits ~24 rows on a 1080p display.',
  },
  {
    id: 'shortcuts',
    defaultLabel: 'Keyboard shortcuts hint bar',
    defaultBody: 'Show the bottom-of-page shortcut bar on every authenticated page.',
  },
  {
    id: 'criticalAlerts',
    defaultLabel: 'Email me on critical alerts',
    defaultBody: '{{app}} will email when an endpoint auto-pauses or fails 5xx > 50% over 10m.',
  },
]

const parsePrefs = (raw: unknown): Record<string, boolean> => {
  if (!raw) return {}
  if (typeof raw === 'object' && raw !== null) return raw as Record<string, boolean>
  if (typeof raw === 'string') {
    try {
      const v = JSON.parse(raw)
      return typeof v === 'object' && v !== null ? (v as Record<string, boolean>) : {}
    } catch (_error) {
      // invalid JSON — return empty prefs object
      return {}
    }
  }
  return {}
}

const splitName = (full: string | null | undefined): { first: string; last: string } => {
  const v = (full ?? '').trim()
  if (!v) return { first: '', last: '' }
  const parts = v.split(/\s+/)
  if (parts.length === 1) return { first: parts[0], last: '' }
  return { first: parts[0], last: parts.slice(1).join(' ') }
}

const fmtRelative = (s: string | null | undefined): string => {
  if (!s) return '—'
  const ms = Date.now() - new Date(s).getTime()
  const sec = Math.floor(ms / 1000)
  if (sec < 60) return 'now'
  const mins = Math.floor(sec / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 86_400)}d ago`
}

const initialsFor = (first: string, last: string, fallback: string): string => {
  const a = (first || '').trim()
  const b = (last || '').trim()
  if (a || b) return `${a[0] ?? ''}${b[0] ?? ''}`.toUpperCase()
  return fallback.slice(0, 2).toUpperCase()
}

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: user, refetch: refetchUser } = useApi<ApiUser>('/profile')
  const { data: sessionsData, refetch: refetchSessions } = useApi<ApiSession[]>('/profile/sessions')

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [prefs, setPrefs] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const sessions = useMemo(() => sessionsData ?? [], [sessionsData])
  const hydratedFromUserRef = useRef<string | null>(null)

  // Determine the "current" session: assume the most-recently updated row is
  // the live browser session (devices.updatedAt is touched on every request).
  const currentSessionId = useMemo(() => {
    if (sessions.length === 0) return null
    const sorted = [...sessions].sort((a, b) => {
      const ta = new Date(a.updatedAt ?? 0).getTime()
      const tb = new Date(b.updatedAt ?? 0).getTime()
      return tb - ta
    })
    return sorted[0]?.id ?? null
  }, [sessions])

  useEffect(() => {
    if (!user?.id) return
    // Hydrate form fields from server data once per user identity. After the
    // first hydration we keep local edits intact — refetches (e.g. after the
    // PATCH save) must not clobber whatever the user typed since.
    if (hydratedFromUserRef.current === user.id) return
    hydratedFromUserRef.current = user.id
    const { first, last } = splitName(user.name)
    setFirstName(first)
    setLastName(last)
    setDisplayName(user.username ?? '')
    setEmail(user.emailAddress ?? user.email ?? '')
    const stored = parsePrefs(user.preferences)
    const merged: Record<string, boolean> = {}
    for (const def of PREF_DEFS) {
      merged[def.id] = stored[def.id] ?? true
    }
    setPrefs(merged)
  }, [user])

  const hydrated = hydratedFromUserRef.current !== null && !!user?.id

  const togglePref = (id: string) => {
    setPrefs((p) => ({ ...p, [id]: !p[id] }))
  }

  const saveProfile = async () => {
    setSaving(true)
    setError(null)
    try {
      const client = getHttpClient()
      const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ')
      await client.patch('/profile', {
        name: fullName,
        username: displayName.trim(),
        preferences: prefs,
      })
      // Email lives on the user resource, not the app's /profile prefs endpoint
      // (its schema only accepts name/username/preferences). PATCH the standard
      // user CRUD route — /api/users/:id — when the address actually changed.
      const serverEmail = user?.emailAddress ?? user?.email ?? ''
      const nextEmail = email.trim()
      if (user?.id && nextEmail && nextEmail !== serverEmail) {
        await client.patch(`/users/${user.id}`, { email: nextEmail })
      }
      setSavedAt(Date.now())
      refetchUser()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  const revokeSession = async (id: string) => {
    try {
      const client = getHttpClient()
      await client.delete(`/profile/sessions/${id}`)
      refetchSessions()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Revoke failed.')
    }
  }

  const deleteAccount = async (entered: string) => {
    const confirmText = t('profile.deleteConfirmText', {}, { defaultValue: 'DELETE' })
    if (entered !== confirmText) {
      setDeleteError(
        t(
          'profile.deleteConfirmPrompt',
          { confirm: confirmText },
          { defaultValue: 'This is permanent. Type {{confirm}} to confirm:' },
        ),
      )
      throw new Error('confirmation-text-mismatch')
    }
    setDeleteError(null)
    try {
      const client = getHttpClient()
      await client.delete('/profile')
      navigate('/login', { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed.'
      setDeleteError(message)
      throw new Error(message, { cause: err })
    }
  }

  return (
    <div
      className={cm.cn(cm.sp('p', 6), 'max-w-4xl mx-auto')}
      style={{ color: 'var(--mol-color-text)' }}
      data-mol-id="profile-root"
    >
      <div className={cm.cn('mb-6')}>
        <p
          className={cm.cn('font-mono text-xs font-bold uppercase tracking-widest mb-2')}
          style={{ color: BRAND_COLOR }}
        >
          {t('profile.eyebrow', {}, { defaultValue: 'you · personal account' })}
        </p>
        <h1
          className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight')}
          style={{ color: 'var(--mol-color-text)' }}
        >
          {t('nav.profile', {}, { defaultValue: 'Profile' })}
        </h1>
        <p
          className={cm.cn('mt-2 text-sm max-w-xl')}
          style={{ color: 'var(--mol-color-text-secondary)' }}
        >
          {t(
            'profile.body',
            {},
            { defaultValue: 'Your account, preferences, and active sessions.' },
          )}
        </p>
      </div>

      {error && (
        <p
          className={cm.cn('mb-4 text-xs font-mono')}
          style={{ color: 'var(--mol-color-error)' }}
          role="alert"
        >
          {error}
        </p>
      )}

      {!hydrated && (
        <section
          className={cm.cn('rounded-xl p-6 mb-6 text-sm font-mono')}
          style={{
            backgroundColor: PANEL_BG,
            border: `1px solid ${PANEL_BORDER}`,
            color: 'var(--mol-color-text-secondary)',
          }}
          data-mol-id="profile-loading"
        >
          {t('nav.loadingProfile', {}, { defaultValue: 'Loading profile…' })}
        </section>
      )}

      {hydrated && (
        <>
          <section
            className={cm.cn('rounded-xl p-6 mb-6')}
            style={{ backgroundColor: PANEL_BG, border: `1px solid ${PANEL_BORDER}` }}
            data-mol-id="profile-identity"
          >
            <h2
              className={cm.cn('text-base font-extrabold tracking-tight mb-4')}
              style={{ color: 'var(--mol-color-text)' }}
            >
              {t('nav.identity', {}, { defaultValue: 'Identity' })}
            </h2>
            <div className={cm.cn('flex items-center gap-4 flex-wrap mb-5')}>
              <span
                className={cm.cn(
                  'inline-flex h-16 w-16 items-center justify-center rounded-full font-mono text-2xl font-extrabold',
                )}
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--mol-color-primary) 15%, transparent)',
                  color: 'var(--mol-color-primary)',
                  boxShadow:
                    '0 0 0 4px color-mix(in srgb, var(--mol-color-primary) 10%, transparent)',
                }}
                aria-hidden="true"
                data-mol-id="profile-avatar-initials"
              >
                {initialsFor(firstName, lastName, email || 'U')}
              </span>
              <div>
                <p
                  className={cm.cn('font-mono text-xs font-bold tracking-wider uppercase')}
                  style={{ color: 'var(--mol-color-text-secondary)' }}
                >
                  {t('profile.avatarHeader', {}, { defaultValue: 'Avatar' })}
                </p>
                <p
                  className={cm.cn('mt-1 text-xs')}
                  style={{ color: 'var(--mol-color-text-tertiary)' }}
                >
                  {t(
                    'profile.avatarHint',
                    {},
                    { defaultValue: 'Initials shown — uploads coming with the next release.' },
                  )}
                </p>
              </div>
            </div>
            <div className={cm.cn('grid gap-4 grid-cols-1 sm:grid-cols-2')}>
              <div>
                <label
                  className={cm.cn(
                    'block font-mono text-[10px] font-black uppercase tracking-widest mb-2',
                  )}
                  style={{ color: 'var(--mol-color-text-secondary)' }}
                  htmlFor="firstName"
                >
                  {t('form.firstName', {}, { defaultValue: 'First name' })}
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('py', 3),
                    cm.sp('px', 4),
                    'rounded-md text-sm transition-colors',
                  )}
                  style={{
                    backgroundColor: 'var(--mol-color-background-secondary)',
                    border: `1px solid ${FIELD_BORDER}`,
                    color: 'var(--mol-color-text)',
                  }}
                  data-mol-id="profile-first-name"
                />
              </div>
              <div>
                <label
                  className={cm.cn(
                    'block font-mono text-[10px] font-black uppercase tracking-widest mb-2',
                  )}
                  style={{ color: 'var(--mol-color-text-secondary)' }}
                  htmlFor="lastName"
                >
                  {t('form.lastName', {}, { defaultValue: 'Last name' })}
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('py', 3),
                    cm.sp('px', 4),
                    'rounded-md text-sm transition-colors',
                  )}
                  style={{
                    backgroundColor: 'var(--mol-color-background-secondary)',
                    border: `1px solid ${FIELD_BORDER}`,
                    color: 'var(--mol-color-text)',
                  }}
                  data-mol-id="profile-last-name"
                />
              </div>
              <div>
                <label
                  className={cm.cn(
                    'block font-mono text-[10px] font-black uppercase tracking-widest mb-2',
                  )}
                  style={{ color: 'var(--mol-color-text-secondary)' }}
                  htmlFor="displayName"
                >
                  {t('form.displayName', {}, { defaultValue: 'Display name' })}
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('py', 3),
                    cm.sp('px', 4),
                    'rounded-md font-mono text-sm transition-colors',
                  )}
                  style={{
                    backgroundColor: 'var(--mol-color-background-secondary)',
                    border: `1px solid ${FIELD_BORDER}`,
                    color: 'var(--mol-color-text)',
                  }}
                  data-mol-id="profile-display-name"
                />
              </div>
              <div>
                <label
                  className={cm.cn(
                    'block font-mono text-[10px] font-black uppercase tracking-widest mb-2',
                  )}
                  style={{ color: 'var(--mol-color-text-secondary)' }}
                  htmlFor="email"
                >
                  {t('form.email', {}, { defaultValue: 'Email' })}
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('py', 3),
                    cm.sp('px', 4),
                    'rounded-md font-mono text-sm transition-colors',
                  )}
                  style={{
                    backgroundColor: 'var(--mol-color-background-secondary)',
                    border: `1px solid ${FIELD_BORDER}`,
                    color: 'var(--mol-color-text)',
                  }}
                  data-mol-id="profile-email"
                />
              </div>
            </div>
            <div className={cm.cn('mt-5 flex items-center justify-end gap-3')}>
              {savedAt && Date.now() - savedAt < 4000 && (
                <span
                  className={cm.cn('font-mono text-[11px]')}
                  style={{ color: 'var(--mol-color-success)' }}
                  data-mol-id="profile-saved-toast"
                >
                  {t('profile.saved', {}, { defaultValue: '✓ saved' })}
                </span>
              )}
              <button
                type="button"
                onClick={saveProfile}
                disabled={saving}
                className={cm.cn(
                  'inline-flex items-center gap-2 px-5 py-2.5 rounded-md font-mono font-semibold text-sm transition-all hover:opacity-90 shadow-lg disabled:opacity-60',
                )}
                style={{
                  backgroundColor: BRAND_COLOR,
                  color: 'var(--color-on-primary)',
                  boxShadow:
                    '0 8px 24px -8px color-mix(in srgb, var(--mol-color-primary) 40%, transparent)',
                }}
                data-mol-id="profile-update"
              >
                {saving
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                  : t('pwa.update', {}, { defaultValue: 'Update' })}
              </button>
            </div>
          </section>

          <section
            className={cm.cn('rounded-xl p-6 mb-6')}
            style={{ backgroundColor: PANEL_BG, border: `1px solid ${PANEL_BORDER}` }}
            data-mol-id="profile-preferences"
          >
            <div className={cm.cn('flex items-center justify-between mb-4')}>
              <h2
                className={cm.cn('text-base font-extrabold tracking-tight')}
                style={{ color: 'var(--mol-color-text)' }}
              >
                {t('nav.preferences', {}, { defaultValue: 'Preferences' })}
              </h2>
              <p
                className={cm.cn('text-[11px] font-mono')}
                style={{ color: 'var(--mol-color-text-tertiary)' }}
              >
                {t('profile.prefsHint', {}, { defaultValue: 'Click Update to save.' })}
              </p>
            </div>
            <ul className={cm.cn('flex flex-col gap-2')}>
              {PREF_DEFS.map((p) => {
                const enabled = prefs[p.id] ?? true
                return (
                  <li
                    key={p.id}
                    className={cm.cn('flex items-center gap-3 px-4 py-3 rounded-md')}
                    style={{
                      backgroundColor:
                        'color-mix(in srgb, var(--mol-color-surface) 60%, transparent)',
                      border: `1px solid ${FIELD_BORDER}`,
                    }}
                    data-mol-id={`profile-pref-${p.id}`}
                  >
                    <div className={cm.cn('flex-1 min-w-0')}>
                      <p
                        className={cm.cn('text-sm font-bold')}
                        style={{ color: 'var(--mol-color-text)' }}
                      >
                        {t(`profile.pref.${p.id}.label`, {}, { defaultValue: p.defaultLabel })}
                      </p>
                      <p
                        className={cm.cn('text-xs')}
                        style={{ color: 'var(--mol-color-text-secondary)' }}
                      >
                        {t(
                          `profile.pref.${p.id}.body`,
                          { app: APP_NAME },
                          { defaultValue: p.defaultBody },
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => togglePref(p.id)}
                      className={cm.cn(
                        'inline-flex h-6 w-11 rounded-full transition-colors items-center px-0.5',
                      )}
                      style={{
                        backgroundColor: enabled
                          ? BRAND_COLOR
                          : 'color-mix(in srgb, var(--mol-color-text-secondary) 25%, transparent)',
                      }}
                      aria-pressed={enabled}
                      aria-label={t(
                        'profile.toggle',
                        { label: p.defaultLabel },
                        { defaultValue: 'Toggle {{label}}' },
                      )}
                      data-mol-id={`profile-pref-toggle-${p.id}`}
                    >
                      <span
                        className={cm.cn(
                          'h-5 w-5 rounded-full bg-surface shadow transition-transform',
                        )}
                        style={{ transform: enabled ? 'translateX(20px)' : 'translateX(0)' }}
                      />
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>

          <section
            className={cm.cn('rounded-xl p-6 mb-6')}
            style={{ backgroundColor: PANEL_BG, border: `1px solid ${PANEL_BORDER}` }}
            data-mol-id="profile-sessions"
          >
            <h2
              className={cm.cn('text-base font-extrabold tracking-tight mb-4')}
              style={{ color: 'var(--mol-color-text)' }}
            >
              {t('nav.activeSessions', {}, { defaultValue: 'Active sessions' })}
            </h2>
            {sessions.length === 0 ? (
              <p
                className={cm.cn('text-sm font-mono')}
                style={{ color: 'var(--mol-color-text-tertiary)' }}
              >
                {t(
                  'profile.sessionsEmpty',
                  {},
                  {
                    defaultValue:
                      'Only your current session is active. No other devices are signed in.',
                  },
                )}
              </p>
            ) : (
              <ul className={cm.cn('flex flex-col gap-2')}>
                {sessions.map((s) => {
                  const isCurrent = s.id === currentSessionId
                  const label =
                    s.name ||
                    s.pushPlatform ||
                    t('profile.sessionUnknown', {}, { defaultValue: 'Browser session' })
                  const icon = (s.pushPlatform ?? '').toLowerCase().includes('ios')
                    ? 'phone_iphone'
                    : (s.name ?? '').toLowerCase().includes('cli')
                      ? 'terminal'
                      : 'computer'
                  return (
                    <li
                      key={s.id}
                      className={cm.cn('flex items-center gap-3 px-4 py-3 rounded-md flex-wrap')}
                      style={{
                        backgroundColor:
                          'color-mix(in srgb, var(--mol-color-surface) 60%, transparent)',
                        border: `1px solid ${FIELD_BORDER}`,
                      }}
                      data-mol-id={`profile-session-${s.id}`}
                    >
                      <span
                        className={cm.cn(
                          'inline-flex h-9 w-9 items-center justify-center rounded-md',
                        )}
                        style={{
                          backgroundColor: isCurrent
                            ? 'color-mix(in srgb, var(--mol-color-success) 15%, transparent)'
                            : 'color-mix(in srgb, var(--mol-color-text-secondary) 10%, transparent)',
                          color: isCurrent
                            ? 'var(--mol-color-success)'
                            : 'var(--mol-color-text-secondary)',
                        }}
                      >
                        <span
                          className={cm.cn('material-symbols-outlined text-base')}
                          aria-hidden="true"
                        >
                          {icon}
                        </span>
                      </span>
                      <div className={cm.cn('flex-1 min-w-0')}>
                        <p
                          className={cm.cn('text-sm font-bold')}
                          style={{ color: 'var(--mol-color-text)' }}
                        >
                          {label}
                        </p>
                        <p
                          className={cm.cn('font-mono text-[11px]')}
                          style={{ color: 'var(--mol-color-text-secondary)' }}
                        >
                          {fmtRelative(s.updatedAt)}
                        </p>
                      </div>
                      {isCurrent ? (
                        <StatusPill status="live" label="CURRENT" />
                      ) : (
                        <ConfirmButton
                          label={t('common.revoke', {}, { defaultValue: 'Revoke' })}
                          confirmLabel={t(
                            'profile.confirmRevokeSession',
                            {},
                            { defaultValue: 'Sign this device out?' },
                          )}
                          onConfirm={() => revokeSession(s.id)}
                          disarmSeconds={5}
                          color="error"
                          size="sm"
                          data-mol-id={`profile-session-revoke-${s.id}`}
                        />
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section
            className={cm.cn('rounded-xl p-6')}
            style={{
              backgroundColor: 'color-mix(in srgb, var(--mol-color-error) 6%, transparent)',
              border: '1px solid color-mix(in srgb, var(--mol-color-error) 30%, transparent)',
            }}
            data-mol-id="profile-danger-zone"
          >
            <h2
              className={cm.cn('text-base font-extrabold tracking-tight mb-2')}
              style={{ color: 'var(--mol-color-error)' }}
            >
              {t('nav.dangerZone', {}, { defaultValue: 'Danger zone' })}
            </h2>
            <p
              className={cm.cn('text-sm mb-4')}
              style={{ color: 'var(--mol-color-text-secondary)' }}
            >
              {t(
                'profile.dangerBody',
                {},
                {
                  defaultValue:
                    'Deleting your account removes you from all workspaces. Your audit-log entries will be retained but anonymised.',
                },
              )}
            </p>
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className={cm.cn('font-mono text-sm font-bold tracking-wider uppercase')}
              style={{ color: 'var(--mol-color-error)' }}
              data-mol-id="profile-delete-account"
            >
              {t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
            </button>
          </section>
        </>
      )}

      <PromptDialog
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false)
          setDeleteError(null)
        }}
        title={t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
        description={t(
          'profile.deleteConfirmPrompt',
          { confirm: t('profile.deleteConfirmText', {}, { defaultValue: 'DELETE' }) },
          { defaultValue: 'This is permanent. Type {{confirm}} to confirm:' },
        )}
        placeholder={t('profile.deleteConfirmText', {}, { defaultValue: 'DELETE' })}
        confirmLabel={t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
        onSubmit={deleteAccount}
        destructive
        inputMolId="profile-delete-account-input"
        confirmMolId="profile-delete-account-confirm"
        cancelMolId="profile-delete-account-cancel"
      >
        {deleteError && <Alert status="error">{deleteError}</Alert>}
      </PromptDialog>
    </div>
  )
}
