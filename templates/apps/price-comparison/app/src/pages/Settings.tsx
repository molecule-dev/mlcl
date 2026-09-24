import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuth, useChangePassword, useHttpClient, useTranslation } from '@molecule/app-react'
import { NotificationsSection } from '@molecule/app-settings-panel-react'
import { getClassMap } from '@molecule/app-ui'
import {
  Alert,
  Button,
  Input,
  LanguagePicker,
  Modal,
  Spinner,
  Switch,
  ThemeToggle,
} from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { fmtRelative, unwrapList } from '../lib/unwrap.js'

interface AccountUser {
  id?: string
  name?: string | null
  email?: string | null
  metadata?: Record<string, unknown>
}

interface ApiUser {
  id: string
  name?: string | null
  email?: string | null
  oauthData?: {
    preferences?: Record<string, boolean>
    currency?: string
  } | null
}

interface Device {
  id: string
  name?: string | null
  pushPlatform?: string | null
  updatedAt?: string | null
  createdAt?: string | null
  // The API marks the device making the current request so we can label it
  // "This device" and hide its revoke control.
  isCurrent?: boolean
}

const PREFS = [
  {
    key: 'email_alerts',
    icon: 'mail',
    title: 'Email alerts',
    body: 'Send me an email the moment a watchlist target hits.',
    defaultOn: true,
  },
  {
    key: 'push_alerts',
    icon: 'mobile_friendly',
    title: 'Push notifications',
    body: 'Tap-to-buy push to my phone for time-sensitive drops.',
    defaultOn: true,
  },
  {
    key: 'sms_alerts',
    icon: 'sms',
    title: 'SMS for hottest drops',
    body: 'Only fire SMS when the drop is greater than 25%.',
    defaultOn: false,
  },
  {
    key: 'weekly_digest',
    icon: 'newspaper',
    title: 'Weekly digest',
    body: 'A Sunday-morning roundup of trending drops in your categories.',
    defaultOn: true,
  },
] as const

const DEFAULT_PREFS: Record<string, boolean> = Object.fromEntries(
  PREFS.map((p) => [p.key, p.defaultOn]),
)

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const auth = useAuth<AccountUser>()
  const http = useHttpClient()
  const userId = auth.user?.id ?? ''
  const [name, setName] = useState(auth.user?.name ?? '')
  const [email, setEmail] = useState(auth.user?.email ?? '')
  const [prefs, setPrefs] = useState<Record<string, boolean>>(DEFAULT_PREFS)
  const [currency, setCurrency] = useState('USD')
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  // Track per-field user interaction so an in-flight GET cannot clobber
  // text the user has already typed during initial page load.
  const editedName = useRef(false)
  const editedEmail = useRef(false)
  const editedPrefs = useRef(false)
  const editedCurrency = useRef(false)

  const navigate = useNavigate()
  // OAuth-only accounts have no local password to change — hide that section.
  const isOauthUser = Boolean((auth.user as unknown as Record<string, unknown>)?.oauthServer)
  const { status: pwStatus, error: pwError, changePassword, reset: pwReset } = useChangePassword()
  const [showPwModal, setShowPwModal] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletePw, setDeletePw] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [devices, setDevices] = useState<Device[]>([])
  const [devicesLoading, setDevicesLoading] = useState(true)
  const [confirmingDeviceId, setConfirmingDeviceId] = useState<string | null>(null)
  const [revokingDeviceId, setRevokingDeviceId] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    void (async () => {
      try {
        const res = await http.get(`/api/users/${userId}`)
        if (cancelled) return
        const wrapped = (res as { data?: { props?: ApiUser } | ApiUser }).data
        const u: ApiUser =
          (wrapped && typeof wrapped === 'object' && 'props' in wrapped
            ? (wrapped as { props: ApiUser }).props
            : (wrapped as ApiUser)) ?? ({} as ApiUser)
        if (u.name && !editedName.current) setName(u.name)
        if (u.email && !editedEmail.current) setEmail(u.email)
        const oauth = u.oauthData ?? {}
        if (oauth.preferences && !editedPrefs.current)
          setPrefs({ ...DEFAULT_PREFS, ...oauth.preferences })
        if (oauth.currency && !editedCurrency.current) setCurrency(oauth.currency)
      } catch (_error) {
        // non-fatal: settings form pre-fills from auth context if the API call fails
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http, userId])

  const loadDevices = useCallback(async () => {
    try {
      const res = await http.get('/api/devices')
      setDevices(unwrapList<Device>(res))
    } catch (_error) {
      // non-fatal: the devices list renders empty if the endpoint is unavailable
    } finally {
      setDevicesLoading(false)
    }
  }, [http])

  useEffect(() => {
    void loadDevices()
  }, [loadDevices])

  const revokeDevice = async (id: string) => {
    setRevokingDeviceId(id)
    try {
      // Deleting the device row triggers server-side session revocation, so the
      // removed device is actually signed out — not just hidden from the list.
      await http.delete(`/api/devices/${id}`)
      setConfirmingDeviceId(null)
      await loadDevices()
    } catch (_error) {
      // best-effort: keep the row so the user can retry the revoke
    } finally {
      setRevokingDeviceId(null)
    }
  }

  const togglePref = (key: string, checked: boolean) => {
    editedPrefs.current = true
    setPrefs((p) => ({ ...p, [key]: checked }))
  }

  const save = async () => {
    if (!userId) return
    setSavingState('saving')
    try {
      await http.patch(`/api/users/${userId}`, {
        name,
        email,
        oauthData: { preferences: prefs, currency },
      })
      setSavingState('saved')
      setTimeout(() => setSavingState('idle'), 2000)
    } catch (_error) {
      // save failure is surfaced to the user via savingState='error'; no further handling needed
      setSavingState('error')
      setTimeout(() => setSavingState('idle'), 3000)
    }
  }

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await changePassword(currentPw, newPw)
      setShowPwModal(false)
      setCurrentPw('')
      setNewPw('')
      pwReset()
    } catch (_error) {
      // error is surfaced via useChangePassword's `pwError` state; the modal stays open
    }
  }

  const handleDelete = async (e: FormEvent) => {
    e.preventDefault()
    if (!userId) return
    setDeleteLoading(true)
    setDeleteError('')
    try {
      await http.delete(`/api/users/${userId}`, { data: { password: deletePw } })
      await auth.logout()
      navigate('/login')
    } catch (err) {
      setDeleteError(
        err instanceof Error
          ? err.message
          : t('settings.deleteFailed', {}, { defaultValue: 'Failed to delete account' }),
      )
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div
      className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-8 max-w-4xl')}
      data-test="settings-page"
    >
      <header
        className={cm.cn(cm.flex({ align: 'start', justify: 'between', wrap: 'wrap', gap: 'md' }))}
      >
        <div>
          <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-primary')}>
            {t('settings.account', {}, { defaultValue: 'Account' })}
          </p>
          <h1
            className={cm.cn(
              'mt-1 text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface',
            )}
          >
            {t('nav.settings', {}, { defaultValue: 'Settings' })}
          </h1>
        </div>
        <button
          type="button"
          data-test="settings-save"
          onClick={() => void save()}
          disabled={savingState === 'saving'}
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'rounded-full bg-primary text-on-primary uppercase tracking-wider hover:opacity-95 transition-all shadow-md shadow-primary/20 disabled:opacity-60',
          )}
        >
          {savingState === 'saving'
            ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
            : savingState === 'saved'
              ? t('common.saved', {}, { defaultValue: 'Saved' })
              : savingState === 'error'
                ? t('settings.saveError', {}, { defaultValue: 'Try again' })
                : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
        </button>
      </header>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm space-y-4',
        )}
      >
        <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-secondary')}>
          {t('nav.profile', {}, { defaultValue: 'Profile' })}
        </p>
        <h2
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('extrabold'),
            'tracking-tight text-on-surface',
          )}
        >
          {t('settings.profileHeading', {}, { defaultValue: 'Public profile' })}
        </h2>
        <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 gap-4')}>
          <label className={cm.cn('block')}>
            <span
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('form.displayName', {}, { defaultValue: 'Display name' })}
            </span>
            <input
              type="text"
              data-test="settings-name"
              value={name}
              onChange={(e) => {
                editedName.current = true
                setName(e.target.value)
              }}
              placeholder={t('settings.namePlaceholder', {}, { defaultValue: 'Smart shopper' })}
              className={cm.cn(
                cm.w('full'),
                cm.sp('mt', 1),
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('base'),
                'rounded-xl border-2 border-outline-variant/40 bg-surface-container-low text-on-surface focus:border-primary focus:bg-surface-container-lowest focus:outline-none transition-colors',
              )}
            />
          </label>
          <label className={cm.cn('block')}>
            <span
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
            </span>
            <input
              type="email"
              data-test="settings-email"
              value={email}
              onChange={(e) => {
                editedEmail.current = true
                setEmail(e.target.value)
              }}
              autoComplete="email"
              placeholder={t(
                'auth.passwordPlaceholderEmail',
                {},
                { defaultValue: 'you@example.com' },
              )}
              className={cm.cn(
                cm.w('full'),
                cm.sp('mt', 1),
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('base'),
                'rounded-xl border-2 border-outline-variant/40 bg-surface-container-low text-on-surface focus:border-primary focus:bg-surface-container-lowest focus:outline-none transition-colors',
              )}
            />
          </label>
        </div>
      </section>

      {!isOauthUser ? (
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm space-y-4',
          )}
          data-test="settings-security"
        >
          <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-secondary')}>
            {t('settings.securityEyebrow', {}, { defaultValue: 'Security' })}
          </p>
          <h2
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('extrabold'),
              'tracking-tight text-on-surface',
            )}
          >
            {t('settings.securityHeading', {}, { defaultValue: 'Password & sign-in' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'settings.securityBody',
              {},
              { defaultValue: 'Update the password you use to sign in to your account.' },
            )}
          </p>
          <button
            type="button"
            data-test="settings-change-password"
            onClick={() => setShowPwModal(true)}
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'rounded-full border-2 border-outline-variant/50 text-on-surface uppercase tracking-wider hover:bg-surface-container transition-colors',
            )}
          >
            {t('settings.changePassword', {}, { defaultValue: 'Change password' })}
          </button>
        </section>
      ) : null}

      <section
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm space-y-4',
        )}
      >
        <header>
          <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-tertiary')}>
            {t('settings.notificationsEyebrow', {}, { defaultValue: 'Reach me on' })}
          </p>
          <h2
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('extrabold'),
              'tracking-tight text-on-surface',
            )}
          >
            {t('settings.notificationsHeading', {}, { defaultValue: 'Alert preferences' })}
          </h2>
        </header>
        <ul className={cm.cn('divide-y divide-outline-variant/30')}>
          {PREFS.map((p) => (
            <li
              key={p.key}
              data-test={`settings-pref-${p.key}`}
              className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), cm.sp('py', 4))}
            >
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  'h-10 w-10 rounded-lg',
                  prefs[p.key]
                    ? 'bg-primary/15 text-primary'
                    : 'bg-surface-container text-on-surface-variant',
                )}
                aria-hidden="true"
              >
                <span className={cm.cn('material-symbols-outlined text-xl')}>{p.icon}</span>
              </span>
              <div className={cm.cn('flex-1 min-w-0')}>
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('extrabold'),
                    'text-on-surface',
                  )}
                >
                  {t(`settings.pref.${p.key}.title`, {}, { defaultValue: p.title })}
                </p>
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.sp('mt', 1),
                    'text-on-surface-variant leading-relaxed',
                  )}
                >
                  {t(`settings.pref.${p.key}.body`, {}, { defaultValue: p.body })}
                </p>
              </div>
              <Switch
                checked={prefs[p.key]}
                onChange={(e) => togglePref(p.key, (e.target as HTMLInputElement).checked)}
                data-test={`settings-toggle-${p.key}`}
                aria-label={t(`settings.pref.${p.key}.title`, {}, { defaultValue: p.title })}
              />
            </li>
          ))}
        </ul>
      </section>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm space-y-4',
        )}
        data-test="settings-push"
      >
        <NotificationsSection />
      </section>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm space-y-4',
        )}
      >
        <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-secondary')}>
          {t('settings.regionEyebrow', {}, { defaultValue: 'Region' })}
        </p>
        <h2
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('extrabold'),
            'tracking-tight text-on-surface',
          )}
        >
          {t('settings.regionHeading', {}, { defaultValue: 'Currency & locale' })}
        </h2>
        <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'sm' }))} data-test="settings-currency">
          {['USD', 'EUR', 'GBP', 'CAD', 'AUD'].map((c) => (
            <button
              key={c}
              type="button"
              data-test={`settings-currency-${c}`}
              onClick={() => {
                editedCurrency.current = true
                setCurrency(c)
              }}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'rounded-full uppercase tracking-wider transition-colors',
                currency === c
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm space-y-4',
        )}
        data-mol-id="settings-language"
      >
        <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-secondary')}>
          {t('footer.language', {}, { defaultValue: 'Language' })}
        </p>
        <h2
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('extrabold'),
            'tracking-tight text-on-surface',
          )}
        >
          {t('footer.language', {}, { defaultValue: 'Language' })}
        </h2>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'common.chooseTheLanguage',
            {},
            { defaultValue: 'Choose the language used throughout the app.' },
          )}
        </p>
        <LanguagePicker />
      </section>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm space-y-4',
        )}
      >
        <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-secondary')}>
          {t('nav.appearance', {}, { defaultValue: 'Appearance' })}
        </p>
        <h2
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('extrabold'),
            'tracking-tight text-on-surface',
          )}
        >
          {t('nav.appearance', {}, { defaultValue: 'Appearance' })}
        </h2>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('common.toggleLightDark', {}, { defaultValue: 'Toggle between light and dark mode.' })}
        </p>
        <ThemeToggle />
      </section>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm space-y-4',
        )}
        data-test="settings-devices"
      >
        <header className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <div className={cm.cn('flex-1')}>
            <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-tertiary')}>
              {t('settings.devicesEyebrow', {}, { defaultValue: 'Your devices' })}
            </p>
            <h2
              className={cm.cn(
                cm.textSize('xl'),
                cm.fontWeight('extrabold'),
                'tracking-tight text-on-surface',
              )}
            >
              {t('settings.devicesHeading', {}, { defaultValue: 'Signed-in devices' })}
            </h2>
          </div>
          {devicesLoading ? <Spinner size="sm" /> : null}
        </header>
        {!devicesLoading && devices.length === 0 ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('settings.noDevices', {}, { defaultValue: 'No devices are registered yet.' })}
          </p>
        ) : (
          <ul className={cm.cn('divide-y divide-outline-variant/30')}>
            {devices.map((d) => (
              <li key={d.id} data-test={`settings-device-${d.id}`}>
                <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), cm.sp('py', 3))}>
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      'h-10 w-10 rounded-lg bg-surface-container text-on-surface-variant',
                    )}
                    aria-hidden="true"
                  >
                    <span className={cm.cn('material-symbols-outlined text-xl')}>devices</span>
                  </span>
                  <div className={cm.cn('flex-1 min-w-0')}>
                    <p
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'xs' }),
                        cm.textSize('sm'),
                        cm.fontWeight('bold'),
                        'text-on-surface',
                      )}
                    >
                      <span className={cm.cn('truncate')}>
                        {d.name ??
                          t('settings.unknownDevice', {}, { defaultValue: 'Unknown device' })}
                      </span>
                      {d.isCurrent ? (
                        <span
                          className={cm.cn(
                            cm.sp('px', 2),
                            'shrink-0 rounded-full bg-primary/15 text-[10px] font-black uppercase tracking-wider text-primary',
                          )}
                        >
                          {t('settings.thisDevice', {}, { defaultValue: 'This device' })}
                        </span>
                      ) : null}
                    </p>
                    {d.updatedAt ? (
                      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {t(
                          'settings.deviceLastSeen',
                          { time: fmtRelative(d.updatedAt) },
                          { defaultValue: 'Last active {{time}}' },
                        )}
                      </p>
                    ) : null}
                  </div>
                  {d.isCurrent ? null : confirmingDeviceId === d.id ? (
                    <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'shrink-0')}>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={revokingDeviceId === d.id}
                        onClick={() => setConfirmingDeviceId(null)}
                      >
                        {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                      </Button>
                      <Button
                        color="error"
                        size="sm"
                        loading={revokingDeviceId === d.id}
                        onClick={() => void revokeDevice(d.id)}
                        data-mol-id="device-revoke-confirm"
                        data-test={`settings-device-revoke-confirm-${d.id}`}
                      >
                        {t('settings.signOutDevice', {}, { defaultValue: 'Sign out' })}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmingDeviceId(d.id)}
                      data-mol-id="device-revoke"
                      data-test={`settings-device-revoke-${d.id}`}
                      className="shrink-0"
                    >
                      {t('settings.signOutDevice', {}, { defaultValue: 'Sign out' })}
                    </Button>
                  )}
                </div>
                {confirmingDeviceId === d.id ? (
                  <p
                    className={cm.cn(cm.textSize('xs'), cm.sp('pb', 3), 'text-on-surface-variant')}
                  >
                    {t(
                      'settings.revokeDeviceWarning',
                      {},
                      {
                        defaultValue: "This device's access will be revoked shortly. Sign it out?",
                      },
                    )}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
          'rounded-2xl bg-gradient-to-br from-primary-container/40 to-secondary-container/40 border border-outline-variant/30',
        )}
      >
        <div>
          <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-primary')}>
            {t('settings.proEyebrow', { appName: APP_NAME }, { defaultValue: '{{appName}} Team' })}
          </p>
          <h2
            className={cm.cn(
              cm.sp('mt', 1),
              cm.textSize('xl'),
              cm.fontWeight('extrabold'),
              'tracking-tight text-on-surface',
            )}
          >
            {t('settings.proHeading', {}, { defaultValue: 'Watch unlimited products + get SMS' })}
          </h2>
        </div>
        <Link
          to="/settings/billing"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'rounded-full bg-primary text-on-primary uppercase tracking-wider hover:opacity-95 transition-all shadow-md shadow-primary/20',
          )}
        >
          {t('settings.proCta', {}, { defaultValue: 'Manage plan' })}
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            arrow_forward
          </span>
        </Link>
      </section>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl border border-error/30 bg-error-container/20 space-y-4',
        )}
        data-test="settings-danger-zone"
      >
        <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-error')}>
          {t('settings.dangerEyebrow', {}, { defaultValue: 'Danger zone' })}
        </p>
        <h2
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('extrabold'),
            'tracking-tight text-on-surface',
          )}
        >
          {t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
        </h2>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'settings.deleteAccountBody',
            {},
            {
              defaultValue:
                'Permanently delete your account, watchlists, and alerts. This cannot be undone.',
            },
          )}
        </p>
        <button
          type="button"
          data-test="settings-delete-account"
          data-mol-id="user-menu-delete-account"
          onClick={() => setShowDeleteModal(true)}
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'rounded-full bg-error text-on-error uppercase tracking-wider hover:opacity-95 transition-all',
          )}
        >
          {t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
        </button>
      </section>

      <Modal
        open={showPwModal}
        onClose={() => {
          setShowPwModal(false)
          pwReset()
        }}
        title={t('settings.changePassword', {}, { defaultValue: 'Change password' })}
        data-mol-id="change-password-modal"
      >
        {pwError ? (
          <Alert status="error" className={cm.sp('mb', 4)}>
            {pwError.message ||
              t('settings.changePasswordError', {}, { defaultValue: 'Could not change password.' })}
          </Alert>
        ) : null}
        <form onSubmit={handleChangePassword} className={cm.cn('space-y-4')}>
          <Input
            type="password"
            label={t('settings.currentPassword', {}, { defaultValue: 'Current password' })}
            value={currentPw}
            onChange={(e) => setCurrentPw((e.target as HTMLInputElement).value)}
            autoComplete="current-password"
            required
          />
          <Input
            type="password"
            label={t('settings.newPassword', {}, { defaultValue: 'New password' })}
            value={newPw}
            onChange={(e) => setNewPw((e.target as HTMLInputElement).value)}
            autoComplete="new-password"
            required
          />
          <Button type="submit" fullWidth loading={pwStatus === 'pending'}>
            {pwStatus === 'pending'
              ? t('settings.changingPassword', {}, { defaultValue: 'Changing…' })
              : t('settings.changePassword', {}, { defaultValue: 'Change password' })}
          </Button>
        </form>
      </Modal>

      <Modal
        open={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setDeleteError('')
        }}
        title={t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
        data-mol-id="delete-account-modal"
      >
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mb', 4))}>
          {t(
            'settings.deleteAccountWarning',
            {},
            {
              defaultValue:
                'This permanently deletes your account and all associated data. Enter your password to confirm.',
            },
          )}
        </p>
        {deleteError ? (
          <Alert status="error" className={cm.sp('mb', 4)}>
            {deleteError}
          </Alert>
        ) : null}
        <form onSubmit={handleDelete} className={cm.cn('space-y-4')}>
          <Input
            type="password"
            label={t('settings.confirmPassword', {}, { defaultValue: 'Password' })}
            value={deletePw}
            onChange={(e) => setDeletePw((e.target as HTMLInputElement).value)}
            autoComplete="current-password"
            required
          />
          <Button type="submit" color="error" fullWidth loading={deleteLoading}>
            {deleteLoading
              ? t('settings.deletingAccount', {}, { defaultValue: 'Deleting…' })
              : t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
          </Button>
        </form>
      </Modal>
    </div>
  )
}
