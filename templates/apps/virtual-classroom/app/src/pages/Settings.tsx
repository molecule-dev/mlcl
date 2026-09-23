import { useEffect, useState } from 'react'

import { track } from '@molecule/app-analytics'
import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Alert, Button, Input, LanguagePicker, Modal, ThemeToggle } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'

interface TwoFactorSetup {
  QRImageUrl?: string
  keyUrl?: string
  secret?: string
}

const SECTIONS = [
  { key: 'profile', icon: 'person', title: 'Profile' },
  { key: 'devices', icon: 'devices', title: 'Camera & mic' },
  { key: 'notifications', icon: 'notifications', title: 'Notifications' },
  { key: 'accessibility', icon: 'accessibility_new', title: 'Accessibility' },
  { key: 'language', icon: 'translate', title: 'Language' },
  { key: 'security', icon: 'shield', title: 'Sign-in & security' },
] as const

type SectionKey = (typeof SECTIONS)[number]['key']

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [section, setSection] = useState<SectionKey>('profile')

  // Real TOTP enrollment against the user resource's
  // `POST /users/:id/verify-two-factor` endpoint (mirrors the shared
  // @molecule/app-settings-panel-react AuthSection flow): setup → QR + secret
  // → enter 6-digit code → `{ action: 'enable', token }`; disable → enter a
  // current code → `{ action: 'disable', token }`. Status reads from /users/me.
  const { user } = useAuth<UserProfile>()
  const http = useHttpClient()
  const userId = (user as unknown as { id?: string })?.id
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [tfModal, setTfModal] = useState<null | 'enable' | 'disable'>(null)
  const [tfSetup, setTfSetup] = useState<TwoFactorSetup | null>(null)
  const [tfToken, setTfToken] = useState('')
  const [tfLoading, setTfLoading] = useState(false)
  const [tfError, setTfError] = useState('')

  // Read the persisted 2FA status from /users/me on mount.
  useEffect(() => {
    let cancelled = false
    http
      .get<{ props?: { twoFactorEnabled?: boolean }; twoFactorEnabled?: boolean }>('/api/users/me')
      .then((res) => {
        if (cancelled) return
        const body = (res as { data?: Record<string, unknown> }).data ?? res
        const u = ((body as { props?: Record<string, unknown> }).props ?? body) as {
          twoFactorEnabled?: boolean
        }
        setTwoFactorEnabled(Boolean(u?.twoFactorEnabled))
      })
      .catch(() => {
        /* status read is best-effort; defaults to disabled */
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const closeTf = (): void => {
    setTfModal(null)
    setTfSetup(null)
    setTfToken('')
    setTfError('')
  }

  const startEnable = async (): Promise<void> => {
    setTfError('')
    setTfLoading(true)
    setTfModal('enable')
    try {
      const res = await http.post<TwoFactorSetup>(`/api/users/${userId}/verify-two-factor`, {
        action: 'setup',
      })
      const data = ((res as { data?: TwoFactorSetup }).data ?? res) as TwoFactorSetup
      setTfSetup(data)
    } catch (err) {
      setTfError(
        err instanceof Error
          ? err.message
          : t(
              'settings.twoFactorUnavailable',
              {},
              { defaultValue: 'Two-factor authentication is not available for this app.' },
            ),
      )
    } finally {
      setTfLoading(false)
    }
  }

  const submitTf = async (action: 'enable' | 'disable'): Promise<void> => {
    setTfError('')
    setTfLoading(true)
    try {
      await http.post(`/api/users/${userId}/verify-two-factor`, { action, token: tfToken })
      setTwoFactorEnabled(action === 'enable')
      // Domain event: account-security activation is a key retention signal.
      void track({ name: 'settings.two_factor_' + action, properties: { userId } })
      closeTf()
    } catch (err) {
      setTfError(
        err instanceof Error
          ? err.message
          : t('settings.twoFactorInvalidCode', {}, { defaultValue: 'Invalid code' }),
      )
    } finally {
      setTfLoading(false)
    }
  }

  return (
    <div className={cm.stack(8)}>
      <header className={cm.stack(1)}>
        <span className={cm.cn('text-[11px] font-black uppercase tracking-widest text-primary')}>
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
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-xl')}>
          {t(
            'settings.body',
            { appName: APP_NAME },
            {
              defaultValue:
                'Tune {{appName}} to your classroom — devices, captions, and notification rhythm.',
            },
          )}
        </p>
      </header>

      <div className={cm.cn(cm.grid({ cols: 12, gap: 'xl' }), 'items-start')}>
        <nav
          className={cm.cn(
            'col-span-12 lg:col-span-4',
            cm.stack(1),
            cm.sp('p', 2),
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/10',
          )}
        >
          {SECTIONS.map((s) => {
            const isActive = section === s.key
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setSection(s.key)}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 3 }),
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  'rounded-xl transition-colors text-left',
                  isActive
                    ? 'bg-primary-container text-on-primary-container'
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[20px]')}>{s.icon}</span>
                <span className={cm.flex1}>
                  {t(`settings.tab_${s.key}`, {}, { defaultValue: s.title })}
                </span>
                <span className={cm.cn('material-symbols-outlined text-[16px]')}>
                  chevron_right
                </span>
              </button>
            )
          })}
        </nav>

        <section className={cm.cn('col-span-12 lg:col-span-8', cm.stack(6))}>
          {section === 'profile' && (
            <div
              className={cm.cn(
                cm.sp('p', 8),
                cm.stack(5),
                'rounded-2xl bg-surface-container-lowest border border-outline-variant/10',
              )}
            >
              <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface')}>
                {t('settings.profileTitle', {}, { defaultValue: 'Profile' })}
              </h2>
              <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }), 'flex-wrap')}>
                <img
                  alt=""
                  src="https://picsum.photos/seed/aula-settings-avatar/240/240"
                  className={cm.cn('h-20 w-20 rounded-2xl object-cover')}
                />
                <div className={cm.cn(cm.stack(2))}>
                  <button
                    type="button"
                    onClick={() => {}}
                    // TODO: wire to media
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 1 }),
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      cm.fontWeight('semibold'),
                      cm.textSize('sm'),
                      'rounded-xl bg-primary-container text-on-primary-container hover:bg-primary hover:text-on-primary transition-colors',
                    )}
                  >
                    <span className={cm.cn('material-symbols-outlined text-[16px]')}>
                      photo_camera
                    </span>
                    {t('settings.changePhoto', {}, { defaultValue: 'Change photo' })}
                  </button>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {t(
                      'settings.photoHint',
                      {},
                      { defaultValue: 'JPG or PNG · square works best' },
                    )}
                  </p>
                </div>
              </div>
              <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'md:grid-cols-2')}>
                {[
                  { label: 'Display name', value: 'Aiyana Vega' },
                  { label: 'Pronouns', value: 'she/her' },
                  { label: 'Email', value: 'aiyana@aula.school' },
                  { label: 'School', value: 'Northbrook College' },
                ].map((field) => (
                  <label key={field.label} className={cm.cn(cm.stack(1))}>
                    <span
                      className={cm.cn(
                        'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      {t(`settings.field_${field.label}`, {}, { defaultValue: field.label })}
                    </span>
                    <input
                      defaultValue={field.value}
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        cm.textSize('sm'),
                        'rounded-xl bg-surface-container-low border-0 text-on-surface focus:ring-2 focus:ring-primary/30 outline-none',
                      )}
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          {section === 'devices' && (
            <div
              className={cm.cn(
                cm.sp('p', 8),
                cm.stack(5),
                'rounded-2xl bg-surface-container-lowest border border-outline-variant/10',
              )}
            >
              <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface')}>
                {t('settings.devicesTitle', {}, { defaultValue: 'Camera, microphone & speakers' })}
              </h2>
              <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'md:grid-cols-2')}>
                {[
                  { icon: 'videocam', label: 'Camera', value: 'FaceTime HD · 720p' },
                  { icon: 'mic', label: 'Microphone', value: 'AirPods Pro · ambient' },
                  { icon: 'speaker', label: 'Speakers', value: 'Studio monitor (USB)' },
                  { icon: 'closed_caption', label: 'Captions', value: 'On · large size' },
                ].map((d) => (
                  <div
                    key={d.label}
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 4 }),
                      cm.sp('p', 4),
                      'rounded-xl bg-surface-container-low',
                    )}
                  >
                    <span
                      className={cm.cn(
                        'h-10 w-10 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center',
                      )}
                    >
                      <span className={cm.cn('material-symbols-outlined text-[20px]')}>
                        {d.icon}
                      </span>
                    </span>
                    <div className={cm.flex1}>
                      <p
                        className={cm.cn(
                          'text-[10px] uppercase tracking-widest text-on-surface-variant font-bold',
                        )}
                      >
                        {t(`settings.device_${d.label}`, {}, { defaultValue: d.label })}
                      </p>
                      <p
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('semibold'),
                          'text-on-surface',
                        )}
                      >
                        {d.value}
                      </p>
                    </div>
                    <span className={cm.cn('material-symbols-outlined text-on-surface-variant')}>
                      unfold_more
                    </span>
                  </div>
                ))}
              </div>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant leading-relaxed')}>
                {t(
                  'settings.devicesNote',
                  { appName: APP_NAME },
                  {
                    defaultValue:
                      '{{appName}} remembers the last working device per browser, so your students never see a black screen on join.',
                  },
                )}
              </p>
            </div>
          )}

          {section === 'notifications' && (
            <div
              className={cm.cn(
                cm.sp('p', 8),
                cm.stack(5),
                'rounded-2xl bg-surface-container-lowest border border-outline-variant/10',
              )}
            >
              <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface')}>
                {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
              </h2>
              <ul className={cm.stack(3)}>
                {[
                  { label: 'Class starting in 5 minutes', tone: 'primary', enabled: true },
                  { label: 'New assignment posted', tone: 'secondary', enabled: true },
                  { label: 'Hand raised during your class', tone: 'tertiary', enabled: true },
                  { label: 'Office-hour reminders', tone: 'success', enabled: false },
                ].map((row) => (
                  <li
                    key={row.label}
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between', gap: 3 }),
                      cm.sp('p', 4),
                      'rounded-xl bg-surface-container-low',
                    )}
                  >
                    <span
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        'text-on-surface',
                      )}
                    >
                      {t(`settings.notif_${row.label}`, {}, { defaultValue: row.label })}
                    </span>
                    <span
                      className={cm.cn(
                        'inline-flex h-7 w-12 rounded-full p-0.5 transition-colors',
                        row.enabled ? 'bg-primary' : 'bg-surface-container-high',
                      )}
                      aria-hidden="true"
                    >
                      <span
                        className={cm.cn(
                          'h-6 w-6 rounded-full bg-white shadow transition-transform',
                          row.enabled ? 'translate-x-5' : 'translate-x-0',
                        )}
                      ></span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {section === 'accessibility' && (
            <div
              className={cm.cn(
                cm.sp('p', 8),
                cm.stack(5),
                'rounded-2xl bg-surface-container-lowest border border-outline-variant/10',
              )}
            >
              <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface')}>
                {t('settings.a11yTitle', {}, { defaultValue: 'Accessibility' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                {t(
                  'settings.a11yBody',
                  { appName: APP_NAME },
                  {
                    defaultValue:
                      '{{appName}} ships with high-contrast palettes, dyslexia-friendly fonts, and configurable motion reduction. Mix and match to fit each student.',
                  },
                )}
              </p>
              <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'md:grid-cols-2')}>
                {[
                  {
                    icon: 'closed_caption',
                    label: 'Live captions',
                    body: 'Pinned to the bottom of every video tile.',
                  },
                  {
                    icon: 'contrast',
                    label: 'High contrast',
                    body: 'Boost text + chrome contrast 4.5:1 minimum.',
                  },
                  {
                    icon: 'sign_language',
                    label: 'Interpreter pin',
                    body: 'Reserves a tile slot for your ASL interpreter.',
                  },
                  {
                    icon: 'rule',
                    label: 'Reduce motion',
                    body: 'Skip parallax orbs, fades, and the laser trail.',
                  },
                ].map((opt) => (
                  <div
                    key={opt.label}
                    className={cm.cn(
                      cm.sp('p', 4),
                      cm.stack(1),
                      'rounded-xl bg-surface-container-low',
                    )}
                  >
                    <span
                      className={cm.cn(
                        'h-9 w-9 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center',
                      )}
                    >
                      <span className={cm.cn('material-symbols-outlined text-[20px]')}>
                        {opt.icon}
                      </span>
                    </span>
                    <p
                      className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}
                    >
                      {t(`settings.a11y_${opt.label}`, {}, { defaultValue: opt.label })}
                    </p>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {t(`settings.a11yBody_${opt.label}`, {}, { defaultValue: opt.body })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === 'language' && (
            <div
              className={cm.cn(
                cm.sp('p', 8),
                cm.stack(5),
                'rounded-2xl bg-surface-container-lowest border border-outline-variant/10',
              )}
            >
              <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface')}>
                {t('settings.language.title', {}, { defaultValue: 'Language' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                {t(
                  'common.chooseTheLanguage',
                  {},
                  { defaultValue: 'Choose the language used throughout the app.' },
                )}
              </p>
              <LanguagePicker />
            </div>
          )}

          {section === 'security' && (
            <div
              className={cm.cn(
                cm.sp('p', 8),
                cm.stack(5),
                'rounded-2xl bg-surface-container-lowest border border-outline-variant/10',
              )}
            >
              <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface')}>
                {t('settings.securityTitle', {}, { defaultValue: 'Sign-in & security' })}
              </h2>
              <ul className={cm.stack(3)}>
                {[
                  { icon: 'mail_lock', label: 'Update email', body: 'aiyana@aula.school' },
                  { icon: 'key', label: 'Change password', body: 'Last changed 92 days ago' },
                  {
                    icon: 'verified_user',
                    label: 'Two-factor authentication',
                    body: 'Enabled · authenticator app',
                  },
                  {
                    icon: 'logout',
                    label: 'Sign out everywhere',
                    body: 'Signs you out on every device',
                  },
                ].map((row) => {
                  const isTwoFactor = row.label === 'Two-factor authentication'
                  return (
                    <li
                      key={row.label}
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 4 }),
                        cm.sp('p', 4),
                        'rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors',
                      )}
                    >
                      <span
                        className={cm.cn(
                          'h-10 w-10 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center',
                        )}
                      >
                        <span className={cm.cn('material-symbols-outlined text-[20px]')}>
                          {row.icon}
                        </span>
                      </span>
                      <div className={cm.flex1}>
                        <p
                          className={cm.cn(
                            cm.textSize('sm'),
                            cm.fontWeight('bold'),
                            'text-on-surface',
                          )}
                        >
                          {t(`settings.sec_${row.label}`, {}, { defaultValue: row.label })}
                        </p>
                        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                          {isTwoFactor
                            ? twoFactorEnabled
                              ? t(
                                  'settings.twoFactorOnBody',
                                  {},
                                  { defaultValue: 'Enabled · authenticator app' },
                                )
                              : t('settings.twoFactorOffBody', {}, { defaultValue: 'Not enabled' })
                            : t(`settings.secBody_${row.label}`, {}, { defaultValue: row.body })}
                        </p>
                      </div>
                      {isTwoFactor ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (twoFactorEnabled) {
                              setTfError('')
                              setTfToken('')
                              setTfModal('disable')
                            } else {
                              void startEnable()
                            }
                          }}
                          data-mol-id={
                            twoFactorEnabled ? 'two-factor-disable' : 'two-factor-enable'
                          }
                        >
                          {twoFactorEnabled
                            ? t('settings.twoFactorDisable', {}, { defaultValue: 'Disable' })
                            : t('settings.twoFactorEnable', {}, { defaultValue: 'Enable' })}
                        </Button>
                      ) : (
                        <span
                          className={cm.cn('material-symbols-outlined text-on-surface-variant')}
                        >
                          chevron_right
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </section>
        <section
          className={cm.cn(cm.sp('p', 8), 'col-span-12 bg-surface-container-low rounded-xl')}
        >
          <div className={cm.sp('mb', 6)}>
            <h3 className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}>
              {t('settings.appearance.title', {}, { defaultValue: 'Appearance' })}
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
      </div>

      <Modal
        open={tfModal !== null}
        onClose={closeTf}
        title={
          tfModal === 'disable'
            ? t(
                'settings.twoFactorDisableTitle',
                {},
                {
                  defaultValue: 'Disable two-factor authentication',
                },
              )
            : t(
                'settings.twoFactorEnableTitle',
                {},
                {
                  defaultValue: 'Enable two-factor authentication',
                },
              )
        }
      >
        {tfError && (
          <Alert status="error" className={cm.sp('mb', 4)}>
            {tfError}
          </Alert>
        )}
        {tfModal === 'enable' && tfSetup?.QRImageUrl ? (
          <div className={cm.cn(cm.stack(3), cm.sp('mb', 4))}>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'settings.twoFactorScan',
                {},
                {
                  defaultValue:
                    'Scan this QR code with your authenticator app, then enter the 6-digit code.',
                },
              )}
            </p>
            <img
              src={tfSetup.QRImageUrl}
              alt={t('settings.twoFactorQrAlt', {}, { defaultValue: 'Two-factor QR code' })}
              className={cm.cn('mx-auto', cm.maxW('xs'))}
            />
            {tfSetup.secret ? (
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  'text-on-surface-variant text-center break-all',
                )}
              >
                {tfSetup.secret}
              </p>
            ) : null}
          </div>
        ) : null}
        {(tfModal === 'disable' || tfSetup) && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void submitTf(tfModal === 'disable' ? 'disable' : 'enable')
            }}
            className={cm.stack(4)}
          >
            <div>
              <label htmlFor="tf-token" className={cm.formLabel}>
                {t('settings.twoFactorCode', {}, { defaultValue: 'Authentication code' })}
              </label>
              <Input
                id="tf-token"
                type="text"
                value={tfToken}
                onChange={(e) => setTfToken((e.target as HTMLInputElement).value)}
                autoComplete="one-time-code"
                required
              />
            </div>
            <Button
              type="submit"
              color={tfModal === 'disable' ? 'error' : undefined}
              fullWidth
              loading={tfLoading}
            >
              {tfModal === 'disable'
                ? t('settings.twoFactorDisable', {}, { defaultValue: 'Disable' })
                : t('settings.twoFactorVerify', {}, { defaultValue: 'Verify & enable' })}
            </Button>
          </form>
        )}
      </Modal>
    </div>
  )
}

export default Settings
