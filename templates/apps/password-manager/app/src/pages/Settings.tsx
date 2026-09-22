import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { useTwoFactorStatus } from '../lib/api.js'

interface Device {
  id: string
  name?: string
  user_agent?: string
  last_active?: string | null
  current?: boolean
}

interface EnrollResponse {
  id: string
  method: string
  secret: string
  otpauthUri: string
}

const SECTIONS: { id: string; icon: string; labelKey: string; defaultLabel: string }[] = [
  {
    id: 'master',
    icon: 'key',
    labelKey: 'settings.section.master',
    defaultLabel: 'Master password',
  },
  {
    id: 'twofa',
    icon: 'shield',
    labelKey: 'settings.section.twofa',
    defaultLabel: 'Two-factor auth',
  },
  {
    id: 'sessions',
    icon: 'devices',
    labelKey: 'settings.section.sessions',
    defaultLabel: 'Sessions & devices',
  },
  { id: 'sync', icon: 'sync', labelKey: 'settings.section.sync', defaultLabel: 'Sync & backup' },
  {
    id: 'language',
    icon: 'language',
    labelKey: 'settings.section.language',
    defaultLabel: 'Language',
  },
  {
    id: 'appearance',
    icon: 'contrast',
    labelKey: 'nav.appearance',
    defaultLabel: 'Appearance',
  },
]

function unwrapList<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[]
  if (
    res &&
    typeof res === 'object' &&
    'data' in res &&
    Array.isArray((res as { data: unknown }).data)
  ) {
    return (res as { data: T[] }).data
  }
  return []
}

function unwrapOne<T>(res: unknown): T | null {
  if (res && typeof res === 'object' && 'data' in res) {
    return (res as { data: T }).data
  }
  return res as T
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [active, setActive] = useState('master')
  const [devices, setDevices] = useState<Device[]>([])
  const [devicesLoading, setDevicesLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [twoFactorEnrollment, setTwoFactorEnrollment] = useState<EnrollResponse | null>(null)
  const [verifyCode, setVerifyCode] = useState('')
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const twoFa = useTwoFactorStatus(refreshKey)

  useEffect(() => {
    let cancelled = false
    setDevicesLoading(true)
    http
      .get<unknown>('/api/devices')
      .then((res) => {
        if (!cancelled) setDevices(unwrapList<Device>(res))
      })
      .catch(() => {
        if (!cancelled) setDevices([])
      })
      .finally(() => {
        if (!cancelled) setDevicesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, refreshKey])

  const startEnroll = async () => {
    setWorking(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await http.post<unknown>('/api/two-factor/enroll', { method: 'totp' })
      const data = unwrapOne<EnrollResponse>(res)
      setTwoFactorEnrollment(data)
      setRefreshKey((k) => k + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start enrollment')
    } finally {
      setWorking(false)
    }
  }

  const verify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (verifyCode.length < 4) return
    setWorking(true)
    setError(null)
    try {
      await http.post('/api/two-factor/verify', { code: verifyCode })
      setSuccess(t('settings.twofa.verified', {}, { defaultValue: '2FA verified.' }))
      setVerifyCode('')
      setTwoFactorEnrollment(null)
      setRefreshKey((k) => k + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setWorking(false)
    }
  }

  const disable = async () => {
    if (
      !confirm(
        t('settings.twofa.confirmDisable', {}, { defaultValue: 'Disable 2FA on this account?' }),
      )
    )
      return
    setWorking(true)
    setError(null)
    try {
      await http.delete('/api/two-factor')
      setSuccess(t('settings.twofa.disabled', {}, { defaultValue: '2FA disabled.' }))
      setRefreshKey((k) => k + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable')
    } finally {
      setWorking(false)
    }
  }

  const revoke = async (id: string) => {
    if (!confirm(t('settings.sessions.confirmRevoke', {}, { defaultValue: 'Revoke this device?' })))
      return
    setWorking(true)
    try {
      await http.delete(`/api/devices/${id}`)
      setRefreshKey((k) => k + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke')
    } finally {
      setWorking(false)
    }
  }

  return (
    <div
      className={cm.cn(
        'p-4 md:p-8',
        cm.flex({ direction: 'col', gap: 'xl' }),
        cm.maxW('5xl'),
        'mx-auto',
      )}
    >
      <header className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('xs'),
            'uppercase tracking-widest text-primary-dark',
          )}
        >
          {t('settings.account', {}, { defaultValue: 'Account' })}
        </span>
        <h1
          className={cm.cn(
            cm.textSize('3xl'),
            cm.fontWeight('bold'),
            'tracking-tight text-on-surface',
          )}
        >
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
      </header>

      {error && (
        <p className={cm.cn(cm.textSize('xs'), 'text-error')} data-testid="settings-error">
          {error}
        </p>
      )}
      {success && (
        <p className={cm.cn(cm.textSize('xs'), 'text-success')} data-testid="settings-success">
          {success}
        </p>
      )}

      <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-12')}>
        <nav
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'xs' }),
            cm.sp('p', 3),
            'lg:col-span-3 bg-surface rounded-2xl border border-primary-light/30 self-start',
          )}
          aria-label={t('nav.settingsSections', {}, { defaultValue: 'Settings sections' })}
        >
          {SECTIONS.map((s) => {
            const isActive = active === s.id
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActive(s.id)}
                data-testid={`settings-nav-${s.id}`}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.fontWeight('medium'),
                  cm.textSize('sm'),
                  'rounded-lg text-left transition-colors',
                  isActive
                    ? 'bg-primary-light text-primary'
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface',
                )}
              >
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                  {s.icon}
                </span>
                {t(s.labelKey, {}, { defaultValue: s.defaultLabel })}
              </button>
            )
          })}
        </nav>

        <section className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }), 'lg:col-span-9')}>
          {active === 'master' && (
            <article
              data-testid="settings-master"
              className={cm.cn(
                cm.sp('p', 6),
                cm.flex({ direction: 'col', gap: 'md' }),
                'bg-surface rounded-2xl border border-primary-light/30 shadow-sm',
              )}
            >
              <h2
                className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'text-on-surface')}
              >
                {t('settings.master.heading', {}, { defaultValue: 'Master password' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-xl')}>
                {t(
                  'settings.master.body',
                  {},
                  {
                    defaultValue:
                      'Change your master password from the profile menu — your encryption key is derived locally and is never sent to the server.',
                  },
                )}
              </p>
            </article>
          )}

          {active === 'twofa' && (
            <article
              data-testid="settings-twofa"
              className={cm.cn(
                cm.sp('p', 6),
                cm.flex({ direction: 'col', gap: 'md' }),
                'bg-surface rounded-2xl border border-primary-light/30 shadow-sm',
              )}
            >
              <h2
                className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'text-on-surface')}
              >
                {t('settings.twofa.heading', {}, { defaultValue: 'Two-factor auth' })}
              </h2>
              {twoFa.loading ? (
                <p
                  className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
                  data-testid="twofa-loading"
                >
                  {t('settings.twofa.loading', {}, { defaultValue: 'Loading status…' })}
                </p>
              ) : twoFactorEnrollment ? (
                <form
                  className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}
                  onSubmit={verify}
                  data-testid="twofa-verify-form"
                >
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface')}>
                    {t(
                      'settings.twofa.scanInstruction',
                      {},
                      {
                        defaultValue:
                          'Scan or copy this secret into your authenticator, then enter the 6-digit code.',
                      },
                    )}
                  </p>
                  <p
                    className={cm.cn(
                      'font-mono text-on-surface bg-surface-container-low px-3 py-2 rounded-lg break-all',
                    )}
                    data-testid="twofa-secret"
                  >
                    {twoFactorEnrollment.secret}
                  </p>
                  <input
                    type="text"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value)}
                    placeholder={t(
                      'settings.twofa.codePlaceholder',
                      {},
                      { defaultValue: '123456' },
                    )}
                    minLength={4}
                    maxLength={12}
                    data-testid="twofa-verify-input"
                    className={cm.cn(
                      cm.w('full'),
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      'rounded-lg border border-primary-light/40 bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary font-mono',
                    )}
                  />
                  <button
                    type="submit"
                    disabled={working || verifyCode.length < 4}
                    data-testid="twofa-verify-submit"
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.fontWeight('semibold'),
                      cm.textSize('sm'),
                      'self-start rounded-lg py-2 bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-60',
                    )}
                  >
                    {t('settings.twofa.verify', {}, { defaultValue: 'Verify code' })}
                  </button>
                </form>
              ) : twoFa.status?.enrolled && twoFa.status?.verified_at ? (
                <div
                  className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}
                  data-testid="twofa-enrolled"
                >
                  <p className={cm.cn(cm.textSize('sm'), 'text-success')}>
                    {t(
                      'settings.twofa.enrolledMessage',
                      { method: twoFa.status.method ?? 'TOTP' },
                      { defaultValue: '✓ Enrolled via {{method}}' },
                    )}
                  </p>
                  {twoFa.status.verified_at && (
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {t(
                        'settings.twofa.verifiedAt',
                        { date: new Date(twoFa.status.verified_at).toLocaleString() },
                        { defaultValue: 'Verified {{date}}' },
                      )}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={disable}
                    disabled={working}
                    data-testid="twofa-disable"
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.fontWeight('semibold'),
                      cm.textSize('sm'),
                      'self-start rounded-lg py-2 bg-surface border border-error/30 text-error hover:bg-error-light transition-colors disabled:opacity-60',
                    )}
                  >
                    {t('settings.twofa.disable', {}, { defaultValue: 'Disable 2FA' })}
                  </button>
                </div>
              ) : (
                <div
                  className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}
                  data-testid="twofa-not-enrolled"
                >
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                    {t(
                      'settings.twofa.notEnrolled',
                      {},
                      {
                        defaultValue:
                          'Not enrolled. Add an authenticator app to protect your vault sign-in.',
                      },
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={startEnroll}
                    disabled={working}
                    data-testid="twofa-enroll"
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.fontWeight('semibold'),
                      cm.textSize('sm'),
                      'self-start rounded-lg py-2 bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-60',
                    )}
                  >
                    {t('settings.twofa.enroll', {}, { defaultValue: 'Enroll TOTP' })}
                  </button>
                </div>
              )}
            </article>
          )}

          {active === 'sessions' && (
            <article
              data-testid="settings-sessions"
              className={cm.cn(
                cm.sp('p', 6),
                cm.flex({ direction: 'col', gap: 'md' }),
                'bg-surface rounded-2xl border border-primary-light/30 shadow-sm',
              )}
            >
              <h2
                className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'text-on-surface')}
              >
                {t('nav.activeSessions', {}, { defaultValue: 'Active sessions' })}
              </h2>
              {devicesLoading ? (
                <p
                  className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
                  data-testid="devices-loading"
                >
                  {t('settings.sessions.loading', {}, { defaultValue: 'Loading devices…' })}
                </p>
              ) : devices.length === 0 ? (
                <p
                  className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
                  data-testid="devices-empty"
                >
                  {t('settings.sessions.empty', {}, { defaultValue: 'No active devices on file.' })}
                </p>
              ) : (
                <ul
                  className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}
                  data-testid="devices-list"
                >
                  {devices.map((d) => (
                    <li
                      key={d.id}
                      data-testid={`device-${d.id}`}
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'between' }),
                        cm.sp('p', 4),
                        'rounded-xl border border-primary-light/20 bg-surface-container-low/40',
                      )}
                    >
                      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                        <span
                          className={cm.cn(
                            cm.flex({ align: 'center', justify: 'center' }),
                            'w-9 h-9 rounded-lg bg-primary-light text-primary',
                          )}
                          aria-hidden="true"
                        >
                          <span className="material-symbols-outlined text-[18px]">devices</span>
                        </span>
                        <div className={cm.cn(cm.flex({ direction: 'col' }))}>
                          <span
                            className={cm.cn(
                              cm.fontWeight('semibold'),
                              cm.textSize('sm'),
                              'text-on-surface',
                            )}
                          >
                            {d.name ?? d.user_agent ?? d.id.slice(0, 8)}
                          </span>
                          <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                            {d.last_active
                              ? new Date(d.last_active).toLocaleString()
                              : t('settings.sessions.never', {}, { defaultValue: 'Never used' })}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => revoke(d.id)}
                        disabled={working}
                        data-testid={`device-revoke-${d.id}`}
                        className={cm.cn(
                          cm.sp('px', 3),
                          cm.fontWeight('semibold'),
                          cm.textSize('xs'),
                          'rounded-md py-1.5 bg-surface border border-error/30 text-error hover:bg-error-light transition-colors disabled:opacity-60',
                        )}
                      >
                        {t('common.revoke', {}, { defaultValue: 'Revoke' })}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          )}

          {active === 'language' && (
            <article
              data-testid="settings-language"
              className={cm.cn(
                cm.sp('p', 6),
                cm.flex({ direction: 'col', gap: 'md' }),
                'bg-surface rounded-2xl border border-primary-light/30 shadow-sm',
              )}
            >
              <h2
                className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'text-on-surface')}
              >
                {t('footer.language', {}, { defaultValue: 'Language' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-xl')}>
                {t(
                  'common.chooseTheLanguage',
                  {},
                  { defaultValue: 'Choose the language used throughout the app.' },
                )}
              </p>
              <LanguagePicker />
            </article>
          )}

          {active === 'sync' && (
            <article
              data-testid="settings-sync"
              className={cm.cn(
                cm.sp('p', 6),
                cm.flex({ direction: 'col', gap: 'md' }),
                'bg-surface rounded-2xl border border-primary-light/30 shadow-sm',
              )}
            >
              <h2
                className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'text-on-surface')}
              >
                {t('settings.sync.heading', {}, { defaultValue: 'Sync & backup' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-xl')}>
                {t(
                  'settings.sync.body',
                  {},
                  {
                    defaultValue:
                      'Vault data syncs automatically across signed-in devices. Encrypted exports remain locked to your master password.',
                  },
                )}
              </p>
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
                <button
                  type="button"
                  data-testid="sync-now"
                  onClick={() => setRefreshKey((k) => k + 1)}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.sp('px', 4),
                    cm.fontWeight('semibold'),
                    cm.textSize('sm'),
                    'rounded-lg py-2 bg-primary text-white hover:bg-primary-hover transition-colors',
                  )}
                >
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                    cloud_sync
                  </span>
                  {t('settings.sync.now', {}, { defaultValue: 'Refresh devices' })}
                </button>
              </div>
            </article>
          )}
          {active === 'appearance' && (
            <article
              data-testid="settings-appearance"
              className={cm.cn(
                cm.sp('p', 6),
                cm.flex({ direction: 'col', gap: 'md' }),
                'bg-surface rounded-2xl border border-primary-light/30 shadow-sm',
              )}
            >
              <h2
                className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'text-on-surface')}
              >
                {t('nav.appearance', {}, { defaultValue: 'Appearance' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-xl')}>
                {t(
                  'common.toggleLightDark',
                  {},
                  { defaultValue: 'Toggle between light and dark mode.' },
                )}
              </p>
              <ThemeToggle />
            </article>
          )}
        </section>
      </div>
    </div>
  )
}

export default Settings
