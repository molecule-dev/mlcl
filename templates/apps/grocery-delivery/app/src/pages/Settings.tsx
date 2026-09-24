import { useEffect, useState } from 'react'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, Switch, ThemeToggle } from '@molecule/app-ui-react'

import { unwrapSingle } from '../lib/unwrap.js'

const SECTIONS = ['profile', 'addresses', 'payments', 'preferences', 'language'] as const
type Section = (typeof SECTIONS)[number]

interface UserProfile {
  id: string
  name?: string | null
  email?: string | null
}

interface NotificationPrefs {
  push?: boolean
  email?: boolean
  substitutionDefault?: 'best_match' | 'specific_only' | 'refund'
}

function loadLocalPrefs(userId: string): NotificationPrefs {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(`bushel.prefs.${userId}`)
    return raw ? (JSON.parse(raw) as NotificationPrefs) : {}
  } catch (_error) {
    // JSON parse failure; fall back to empty prefs
    return {}
  }
}

function saveLocalPrefs(userId: string, prefs: NotificationPrefs): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(`bushel.prefs.${userId}`, JSON.stringify(prefs))
  } catch (_error) {
    // localStorage unavailable; preferences won't persist
  }
}

const SAMPLE_ADDRESSES = [
  {
    id: 'a1',
    label: 'Home',
    line1: '742 Evergreen Terrace',
    city: 'Springfield',
    zip: '54321',
    isDefault: true,
  },
  {
    id: 'a2',
    label: 'Work',
    line1: '500 Market St',
    city: 'Springfield',
    zip: '54322',
    isDefault: false,
  },
]

const SAMPLE_PAYMENTS = [
  { id: 'p1', brand: 'visa', last4: '4242', isDefault: true },
  { id: 'p2', brand: 'mastercard', last4: '5555', isDefault: false },
]

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [section, setSection] = useState<Section>('profile')

  return (
    <div
      className={cm.cn(
        cm.maxW('5xl'),
        cm.sp('px', 6),
        cm.sp('py', 8),
        cm.mxAuto,
        cm.grid({ cols: 12, gap: 'lg' }),
      )}
    >
      <aside className={'col-span-12 md:col-span-3'}>
        <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 4))}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
        <nav
          className={'space-y-1'}
          aria-label={t('nav.settingsSections', {}, { defaultValue: 'Settings sections' })}
        >
          {SECTIONS.map((s) => {
            const isActive = section === s
            return (
              <button
                key={s}
                type="button"
                data-test={`settings-section-${s}`}
                onClick={() => setSection(s)}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'block w-full text-left rounded-md',
                  isActive
                    ? 'bg-primary-container text-primary'
                    : 'text-on-surface hover:bg-surface-container',
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                {t(
                  `settings.section.${s}`,
                  {},
                  { defaultValue: s.charAt(0).toUpperCase() + s.slice(1) },
                )}
              </button>
            )
          })}
        </nav>
      </aside>

      <main className={'col-span-12 md:col-span-9'}>
        {section === 'profile' && <ProfileSection />}

        {section === 'addresses' && (
          <section className={'space-y-3'}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t('settings.addresses.heading', {}, { defaultValue: 'Saved addresses' })}
            </h2>
            {SAMPLE_ADDRESSES.map((a) => (
              <div
                key={a.id}
                className={cm.cn(
                  cm.sp('p', 4),
                  cm.flex({ align: 'center', justify: 'between' }),
                  'bg-surface rounded-xl shadow-sm',
                )}
              >
                <div>
                  <p className={cm.fontWeight('semibold')}>
                    {a.label}
                    {a.isDefault ? (
                      <span
                        className={cm.cn(
                          cm.sp('ml', 2),
                          cm.sp('px', 2),
                          cm.textSize('xs'),
                          'rounded-full bg-primary-container text-primary',
                        )}
                      >
                        {t('settings.defaultBadge', {}, { defaultValue: 'Default' })}
                      </span>
                    ) : null}
                  </p>
                  <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
                    {a.line1}, {a.city} {a.zip}
                  </p>
                </div>
              </div>
            ))}
            <p className={cm.cn(cm.textSize('xs'), cm.textMuted)}>
              {t(
                'settings.addresses.note',
                {},
                {
                  defaultValue:
                    'Address management coming soon — use checkout to confirm a delivery address per order.',
                },
              )}
            </p>
          </section>
        )}

        {section === 'payments' && (
          <section className={'space-y-3'}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t('settings.payments.heading', {}, { defaultValue: 'Payment methods' })}
            </h2>
            {SAMPLE_PAYMENTS.map((p) => (
              <div
                key={p.id}
                className={cm.cn(
                  cm.sp('p', 4),
                  cm.flex({ align: 'center', justify: 'between' }),
                  'bg-surface rounded-xl shadow-sm',
                )}
              >
                <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                  <span
                    className="material-symbols-outlined text-on-surface-variant"
                    aria-hidden="true"
                  >
                    credit_card
                  </span>
                  <p className={cm.fontWeight('medium')}>
                    {p.brand.toUpperCase()} •••• {p.last4}{' '}
                    {p.isDefault ? (
                      <span
                        className={cm.cn(
                          cm.sp('ml', 2),
                          cm.sp('px', 2),
                          cm.textSize('xs'),
                          'rounded-full bg-primary-container text-primary',
                        )}
                      >
                        {t('settings.defaultBadge', {}, { defaultValue: 'Default' })}
                      </span>
                    ) : null}
                  </p>
                </div>
              </div>
            ))}
            <p className={cm.cn(cm.textSize('xs'), cm.textMuted)}>
              {t(
                'settings.payments.note',
                {},
                {
                  defaultValue:
                    'Payment methods are managed via Stripe Checkout — visit Pricing to upgrade or change card.',
                },
              )}
            </p>
          </section>
        )}

        {section === 'preferences' && <PreferencesSection />}

        {section === 'language' && (
          <section className={cm.cn(cm.sp('p', 5), 'bg-surface rounded-xl shadow-sm space-y-4')}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t('footer.language', {}, { defaultValue: 'Language' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
              {t(
                'common.chooseTheLanguage',
                {},
                { defaultValue: 'Choose the language used throughout the app.' },
              )}
            </p>
            <LanguagePicker />
          </section>
        )}

        <section
          className={cm.cn(cm.sp('p', 8), cm.sp('mt', 6), 'bg-surface-container-low rounded-xl')}
        >
          <div className={cm.sp('mb', 6)}>
            <h3 className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}>
              {t('settings.appearance.title', {}, { defaultValue: 'Appearance' })}
            </h3>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'settings.appearance.description',
                {},
                { defaultValue: 'Toggle between light and dark mode.' },
              )}
            </p>
          </div>
          <ThemeToggle />
        </section>
      </main>
    </div>
  )
}

function ProfileSection() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user, setUser } = useAuth<UserProfile>()
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [saving, setSaving] = useState(false)
  const [info, setInfo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setName(user?.name ?? '')
    setEmail(user?.email ?? '')
  }, [user?.id, user?.name, user?.email])

  async function handleSave(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!user?.id || saving) return
    setSaving(true)
    setError(null)
    setInfo(null)
    try {
      const res = await http.patch(`/api/users/${user.id}`, { name, email })
      // The user resource returns either the raw row OR a `{ props: row }` envelope.
      const body = unwrapSingle<{ props?: UserProfile } & Partial<UserProfile>>(res) ?? {}
      const updated = (body.props ?? body) as UserProfile
      if (updated && typeof updated === 'object' && updated.id) {
        setUser?.({ ...(user as UserProfile), ...updated } as UserProfile)
      }
      setInfo(t('settings.profile.saved', {}, { defaultValue: 'Profile updated.' }))
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('common.couldNotSaveProfile', {}, { defaultValue: 'Could not save profile.' }),
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={handleSave}
      className={cm.cn(cm.sp('p', 5), 'bg-surface rounded-xl shadow-sm space-y-4')}
    >
      <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
        {t('nav.profile', {}, { defaultValue: 'Profile' })}
      </h2>
      <Field
        label={t('form.name', {}, { defaultValue: 'Name' })}
        value={name}
        onChange={setName}
        testId="settings-name-input"
      />
      <Field
        label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
        value={email}
        onChange={setEmail}
        type="email"
        testId="settings-email-input"
      />
      {error ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-error')} role="alert">
          {error}
        </p>
      ) : null}
      {info ? (
        <p
          className={cm.cn(cm.textSize('sm'), 'text-success')}
          data-test="settings-saved"
          role="status"
        >
          {info}
        </p>
      ) : null}
      <button
        type="submit"
        data-test="settings-save"
        disabled={saving || !user?.id}
        className={cm.cn(
          cm.sp('px', 4),
          cm.sp('py', 2),
          cm.fontWeight('semibold'),
          'bg-primary text-on-primary rounded-md disabled:opacity-50',
        )}
      >
        {saving
          ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
          : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
      </button>
    </form>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  testId,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  testId?: string
}) {
  const cm = getClassMap()
  return (
    <label className="block">
      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}>
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-test={testId}
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 2),
          'w-full border border-outline-variant rounded-md',
        )}
      />
    </label>
  )
}

function PreferencesSection() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<UserProfile>()

  const userId = user?.id ?? ''
  const [pushEnabled, setPushEnabled] = useState(true)
  const [emailEnabled, setEmailEnabled] = useState(true)
  const [substitutionDefault, setSubstitutionDefault] = useState<
    'best_match' | 'specific_only' | 'refund'
  >('best_match')
  const [info, setInfo] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return
    const prefs = loadLocalPrefs(userId)
    setPushEnabled(prefs.push !== false)
    setEmailEnabled(prefs.email !== false)
    setSubstitutionDefault(prefs.substitutionDefault ?? 'best_match')
  }, [userId])

  function persist(next: NotificationPrefs): void {
    if (!userId) return
    const current = loadLocalPrefs(userId)
    saveLocalPrefs(userId, { ...current, ...next })
    setInfo(t('common.savedPeriod', {}, { defaultValue: 'Saved.' }))
    setTimeout(() => setInfo(null), 1500)
  }

  function handlePushToggle(v: boolean): void {
    setPushEnabled(v)
    persist({ push: v })
  }

  function handleEmailToggle(v: boolean): void {
    setEmailEnabled(v)
    persist({ email: v })
  }

  function handleSub(v: 'best_match' | 'specific_only' | 'refund'): void {
    setSubstitutionDefault(v)
    persist({ substitutionDefault: v })
  }

  return (
    <section className={cm.cn(cm.sp('p', 5), 'bg-surface rounded-xl shadow-sm space-y-4')}>
      <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
        {t(
          'settings.preferences.heading',
          {},
          { defaultValue: 'Notification & shopping preferences' },
        )}
      </h2>

      <Switch
        label={t('settings.pushNotifications', {}, { defaultValue: 'Push notifications' })}
        checked={pushEnabled}
        onChange={(e) => handlePushToggle((e.target as HTMLInputElement).checked)}
        data-test="settings-push-toggle"
      />
      <Switch
        label={t('settings.preferences.email', {}, { defaultValue: 'Email updates' })}
        checked={emailEnabled}
        onChange={(e) => handleEmailToggle((e.target as HTMLInputElement).checked)}
        data-test="settings-email-toggle"
      />

      <label className="block">
        <span
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}
        >
          {t(
            'settings.preferences.substitutionDefault',
            {},
            { defaultValue: 'Default substitution preference' },
          )}
        </span>
        <select
          value={substitutionDefault}
          onChange={(e) => handleSub(e.target.value as 'best_match' | 'specific_only' | 'refund')}
          data-test="settings-sub-default"
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            'w-full border border-outline-variant rounded-md',
          )}
        >
          <option value="best_match">
            {t('settings.preferences.subBestMatch', {}, { defaultValue: 'Pick best match' })}
          </option>
          <option value="specific_only">
            {t('settings.preferences.subSpecificOnly', {}, { defaultValue: 'No substitutions' })}
          </option>
          <option value="refund">
            {t('settings.preferences.subRefund', {}, { defaultValue: 'Refund the item' })}
          </option>
        </select>
      </label>

      {info ? (
        <p
          className={cm.cn(cm.textSize('sm'), 'text-success')}
          data-test="settings-prefs-saved"
          role="status"
        >
          {info}
        </p>
      ) : null}
      <p className={cm.cn(cm.textSize('xs'), cm.textMuted)}>
        {t('settings.preferences.note', {}, { defaultValue: 'Saved on this device.' })}
      </p>
    </section>
  )
}
