import { useEffect, useState } from 'react'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { StatusPill } from '../components/StatusPill.js'

interface UserShape {
  id?: string
  name?: string
  email?: string
  username?: string
}

interface DeviceRow {
  id: string
  name?: string | null
  pushPlatform?: string | null
  updatedAt?: string | null
  createdAt?: string | null
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  const cm = getClassMap()
  return (
    <section
      className={cm.cn(
        cm.flex({ direction: 'col', gap: 4 }),
        cm.sp('p', 6),
        'rounded-xl bg-surface border border-[color:var(--color-border)]',
      )}
    >
      <header className={cm.cn(cm.flex({ direction: 'col', gap: 1 }))}>
        <h2 className={cm.cn(cm.fontWeight('bold'), cm.textSize('base'), 'text-on-surface')}>
          {title}
        </h2>
        {description && (
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>{description}</p>
        )}
      </header>
      {children}
    </section>
  )
}

function relativeTime(iso?: string | null): string {
  if (!iso) return '—'
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return '—'
  const diffMs = Date.now() - then
  const minutes = Math.round(diffMs / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user: authUser, refresh } = useAuth<UserShape>()

  const userId = authUser?.id ?? null

  const [name, setName] = useState<string>('')
  const [originalName, setOriginalName] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [originalEmail, setOriginalEmail] = useState<string>('')
  const [savingName, setSavingName] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const [nameSavedAt, setNameSavedAt] = useState<number | null>(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSavedAt, setPasswordSavedAt] = useState<number | null>(null)

  const [devices, setDevices] = useState<DeviceRow[] | null>(null)
  const [devicesError, setDevicesError] = useState<string | null>(null)
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null)

  useEffect(() => {
    const initialName = (authUser?.name as string) ?? ''
    setName(initialName)
    setOriginalName(initialName)
    const initialEmail = (authUser?.email as string) ?? ''
    setEmail(initialEmail)
    setOriginalEmail(initialEmail)
  }, [authUser?.name, authUser?.email])

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    http
      .get<{ data?: DeviceRow[] } | DeviceRow[]>('/api/devices')
      .then((response) => {
        if (cancelled) return
        const body = response?.data
        const list = Array.isArray(body)
          ? body
          : Array.isArray((body as { data?: DeviceRow[] } | undefined)?.data)
            ? (body as { data: DeviceRow[] }).data
            : []
        setDevices(list)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setDevices([])
        setDevicesError(err instanceof Error ? err.message : 'Could not load sessions.')
      })
    return () => {
      cancelled = true
    }
  }, [http, userId])

  async function saveIdentity() {
    if (!userId) return
    if (email !== originalEmail && !email.trim()) {
      setNameError(
        t('profile.identity.emailRequired', {}, { defaultValue: 'Enter an email address.' }),
      )
      return
    }
    setSavingName(true)
    setNameError(null)
    try {
      const payload: { name?: string; email?: string } = {}
      if (name !== originalName) payload.name = name
      if (email !== originalEmail) payload.email = email
      await http.patch(`/api/users/${userId}`, payload)
      setOriginalName(name)
      setOriginalEmail(email)
      setNameSavedAt(Date.now())
      try {
        await refresh()
      } catch (_error) {
        // refresh is best-effort — stale session data is acceptable here
      }
    } catch (err) {
      setNameError(err instanceof Error ? err.message : 'Could not save changes.')
    } finally {
      setSavingName(false)
    }
  }

  async function changePassword() {
    if (!userId) return
    setPasswordError(null)
    if (!currentPassword || !newPassword) {
      setPasswordError(
        t(
          'profile.password.fillFields',
          {},
          { defaultValue: 'Enter both current and new password.' },
        ),
      )
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(
        t('auth.signup.passwordsDoNotMatchPeriod', {}, { defaultValue: 'Passwords do not match.' }),
      )
      return
    }
    setSavingPassword(true)
    try {
      await http.patch(`/api/users/${userId}/password`, {
        currentPassword,
        newPassword,
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordSavedAt(Date.now())
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Could not update password.')
    } finally {
      setSavingPassword(false)
    }
  }

  async function revokeDevice(deviceId: string) {
    setDevicesError(null)
    try {
      await http.delete(`/api/devices/${deviceId}`)
      setDevices((current) => (current ?? []).filter((d) => d.id !== deviceId))
    } catch (err) {
      setDevicesError(err instanceof Error ? err.message : 'Could not revoke session.')
    }
  }

  return (
    <div className={cm.cn(cm.stack(8), cm.sp('p', 8), cm.maxW('5xl'), cm.mxAuto, cm.w('full'))}>
      <header className={cm.cn(cm.flex({ direction: 'col', gap: 2 }))}>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-widest text-primary',
          )}
        >
          {t('settings.account', {}, { defaultValue: 'Account' })}
        </span>
        <h1 className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight text-on-surface')}>
          {t('nav.profile', {}, { defaultValue: 'Profile' })}
        </h1>
      </header>

      <Section
        title={t('nav.identity', {}, { defaultValue: 'Identity' })}
        description={t(
          'profile.identity.description',
          {},
          { defaultValue: 'Public to your team and on the surveys you author.' },
        )}
      >
        <div className={cm.cn(cm.grid({ cols: 1, gap: 4 }), 'sm:grid-cols-2')}>
          <label className={cm.cn(cm.flex({ direction: 'col', gap: 1 }))}>
            <span
              className={cm.cn(
                cm.fontWeight('semibold'),
                'text-[10px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('form.displayName', {}, { defaultValue: 'Display name' })}
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="profile-name-input"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.fontWeight('medium'),
                cm.textSize('sm'),
                'rounded-md border border-[color:var(--color-border)] bg-surface-secondary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-shadow text-on-surface',
              )}
            />
          </label>
          <label className={cm.cn(cm.flex({ direction: 'col', gap: 1 }))}>
            <span
              className={cm.cn(
                cm.fontWeight('semibold'),
                'text-[10px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              data-testid="profile-email-input"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.fontWeight('medium'),
                cm.textSize('sm'),
                'rounded-md border border-[color:var(--color-border)] bg-surface-secondary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-shadow text-on-surface',
              )}
            />
          </label>
        </div>
        {nameError && (
          <p role="alert" className="text-[color:var(--color-on-error)] text-sm">
            {nameError}
          </p>
        )}
        {nameSavedAt && (
          <p role="status" className="text-[color:var(--color-on-success)] text-sm">
            {t('common.savedPeriod', {}, { defaultValue: 'Saved.' })}
          </p>
        )}
        <div className={cm.cn(cm.flex({ justify: 'end' }))}>
          <button
            type="button"
            onClick={saveIdentity}
            data-testid="save-name"
            disabled={savingName || (name === originalName && email === originalEmail)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'rounded-md bg-primary text-white hover:opacity-90 transition-opacity disabled:opacity-60',
            )}
          >
            {savingName
              ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
              : t('profile.identity.saveCta', {}, { defaultValue: 'Save changes' })}
          </button>
        </div>
      </Section>

      <Section title={t('auth.login.password', {}, { defaultValue: 'Password' })}>
        <div className={cm.cn(cm.grid({ cols: 1, gap: 4 }), 'sm:grid-cols-3')}>
          <label className={cm.cn(cm.flex({ direction: 'col', gap: 1 }))}>
            <span
              className={cm.cn(
                cm.fontWeight('semibold'),
                'text-[10px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('profile.password.current', {}, { defaultValue: 'Current password' })}
            </span>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              data-testid="current-password"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.fontWeight('medium'),
                cm.textSize('sm'),
                'rounded-md border border-[color:var(--color-border)] bg-surface-secondary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-shadow text-on-surface',
              )}
            />
          </label>
          <label className={cm.cn(cm.flex({ direction: 'col', gap: 1 }))}>
            <span
              className={cm.cn(
                cm.fontWeight('semibold'),
                'text-[10px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('profile.password.new', {}, { defaultValue: 'New password' })}
            </span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              data-testid="new-password"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.fontWeight('medium'),
                cm.textSize('sm'),
                'rounded-md border border-[color:var(--color-border)] bg-surface-secondary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-shadow text-on-surface',
              )}
            />
          </label>
          <label className={cm.cn(cm.flex({ direction: 'col', gap: 1 }))}>
            <span
              className={cm.cn(
                cm.fontWeight('semibold'),
                'text-[10px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
            </span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              data-testid="confirm-password"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.fontWeight('medium'),
                cm.textSize('sm'),
                'rounded-md border border-[color:var(--color-border)] bg-surface-secondary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-shadow text-on-surface',
              )}
            />
          </label>
        </div>
        {passwordError && (
          <p role="alert" className="text-[color:var(--color-on-error)] text-sm">
            {passwordError}
          </p>
        )}
        {passwordSavedAt && (
          <p role="status" className="text-[color:var(--color-on-success)] text-sm">
            {t('auth.resetPassword.passwordUpdated', {}, { defaultValue: 'Password updated.' })}
          </p>
        )}
        <div className={cm.cn(cm.flex({ justify: 'end' }))}>
          <button
            type="button"
            onClick={changePassword}
            data-testid="save-password"
            disabled={savingPassword}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'rounded-md bg-gradient-to-r from-primary to-secondary text-white shadow-md hover:shadow-lg transition-all disabled:opacity-60',
            )}
          >
            {savingPassword
              ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
              : t('auth.resetPassword.updatePassword', {}, { defaultValue: 'Update password' })}
          </button>
        </div>
      </Section>

      <Section
        title={t('nav.activeSessions', {}, { defaultValue: 'Active sessions' })}
        description={t(
          'profile.sessions.description',
          {},
          { defaultValue: 'Devices currently signed in to your account.' },
        )}
      >
        {devicesError && (
          <p role="alert" className="text-[color:var(--color-on-error)] text-sm">
            {devicesError}
          </p>
        )}
        {devices === null ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('profile.sessions.loading', {}, { defaultValue: 'Loading sessions…' })}
          </p>
        ) : devices.length === 0 ? (
          <p
            data-testid="sessions-empty"
            className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
          >
            {t('profile.sessions.empty', {}, { defaultValue: 'No other active sessions.' })}
          </p>
        ) : (
          <ul data-testid="sessions-list" className={cm.cn(cm.flex({ direction: 'col', gap: 2 }))}>
            {devices.map((session) => (
              <li
                key={session.id}
                data-testid={`session-${session.id}`}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between', gap: 3 }),
                  cm.sp('p', 4),
                  'rounded-md border border-[color:var(--color-border)]',
                )}
              >
                <div className={cm.cn(cm.flex({ direction: 'col' }))}>
                  <span className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
                    {session.name ?? session.pushPlatform ?? 'Browser session'}
                  </span>
                  <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {t(
                      'profile.sessions.lastActive',
                      { ts: relativeTime(session.updatedAt ?? session.createdAt) },
                      { defaultValue: 'Last active {{ts}}' },
                    )}
                  </span>
                </div>
                <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
                  <StatusPill variant="active" />
                  <button
                    type="button"
                    onClick={() => {
                      // Destructive: first click arms, second click confirms.
                      if (confirmRevokeId === session.id) {
                        void revokeDevice(session.id)
                        setConfirmRevokeId(null)
                      } else {
                        setConfirmRevokeId(session.id)
                      }
                    }}
                    data-testid={`revoke-session-${session.id}`}
                    aria-label={
                      confirmRevokeId === session.id
                        ? t(
                            'profile.sessions.confirmRevoke',
                            {},
                            { defaultValue: 'Click again to revoke this session' },
                          )
                        : undefined
                    }
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      cm.fontWeight('semibold'),
                      cm.textSize('xs'),
                      'min-h-[32px] rounded-md transition-colors',
                      confirmRevokeId === session.id
                        ? 'bg-error-light text-[color:var(--color-on-error)]'
                        : 'text-[color:var(--color-on-error)] hover:bg-error-light',
                    )}
                  >
                    {confirmRevokeId === session.id
                      ? t('profile.sessions.confirmRevokeShort', {}, { defaultValue: 'Confirm?' })
                      : t('common.revoke', {}, { defaultValue: 'Revoke' })}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  )
}

export default Profile
