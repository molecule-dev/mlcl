import { useEffect, useState } from 'react'

import { useHttpClient, useTheme, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { unwrapSingle } from '../lib/unwrap.js'

const SECTIONS = [
  { id: 'notifications', icon: 'notifications', label: 'Notifications' },
  { id: 'privacy', icon: 'shield', label: 'Privacy' },
  { id: 'language', icon: 'translate', label: 'Language & region' },
  { id: 'appearance', icon: 'palette', label: 'Appearance' },
  { id: 'accessibility', icon: 'accessibility_new', label: 'Accessibility' },
  { id: 'host', icon: 'cottage', label: 'Host preferences' },
] as const

type SectionId = (typeof SECTIONS)[number]['id']

interface ProfilePayload {
  notifications?: {
    email_marketing?: boolean
    email_booking_updates?: boolean
    sms_booking_updates?: boolean
    push_messages?: boolean
  }
  language?: string
}

interface ToggleRowProps {
  cm: ReturnType<typeof getClassMap>
  title: string
  hint: string
  value: boolean
  onToggle: () => void
}

function ToggleRow({ cm, title, hint, value, onToggle }: ToggleRowProps) {
  return (
    <li
      className={cm.cn(
        cm.sp('py', 4),
        cm.flex({ align: 'center', justify: 'between' }),
        'border-b border-outline-variant/40 last:border-b-0',
      )}
    >
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'pr-4')}>
        <p className={cm.fontWeight('bold')}>{title}</p>
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>{hint}</p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={value}
        className={cm.cn(
          'w-12 h-7 rounded-full transition-colors relative flex-shrink-0',
          value ? 'bg-primary' : 'bg-outline-variant',
        )}
      >
        <span
          className={cm.cn(
            'absolute top-1 w-5 h-5 rounded-full bg-surface shadow transition-transform',
            value ? 'right-1' : 'left-1',
          )}
        />
      </button>
    </li>
  )
}

export function Settings() {
  const cm = getClassMap()
  const { t, locale, setLocale, locales } = useTranslation()
  const http = useHttpClient()
  const { themeName, setTheme } = useTheme()
  const [active, setActive] = useState<SectionId>('notifications')

  // Notifications + privacy preferences map onto /api/profile/me
  const [emailNotifs, setEmailNotifs] = useState(true)
  const [pushNotifs, setPushNotifs] = useState(true)
  const [smsNotifs, setSmsNotifs] = useState(false)
  const [emailMarketing, setEmailMarketing] = useState(true)

  // Language persists on the profile (and on first load also drives i18n).
  // The picker itself reads from useTranslation().locales/locale so the
  // dropdown always reflects whatever the i18n bond registered.

  // The remaining toggles persist locally — the API doesn't model them
  // yet, but they survive a reload via localStorage so the page still
  // feels real.
  const [analytics, setAnalytics] = useState(true)
  const [shareProfile, setShareProfile] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)
  const [largeText, setLargeText] = useState(false)
  const [autoConfirm, setAutoConfirm] = useState(true)
  const [hydrated, setHydrated] = useState(false)

  // Hydrate once from the API + localStorage.
  useEffect(() => {
    let cancelled = false
    http
      .get('/api/profile/me')
      .then((res) => {
        if (cancelled) return
        const profile = unwrapSingle<ProfilePayload>(res)
        if (profile?.notifications) {
          setEmailNotifs(profile.notifications.email_booking_updates ?? true)
          setPushNotifs(profile.notifications.push_messages ?? true)
          setSmsNotifs(profile.notifications.sms_booking_updates ?? false)
          setEmailMarketing(profile.notifications.email_marketing ?? true)
        }
        if (profile?.language && profile.language !== locale) {
          void setLocale(profile.language)
        }
      })
      .catch(() => {
        /* fall back to defaults */
      })
      .finally(() => {
        if (cancelled) return
        // Hydrate local toggles from localStorage so they survive reloads.
        try {
          setAnalytics(JSON.parse(localStorage.getItem('alcove.privacy.analytics') ?? 'true'))
          setShareProfile(
            JSON.parse(localStorage.getItem('alcove.privacy.shareProfile') ?? 'false'),
          )
          setReduceMotion(JSON.parse(localStorage.getItem('alcove.a11y.reduceMotion') ?? 'false'))
          setLargeText(JSON.parse(localStorage.getItem('alcove.a11y.largeText') ?? 'false'))
          setAutoConfirm(JSON.parse(localStorage.getItem('alcove.host.autoConfirm') ?? 'true'))
        } catch (_error) {
          // Bad JSON in localStorage — keep defaults.
        }
        setHydrated(true)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount; locale/setLocale intentionally omitted to avoid re-hydrating on every locale change
  }, [http])

  // Persist toggles. Each toggle handler patches its slice — we don't
  // batch because patches are cheap and giving the user instant
  // feedback when a switch lands in a bad state is more important than
  // saving a few bytes of network.
  const persistNotifs = async (next: {
    email_booking_updates?: boolean
    push_messages?: boolean
    sms_booking_updates?: boolean
    email_marketing?: boolean
  }) => {
    if (!hydrated) return
    try {
      await http.patch('/api/profile/me', { notifications: next })
    } catch (_error) {
      // Best-effort persist — will surface via toast bond once wired.
    }
  }
  const persistLang = async (value: string) => {
    if (!hydrated) return
    try {
      await http.patch('/api/profile/me', { language: value })
    } catch (_error) {
      // Best-effort persist — UI state already reflects the selection.
    }
  }
  const persistLocal = (key: string, value: unknown) => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (_error) {
      // localStorage may be blocked (private browsing) — non-fatal.
    }
  }

  return (
    <div className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <div className={cm.sp('mb', 8)}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-[0.25em] text-primary',
          )}
        >
          {t('nav.preferences', {}, { defaultValue: 'Preferences' })}
        </p>
        <h1
          className={cm.cn(
            cm.textSize('4xl'),
            cm.fontWeight('extrabold'),
            cm.sp('mt', 2),
            'leading-tight',
          )}
          style={{ fontFamily: '"DM Sans", system-ui, sans-serif', letterSpacing: '-0.02em' }}
        >
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
      </div>

      <div className={cm.cn('grid grid-cols-1 lg:grid-cols-12 gap-6')}>
        <nav
          className={'lg:col-span-3'}
          aria-label={t('nav.settingsSections', {}, { defaultValue: 'Settings sections' })}
        >
          <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setActive(s.id)}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.flex({ align: 'center', gap: 'sm' }),
                    'w-full rounded-xl text-left transition-colors',
                    active === s.id
                      ? 'bg-primary text-on-primary font-bold'
                      : 'text-on-surface-variant hover:bg-surface-container-low hover:text-primary',
                  )}
                  aria-current={active === s.id ? 'page' : undefined}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    {s.icon}
                  </span>
                  <span className={cm.fontWeight('semibold')}>
                    {t(`settings.section.${s.id}`, {}, { defaultValue: s.label })}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <section className={'lg:col-span-9'}>
          <div
            className={cm.cn(
              cm.sp('p', 6),
              'bg-surface rounded-2xl border border-outline-variant/40',
            )}
          >
            {active === 'notifications' ? (
              <>
                <h2
                  className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 4))}
                  style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                >
                  {t('settings.section.notifications', {}, { defaultValue: 'Notifications' })}
                </h2>
                <ul>
                  <ToggleRow
                    cm={cm}
                    title={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                    hint={t(
                      'settings.notif.emailHint',
                      {},
                      { defaultValue: 'Booking confirmations, host messages, weekly digest.' },
                    )}
                    value={emailNotifs}
                    onToggle={() => {
                      const next = !emailNotifs
                      setEmailNotifs(next)
                      void persistNotifs({ email_booking_updates: next })
                    }}
                  />
                  <ToggleRow
                    cm={cm}
                    title={t('settings.notif.push', {}, { defaultValue: 'Push' })}
                    hint={t(
                      'settings.notif.pushHint',
                      {},
                      { defaultValue: 'Time-sensitive alerts on your phone.' },
                    )}
                    value={pushNotifs}
                    onToggle={() => {
                      const next = !pushNotifs
                      setPushNotifs(next)
                      void persistNotifs({ push_messages: next })
                    }}
                  />
                  <ToggleRow
                    cm={cm}
                    title={t('settings.notif.sms', {}, { defaultValue: 'SMS' })}
                    hint={t(
                      'settings.notif.smsHint',
                      {},
                      { defaultValue: 'Critical-only — booking declines or last-minute changes.' },
                    )}
                    value={smsNotifs}
                    onToggle={() => {
                      const next = !smsNotifs
                      setSmsNotifs(next)
                      void persistNotifs({ sms_booking_updates: next })
                    }}
                  />
                  <ToggleRow
                    cm={cm}
                    title={t('settings.notif.marketing', {}, { defaultValue: 'Marketing emails' })}
                    hint={t(
                      'settings.notif.marketingHint',
                      { appName: APP_NAME },
                      {
                        defaultValue: 'Editorial picks and seasonal collections from {{appName}}.',
                      },
                    )}
                    value={emailMarketing}
                    onToggle={() => {
                      const next = !emailMarketing
                      setEmailMarketing(next)
                      void persistNotifs({ email_marketing: next })
                    }}
                  />
                </ul>
              </>
            ) : null}

            {active === 'privacy' ? (
              <>
                <h2
                  className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 4))}
                  style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                >
                  {t('nav.privacy', {}, { defaultValue: 'Privacy' })}
                </h2>
                <ul>
                  <ToggleRow
                    cm={cm}
                    title={t(
                      'settings.privacy.analytics',
                      {},
                      { defaultValue: 'Anonymous analytics' },
                    )}
                    hint={t(
                      'settings.privacy.analyticsHint',
                      {},
                      { defaultValue: 'Helps us improve search results and discovery.' },
                    )}
                    value={analytics}
                    onToggle={() => {
                      const next = !analytics
                      setAnalytics(next)
                      persistLocal('alcove.privacy.analytics', next)
                    }}
                  />
                  <ToggleRow
                    cm={cm}
                    title={t(
                      'settings.privacy.shareProfile',
                      {},
                      { defaultValue: 'Show profile to hosts' },
                    )}
                    hint={t(
                      'settings.privacy.shareProfileHint',
                      {},
                      {
                        defaultValue: 'Hosts can see your bio and past bookings before approving.',
                      },
                    )}
                    value={shareProfile}
                    onToggle={() => {
                      const next = !shareProfile
                      setShareProfile(next)
                      persistLocal('alcove.privacy.shareProfile', next)
                    }}
                  />
                </ul>
              </>
            ) : null}

            {active === 'language' ? (
              <>
                <h2
                  className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 4))}
                  style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                >
                  {t('settings.section.language', {}, { defaultValue: 'Language & region' })}
                </h2>
                <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), cm.sp('mb', 4))}>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('settings.lang.label', {}, { defaultValue: 'Display language' })}
                  </span>
                  <select
                    value={locale}
                    data-mol-id="language-picker-select"
                    onChange={(e) => {
                      const next = e.target.value
                      void setLocale(next)
                      void persistLang(next)
                    }}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'bg-surface-container-low rounded-xl border border-outline-variant/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 font-semibold',
                    )}
                  >
                    {[...locales]
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((l) => (
                        <option key={l.code} value={l.code}>
                          {l.name}
                        </option>
                      ))}
                  </select>
                </label>
              </>
            ) : null}

            {active === 'appearance' ? (
              <>
                <h2
                  className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 4))}
                  style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                >
                  {t('nav.appearance', {}, { defaultValue: 'Appearance' })}
                </h2>
                <fieldset className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}>
                  {(['light', 'dark'] as const).map((opt) => (
                    <label
                      key={opt}
                      className={cm.cn(
                        cm.sp('px', 5),
                        cm.sp('py', 2),
                        'cursor-pointer rounded-full border transition-colors text-sm font-bold uppercase tracking-widest',
                        themeName === opt
                          ? 'bg-primary text-on-primary border-primary'
                          : 'border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary',
                      )}
                    >
                      <input
                        type="radio"
                        name="theme"
                        value={opt}
                        checked={themeName === opt}
                        onChange={() => setTheme(opt)}
                        className="sr-only"
                      />
                      {t(`settings.appearance.${opt}`, {}, { defaultValue: opt })}
                    </label>
                  ))}
                </fieldset>
                <p className={cm.cn(cm.sp('mt', 3), cm.textSize('xs'), 'text-on-surface-variant')}>
                  {t(
                    'settings.appearance.hint',
                    {},
                    {
                      defaultValue:
                        'Theme preference is saved to this device and survives reloads.',
                    },
                  )}
                </p>
              </>
            ) : null}

            {active === 'accessibility' ? (
              <>
                <h2
                  className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 4))}
                  style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                >
                  {t('settings.section.accessibility', {}, { defaultValue: 'Accessibility' })}
                </h2>
                <ul>
                  <ToggleRow
                    cm={cm}
                    title={t('settings.a11y.reduceMotion', {}, { defaultValue: 'Reduce motion' })}
                    hint={t(
                      'settings.a11y.reduceMotionHint',
                      {},
                      { defaultValue: 'Disables transitions and parallax effects.' },
                    )}
                    value={reduceMotion}
                    onToggle={() => {
                      const next = !reduceMotion
                      setReduceMotion(next)
                      persistLocal('alcove.a11y.reduceMotion', next)
                    }}
                  />
                  <ToggleRow
                    cm={cm}
                    title={t('settings.a11y.largeText', {}, { defaultValue: 'Larger text' })}
                    hint={t(
                      'settings.a11y.largeTextHint',
                      {},
                      { defaultValue: 'Bumps body type up one step.' },
                    )}
                    value={largeText}
                    onToggle={() => {
                      const next = !largeText
                      setLargeText(next)
                      persistLocal('alcove.a11y.largeText', next)
                    }}
                  />
                </ul>
              </>
            ) : null}

            {active === 'host' ? (
              <>
                <h2
                  className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 4))}
                  style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                >
                  {t('settings.section.host', {}, { defaultValue: 'Host preferences' })}
                </h2>
                <ul>
                  <ToggleRow
                    cm={cm}
                    title={t(
                      'settings.host.autoConfirm',
                      {},
                      { defaultValue: 'Auto-confirm instant book' },
                    )}
                    hint={t(
                      'settings.host.autoConfirmHint',
                      {},
                      {
                        defaultValue:
                          'Bookings inside your published availability skip manual review.',
                      },
                    )}
                    value={autoConfirm}
                    onToggle={() => {
                      const next = !autoConfirm
                      setAutoConfirm(next)
                      persistLocal('alcove.host.autoConfirm', next)
                    }}
                  />
                </ul>
              </>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  )
}
