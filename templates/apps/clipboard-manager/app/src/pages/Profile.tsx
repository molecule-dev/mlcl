import { useCallback, useEffect, useMemo, useState } from 'react'

import { t as translate } from '@molecule/app-i18n'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Switch } from '@molecule/app-ui-react'

import { PageHeader } from '../components/PageHeader.js'
import { useFetchOne } from '../lib/use-fetch.js'

interface ProfilePayload {
  id: string
  email: string | null
  name: string | null
  planKey: string
  theme: 'light' | 'dark' | 'system'
  toggles: {
    sync: boolean
    autoEncrypt: boolean
    desktopOverlay: boolean
    menuBar: boolean
    startAtLogin: boolean
  }
}

interface DeviceRow {
  id: string
  name: string | null
  pushPlatform: string | null
  isCurrent?: boolean
  createdAt: string
  updatedAt: string
}

const adaptProfile = (row: ProfilePayload): ProfilePayload => row
const adaptDevices = (row: DeviceRow): DeviceRow => row

function initials(name: string | null | undefined, email: string | null | undefined): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/)
    return (
      ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() ||
      (parts[0]?.[0] ?? '?').toUpperCase()
    )
  }
  return (email?.[0] ?? '?').toUpperCase()
}

function relativeFromNow(iso: string): string {
  const ts = new Date(iso).getTime()
  if (!Number.isFinite(ts)) return '—'
  const diff = Math.max(0, Date.now() - ts)
  const sec = Math.round(diff / 1000)
  if (sec < 60) return translate('time.activeNow', {}, { defaultValue: 'Active now' })
  const min = Math.round(sec / 60)
  if (min < 60) {
    return min === 1
      ? translate('time.minuteAgo', {}, { defaultValue: '1 minute ago' })
      : translate('time.minutesAgo', { count: min }, { defaultValue: '{{count}} minutes ago' })
  }
  const hr = Math.round(min / 60)
  if (hr < 24) {
    return hr === 1
      ? translate('time.hourAgo', {}, { defaultValue: '1 hour ago' })
      : translate('time.hoursAgo', { count: hr }, { defaultValue: '{{count}} hours ago' })
  }
  const day = Math.round(hr / 24)
  if (day < 30) {
    return day === 1
      ? translate('time.dayAgo', {}, { defaultValue: '1 day ago' })
      : translate('time.daysAgo', { count: day }, { defaultValue: '{{count}} days ago' })
  }
  return new Date(iso).toLocaleDateString()
}

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const adaptOne = useCallback(adaptProfile, [])
  const profile = useFetchOne<ProfilePayload, ProfilePayload>('/api/profile/me', adaptOne)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [twoFactor, setTwoFactor] = useState(true)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (profile.data) {
      setName(profile.data.name ?? '')
      setEmail(profile.data.email ?? '')
    }
  }, [profile.data])

  const adaptDeviceCb = useCallback(adaptDevices, [])
  const devicesUrl = profile.data ? '/api/devices' : null
  const devices = useFetchOne<DeviceRow[], DeviceRow[]>(
    devicesUrl,
    useCallback((rows: DeviceRow[]) => rows.map(adaptDeviceCb), [adaptDeviceCb]),
  )

  const sessions = useMemo(() => {
    const list = devices.data ?? []
    return [...list].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
  }, [devices.data])

  const handleSave = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (busy) return
      setBusy(true)
      setFeedback(null)
      try {
        await http.patch<ProfilePayload>('/api/profile/me', { name, email })
        setFeedback({
          kind: 'ok',
          text: t('common.profileSavedPeriod', {}, { defaultValue: 'Profile saved.' }),
        })
        await profile.refetch()
      } catch (err) {
        setFeedback({
          kind: 'error',
          text:
            (err instanceof Error && err.message) ||
            t('common.couldNotSaveProfile', {}, { defaultValue: 'Could not save profile.' }),
        })
      } finally {
        setBusy(false)
      }
    },
    [busy, http, name, email, profile, t],
  )

  const handleRevoke = useCallback(
    async (id: string) => {
      try {
        await http.delete(`/api/devices/${id}`)
        await devices.refetch()
      } catch (err) {
        setFeedback({
          kind: 'error',
          text:
            (err instanceof Error && err.message) ||
            translate('profile.revokeError', {}, { defaultValue: 'Could not revoke the session.' }),
        })
      }
    },
    [http, devices],
  )

  if (profile.loading && !profile.data) {
    return (
      <div className={cm.cn('p-4 md:p-8', cm.maxW('4xl'), cm.mxAuto)}>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('nav.loadingProfile', {}, { defaultValue: 'Loading profile…' })}
        </p>
      </div>
    )
  }

  const me = profile.data

  return (
    <div className={cm.cn('p-4 md:p-8', cm.maxW('4xl'), cm.mxAuto, 'space-y-12')}>
      <PageHeader
        eyebrow={t('settings.account', {}, { defaultValue: 'Account' })}
        heading={t('nav.profile', {}, { defaultValue: 'Profile' })}
        description={t(
          'profile.description',
          {},
          { defaultValue: 'Your identity, security and active sessions.' },
        )}
      />

      <form onSubmit={handleSave} data-mol-id="profile-form">
        <section
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'lg' }),
            cm.sp('p', 6),
            'rounded-xl bg-surface-container-lowest border border-outline-variant/40',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.textSize('2xl'),
                cm.fontWeight('bold'),
                'w-16 h-16 rounded-full text-white font-mono',
              )}
              style={{ background: 'var(--color-primary)' }}
              data-mol-id="profile-avatar"
            >
              {initials(name || me?.name, email || me?.email)}
            </div>
            <div>
              <p
                className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'text-on-surface')}
                data-mol-id="profile-name"
              >
                {name || me?.name || t('profile.unnamed', {}, { defaultValue: 'Unnamed' })}
              </p>
              <p
                className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant font-mono')}
                data-mol-id="profile-email"
              >
                {email || me?.email || ''}
              </p>
            </div>
          </div>

          <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-2')}>
            <div>
              <label
                htmlFor="profile-name-input"
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  cm.sp('mb', 1),
                  'block uppercase tracking-widest text-on-surface-variant font-mono',
                )}
              >
                {t('form.displayName', {}, { defaultValue: 'Display name' })}
              </label>
              <input
                id="profile-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'rounded-md border border-outline-variant bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
                )}
              />
            </div>
            <div>
              <label
                htmlFor="profile-email-input"
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  cm.sp('mb', 1),
                  'block uppercase tracking-widest text-on-surface-variant font-mono',
                )}
              >
                {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
              </label>
              <input
                id="profile-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'rounded-md border border-outline-variant bg-surface-container-lowest font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
                )}
              />
            </div>
          </div>

          {feedback && (
            <p
              role="status"
              data-mol-id="profile-feedback"
              className={cm.cn(
                cm.textSize('xs'),
                cm.sp('px', 3),
                cm.sp('py', 2),
                'rounded-md',
                feedback.kind === 'ok'
                  ? 'bg-primary-container/20 text-primary'
                  : 'bg-error-container/30 text-error border border-error/30',
              )}
            >
              {feedback.text}
            </p>
          )}

          <div className={cm.cn(cm.flex({ align: 'center', justify: 'end', gap: 'sm' }))}>
            <button
              type="submit"
              disabled={busy}
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                cm.sp('px', 4),
                cm.sp('py', 2),
                'rounded-md text-white disabled:opacity-50 transition-opacity',
              )}
              style={{ background: 'var(--color-primary)' }}
            >
              {busy
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
            </button>
          </div>
        </section>
      </form>

      <section
        data-mol-id="profile-security"
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 'md' }),
          cm.sp('p', 6),
          'rounded-xl bg-surface-container-lowest border border-outline-variant/40',
        )}
      >
        <h2
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant font-mono',
          )}
        >
          {t('profile.securityHeading', {}, { defaultValue: 'Password & security' })}
        </h2>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'md' }))}>
          <div>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
              <h3
                className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}
              >
                {t('profile.twoFactorTitle', {}, { defaultValue: 'Two-factor authentication' })}
              </h3>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  cm.sp('px', 2),
                  'rounded-full uppercase tracking-widest font-mono',
                )}
                style={
                  twoFactor
                    ? { background: 'var(--color-icon-success)', color: 'var(--color-background)' }
                    : {
                        background: 'var(--color-surface-active)',
                        color: 'var(--color-on-surface-variant)',
                      }
                }
              >
                {twoFactor
                  ? t('profile.twoFactorEnabled', {}, { defaultValue: 'Enabled' })
                  : t('profile.twoFactorDisabled', {}, { defaultValue: 'Off' })}
              </span>
            </div>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant mt-1')}>
              {t(
                'profile.twoFactorDescription',
                {},
                { defaultValue: 'Add an extra layer of security to your account.' },
              )}
            </p>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
            <a
              href="#profile-security"
              className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-primary')}
            >
              {t('profile.recoveryCodes', {}, { defaultValue: 'Recovery codes' })}
            </a>
            <Switch
              checked={twoFactor}
              onChange={() => setTwoFactor((v) => !v)}
              data-mol-id="profile-two-factor-switch"
              aria-label={t(
                'profile.twoFactorTitle',
                {},
                { defaultValue: 'Two-factor authentication' },
              )}
            />
          </div>
        </div>
      </section>

      <section>
        <h2
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 3),
            'uppercase tracking-widest text-on-surface-variant font-mono',
          )}
        >
          {t('nav.activeSessions', {}, { defaultValue: 'Active sessions' })}
        </h2>
        <div
          className={cm.cn(
            'rounded-xl bg-surface-container-lowest border border-outline-variant/40 overflow-hidden',
          )}
          data-mol-id="sessions-list"
        >
          {sessions.length === 0 ? (
            <p className={cm.cn(cm.sp('p', 5), cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('profile.noSessions', {}, { defaultValue: 'No active sessions yet.' })}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className={cm.cn('w-full')}>
                <tbody className="divide-y divide-outline-variant/40">
                  {sessions.map((s) => (
                    <tr
                      key={s.id}
                      className={cm.cn('hover:bg-surface-container-low transition-colors')}
                      data-mol-id={`session-${s.id}`}
                    >
                      <td className={cm.cn(cm.sp('px', 3), 'md:px-5', cm.sp('py', 4))}>
                        <div
                          className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}
                        >
                          <span
                            className={cm.cn(
                              cm.textSize('sm'),
                              cm.fontWeight('semibold'),
                              'text-on-surface',
                            )}
                          >
                            {s.name ||
                              s.pushPlatform ||
                              t('profile.webSession', {}, { defaultValue: 'Web session' })}
                          </span>
                          {s.isCurrent && (
                            <span
                              className={cm.cn(
                                cm.textSize('xs'),
                                cm.fontWeight('bold'),
                                cm.sp('px', 2),
                                'rounded-full uppercase tracking-widest font-mono',
                              )}
                              style={{
                                background: 'var(--color-primary-fixed)',
                                color: 'var(--color-primary)',
                              }}
                            >
                              {t('nav.current', {}, { defaultValue: 'Current' })}
                            </span>
                          )}
                        </div>
                        <p
                          className={cm.cn(
                            cm.textSize('xs'),
                            'text-on-surface-variant font-mono mt-1',
                          )}
                        >
                          {s.pushPlatform || 'browser'}
                        </p>
                      </td>
                      <td
                        className={cm.cn(
                          cm.sp('px', 3),
                          'md:px-5',
                          cm.sp('py', 4),
                          cm.textSize('xs'),
                          'text-on-surface-variant text-right whitespace-nowrap',
                        )}
                      >
                        {relativeFromNow(s.updatedAt)}
                      </td>
                      <td
                        className={cm.cn(cm.sp('px', 3), 'md:px-5', cm.sp('py', 4), 'text-right')}
                      >
                        {!s.isCurrent && (
                          <button
                            onClick={() => void handleRevoke(s.id)}
                            type="button"
                            className={cm.cn(
                              cm.textSize('xs'),
                              cm.fontWeight('semibold'),
                              cm.sp('px', 3),
                              'min-h-[36px]',
                              'rounded-md text-error hover:bg-error-container/30 transition-colors',
                            )}
                          >
                            {t('common.revoke', {}, { defaultValue: 'Revoke' })}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default Profile
export { Profile as ProfilePage }
