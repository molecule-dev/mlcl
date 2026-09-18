import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { unwrapSingle } from '../lib/unwrap.js'

const SECTIONS = [
  'profile',
  'verifications',
  'payments',
  'preferences',
  'appearance',
  'language',
] as const
type Section = (typeof SECTIONS)[number]

interface ProfileForm {
  firstName: string
  lastName: string
  email: string
  phone: string
}

interface PreferencesForm {
  pushEnabled: boolean
  emailEnabled: boolean
  priceDropAlerts: boolean
}

function splitName(name: string | null | undefined): { firstName: string; lastName: string } {
  if (!name) return { firstName: '', lastName: '' }
  const trimmed = name.trim()
  if (!trimmed) return { firstName: '', lastName: '' }
  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) return { firstName: parts[0], lastName: '' }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user, setUser } = useAuth<UserProfile & { oauthData?: Record<string, unknown> }>()
  const http = useHttpClient()

  const [section, setSection] = useState<Section>('profile')
  const [profile, setProfile] = useState<ProfileForm>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  })
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

  const [prefs, setPrefs] = useState<PreferencesForm>({
    pushEnabled: true,
    emailEnabled: true,
    priceDropAlerts: true,
  })

  useEffect(() => {
    if (!user) return
    const split = splitName(user.name as string | undefined)
    const oauthData = (user.oauthData as Record<string, unknown> | undefined) ?? {}
    setProfile({
      firstName: split.firstName,
      lastName: split.lastName,
      email: user.email ?? '',
      phone: (oauthData.phone as string | undefined) ?? '',
    })
    const userPrefs = (oauthData.preferences as Partial<PreferencesForm> | undefined) ?? {}
    setPrefs({
      pushEnabled: userPrefs.pushEnabled ?? true,
      emailEnabled: userPrefs.emailEnabled ?? true,
      priceDropAlerts: userPrefs.priceDropAlerts ?? true,
    })
  }, [user])

  const verifications = useMemo(() => {
    if (!user) return []
    return [
      {
        id: 'email',
        label: 'Email',
        status: user.email ? 'verified' : 'pending',
        detail: user.email ?? '',
      },
      {
        id: 'phone',
        label: 'Phone',
        status: profile.phone ? 'verified' : 'pending',
        detail: profile.phone || 'Add a phone for booking SMS alerts',
      },
      {
        id: 'id',
        label: 'Government ID',
        status: 'pending',
        detail: 'Verify a government ID to host or to book some properties',
      },
    ]
  }, [user, profile.phone])

  async function saveProfile() {
    if (!user) return
    setProfileSaving(true)
    setProfileError(null)
    setProfileSaved(false)
    try {
      const fullName =
        [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim() || profile.firstName
      // Phone + preferences live under oauthData since the canonical user
      // schema only exposes name/email/username at the top level.
      const existingOauth = (user.oauthData as Record<string, unknown> | undefined) ?? {}
      const payload = {
        name: fullName,
        email: profile.email,
        oauthData: { ...existingOauth, phone: profile.phone, preferences: prefs },
      }
      const res = await http.patch(`/api/users/${user.id}`, payload)
      const updated = unwrapSingle<UserProfile & { oauthData?: Record<string, unknown> }>(res)
      if (!updated) throw new Error('No response from server')
      // Mirror the saved fields into the auth-context user so the
      // form re-renders with the persisted oauthData on this page +
      // every other page that reads from useAuth(). Without this the
      // user object only refreshes after a hard reload + refetch.
      const merged = {
        ...(user as unknown as Record<string, unknown>),
        ...(updated as unknown as Record<string, unknown>),
        oauthData: payload.oauthData,
      } as unknown as UserProfile & { oauthData?: Record<string, unknown> }
      setUser(merged)
      setProfileSaved(true)
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setProfileSaving(false)
      setTimeout(() => setProfileSaved(false), 2500)
    }
  }

  async function savePrefs(next: Partial<PreferencesForm>) {
    if (!user) return
    const merged = { ...prefs, ...next }
    setPrefs(merged)
    try {
      const existingOauth = (user.oauthData as Record<string, unknown> | undefined) ?? {}
      const nextOauth = { ...existingOauth, preferences: merged }
      await http.patch(`/api/users/${user.id}`, {
        oauthData: nextOauth,
      })
      const mergedUser = {
        ...(user as unknown as Record<string, unknown>),
        oauthData: nextOauth,
      } as unknown as UserProfile & { oauthData?: Record<string, unknown> }
      setUser(mergedUser)
    } catch (_error) {
      // Preference save failed — revert to previous state.
      setPrefs(prefs)
    }
  }

  return (
    <div className={cm.cn(cm.maxW('6xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <header className={cm.sp('mb', 6)}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-[0.25em] text-primary-dark',
          )}
        >
          {t('settings.account', {}, { defaultValue: 'Account' })}
        </p>
        <h1
          className={cm.cn(
            cm.textSize('4xl'),
            cm.fontWeight('extrabold'),
            cm.sp('mt', 2),
            'leading-tight tracking-tight',
          )}
          style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
        >
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
        {user?.name && (
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
            {t(
              'settings.signedInAs',
              { name: user.name as string },
              { defaultValue: 'Signed in as {{name}}' },
            )}
          </p>
        )}
      </header>

      <div className={cm.cn('grid grid-cols-12 gap-8')}>
        <aside className={'col-span-12 md:col-span-3'}>
          <nav
            className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}
            aria-label={t('nav.settingsSections', {}, { defaultValue: 'Settings sections' })}
          >
            {SECTIONS.map((s) => {
              const isActive = section === s
              const labels: Record<Section, string> = {
                profile: 'Profile',
                verifications: 'Verifications',
                payments: 'Payment methods',
                preferences: 'Preferences',
                appearance: 'Appearance',
                language: 'Language',
              }
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSection(s)}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'block w-full text-left rounded-xl transition-colors',
                    isActive
                      ? 'bg-primary-container text-primary-dark'
                      : 'text-on-surface hover:bg-surface-container',
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {t(`settings.section.${s}`, {}, { defaultValue: labels[s] })}
                </button>
              )
            })}
          </nav>
        </aside>

        <main className={'col-span-12 md:col-span-9 space-y-6'}>
          {section === 'profile' && (
            <section
              className={cm.cn(
                cm.sp('p', 6),
                'bg-surface rounded-2xl shadow-sm border-l-4 border-primary space-y-4',
              )}
            >
              <h2
                className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}
                style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
              >
                {t('settings.profile.heading', {}, { defaultValue: 'Profile' })}
              </h2>
              <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 gap-3')}>
                <Field
                  label={t('form.firstName', {}, { defaultValue: 'First name' })}
                  value={profile.firstName}
                  onChange={(v) => setProfile((p) => ({ ...p, firstName: v }))}
                />
                <Field
                  label={t('form.lastName', {}, { defaultValue: 'Last name' })}
                  value={profile.lastName}
                  onChange={(v) => setProfile((p) => ({ ...p, lastName: v }))}
                />
                <Field
                  label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                  value={profile.email}
                  onChange={(v) => setProfile((p) => ({ ...p, email: v }))}
                  type="email"
                />
                <Field
                  label={t('form.phone', {}, { defaultValue: 'Phone' })}
                  value={profile.phone}
                  onChange={(v) => setProfile((p) => ({ ...p, phone: v }))}
                  type="tel"
                />
              </div>
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
                <button
                  type="button"
                  onClick={saveProfile}
                  disabled={profileSaving}
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2),
                    cm.fontWeight('bold'),
                    'rounded-full bg-primary text-on-primary disabled:opacity-50',
                  )}
                >
                  {profileSaving
                    ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                    : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
                </button>
                {profileSaved && (
                  <span className={cm.cn(cm.textSize('sm'), 'text-emerald-600')}>
                    {t('common.saved', {}, { defaultValue: 'Saved' })}
                  </span>
                )}
                {profileError && (
                  <span className={cm.cn(cm.textSize('sm'), 'text-error')}>{profileError}</span>
                )}
              </div>
            </section>
          )}

          {section === 'verifications' && (
            <section className={'space-y-3'}>
              <h2
                className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}
                style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
              >
                {t('settings.verifications.heading', {}, { defaultValue: 'Verifications' })}
              </h2>
              {verifications.map((v) => (
                <div
                  key={v.id}
                  className={cm.cn(
                    cm.sp('p', 5),
                    cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
                    'bg-surface rounded-2xl shadow-sm',
                  )}
                >
                  <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                    <span
                      className={cm.cn(
                        'material-symbols-outlined',
                        v.status === 'verified' ? 'text-emerald-600' : 'text-amber-600',
                      )}
                      aria-hidden="true"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {v.status === 'verified' ? 'verified' : 'pending'}
                    </span>
                    <div>
                      <p className={cm.fontWeight('semibold')}>{v.label}</p>
                      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {v.detail || '—'}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'uppercase tracking-widest rounded-full',
                      v.status === 'verified'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
                    )}
                  >
                    {v.status}
                  </span>
                </div>
              ))}
            </section>
          )}

          {section === 'payments' && (
            <section className={'space-y-3'}>
              <h2
                className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}
                style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
              >
                {t('settings.payments.heading', {}, { defaultValue: 'Payment methods' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'settings.paymentsHelp',
                  { appName: APP_NAME },
                  {
                    defaultValue:
                      '{{appName}} charges your card the moment a host confirms your booking. Manage saved cards on the Pricing page.',
                  },
                )}
              </p>
              <Link
                to="/pricing"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'inline-block rounded-full bg-primary text-on-primary',
                )}
              >
                {t('settings.openBilling', {}, { defaultValue: 'Open billing' })}
              </Link>
            </section>
          )}

          {section === 'preferences' && (
            <section
              className={cm.cn(
                cm.sp('p', 6),
                'bg-surface rounded-2xl shadow-sm border-l-4 border-accent space-y-4',
              )}
            >
              <h2
                className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}
                style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
              >
                {t('nav.preferences', {}, { defaultValue: 'Preferences' })}
              </h2>
              <Toggle
                label={t('settings.pushNotifications', {}, { defaultValue: 'Push notifications' })}
                checked={prefs.pushEnabled}
                onChange={(v) => savePrefs({ pushEnabled: v })}
              />
              <Toggle
                label={t('settings.preferences.email', {}, { defaultValue: 'Email updates' })}
                checked={prefs.emailEnabled}
                onChange={(v) => savePrefs({ emailEnabled: v })}
              />
              <Toggle
                label={t(
                  'settings.preferences.priceDrops',
                  {},
                  { defaultValue: 'Price-drop alerts on saved stays' },
                )}
                checked={prefs.priceDropAlerts}
                onChange={(v) => savePrefs({ priceDropAlerts: v })}
              />
            </section>
          )}

          {section === 'appearance' && (
            <section
              className={cm.cn(
                cm.sp('p', 6),
                'bg-surface rounded-2xl shadow-sm border-l-4 border-accent space-y-4',
              )}
            >
              <div className={cm.cn(cm.stack(1))}>
                <h2
                  className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}
                  style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
                >
                  {t('settings.appearance.title', {}, { defaultValue: 'Appearance' })}
                </h2>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    'settings.appearance.description',
                    {},
                    { defaultValue: 'Toggle between light and dark mode.' },
                  )}
                </p>
              </div>
              <ThemeToggle />
            </section>
          )}

          {section === 'language' && (
            <section
              className={cm.cn(
                cm.sp('p', 6),
                'bg-surface rounded-2xl shadow-sm border-l-4 border-primary space-y-4',
              )}
            >
              <h2
                className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}
                style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
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
          )}
        </main>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  const cm = getClassMap()
  return (
    <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
      <span
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          'uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cm.cn(
          cm.sp('px', 4),
          cm.sp('py', 3),
          cm.fontWeight('semibold'),
          'bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors',
        )}
      />
    </label>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  const cm = getClassMap()
  return (
    <label className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'cursor-pointer')}>
      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cm.cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
          checked ? 'bg-primary' : 'bg-outline-variant',
        )}
      >
        <span
          className={cm.cn(
            'inline-block h-4 w-4 rounded-full bg-on-primary transition-transform',
            checked ? 'translate-x-6' : 'translate-x-1',
          )}
        />
      </button>
    </label>
  )
}
