import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, Switch, ThemeToggle } from '@molecule/app-ui-react'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Address {
  id: string
  label: string | null
  street: string
  city: string | null
  postal_code: string | null
  is_default: boolean
}

interface PaymentMethod {
  id: string
  brand: string | null
  last4: string | null
  is_default: boolean
}

interface UserProfile {
  id: string
  username: string | null
  name: string | null
  email: string | null
}

interface SettingsMe {
  id: string
  name: string | null
  email: string | null
  phone?: string
  preferences?: NotificationPreferences
}

interface NotificationPreferences {
  push: boolean
  email: boolean
  sms: boolean
}

const DEFAULT_PREFS: NotificationPreferences = { push: true, email: true, sms: false }

const SECTIONS = ['profile', 'addresses', 'payments', 'preferences', 'language'] as const
type Section = (typeof SECTIONS)[number]

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [section, setSection] = useState<Section>('profile')

  return (
    <div className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <header className={cm.sp('mb', 6)}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 2),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('settings.eyebrow', {}, { defaultValue: 'Profile & preferences' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.textMuted, cm.sp('mt', 1))}>
          {t(
            'settings.subheading',
            {},
            { defaultValue: 'Profile, addresses, payments, and notifications.' },
          )}
        </p>
      </header>
      <div className={cm.grid({ cols: 12, gap: 'lg' })}>
        <aside className={'col-span-12 md:col-span-3'}>
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
                  onClick={() => setSection(s)}
                  data-testid={`settings-tab-${s}`}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'block w-full text-left rounded-md',
                    isActive
                      ? 'bg-primary-container text-on-primary-container'
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
          {section === 'addresses' && <AddressesSection />}
          {section === 'payments' && <PaymentsSection />}
          {section === 'preferences' && <PreferencesSection />}
          {section === 'language' && <LanguageSection />}
        </main>
      </div>
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
    </div>
  )
}

function ProfileSection() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user: authUser } = useAuth<UserProfile>()
  const userId = authUser?.id
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    // Read through the app's server-side settings channel: the platform
    // user resource never returns oauthData (phone/preferences), so a
    // direct GET /api/users/:id would render empty defaults.
    http
      .get('/api/settings/me')
      .then((res) => {
        if (cancelled) return
        const me = unwrapSingle<SettingsMe>(res)
        if (me && typeof me === 'object' && 'id' in me) {
          setName(String(me.name ?? ''))
          setEmail(String(me.email ?? ''))
          setPhone(String(me.phone ?? ''))
        }
      })
      .catch(() => {
        /* leave defaults */
      })
    return () => {
      cancelled = true
    }
  }, [http, userId])

  async function handleSave(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!userId) return
    setSaving(true)
    setError(null)
    try {
      await http.patch('/api/settings/me', { name, email, phone })
      setSavedAt(Date.now())
    } catch (err) {
      setError(
        (err as Error).message ??
          t('settings.profile.saveError', {}, { defaultValue: 'Could not save profile.' }),
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={handleSave}
      data-testid="settings-profile"
      className={cm.cn(cm.sp('p', 5), 'bg-surface rounded-xl shadow-sm space-y-4')}
    >
      <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
        {t('settings.profile.heading', {}, { defaultValue: 'Profile' })}
      </h2>
      <Field
        label={t('form.name', {}, { defaultValue: 'Name' })}
        value={name}
        onChange={setName}
        name="name"
      />
      <Field
        label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
        value={email}
        onChange={setEmail}
        name="email"
        type="email"
      />
      <Field
        label={t('form.phone', {}, { defaultValue: 'Phone' })}
        value={phone}
        onChange={setPhone}
        name="phone"
        type="tel"
      />
      {error ? (
        <p data-testid="profile-error" className="text-sm text-error">
          {error}
        </p>
      ) : null}
      {savedAt ? (
        <p data-testid="profile-saved" className="text-sm text-success">
          {t('common.saved', {}, { defaultValue: 'Saved' })}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={saving}
        data-testid="profile-save"
        className={cm.cn(
          cm.sp('px', 4),
          cm.sp('py', 2),
          cm.textSize('sm'),
          cm.fontWeight('semibold'),
          'bg-primary text-on-primary rounded-full hover:bg-primary-hover disabled:opacity-50',
        )}
      >
        {saving
          ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
          : t('common.saveProfile', {}, { defaultValue: 'Save profile' })}
      </button>
    </form>
  )
}

function AddressesSection() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [addresses, setAddresses] = useState<Address[]>([])
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ label: 'Home', street: '', city: '', postal_code: '' })
  const [error, setError] = useState<string | null>(null)

  function reload(): void {
    http
      .get('/api/addresses')
      .then((res) => setAddresses(unwrapList<Address>(res)))
      .catch(() => {
        /* ignore */
      })
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleAdd(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    try {
      await http.post('/api/addresses', {
        label: draft.label || 'Address',
        street: draft.street,
        city: draft.city,
        postal_code: draft.postal_code,
        is_default: addresses.length === 0,
      })
      setAdding(false)
      setDraft({ label: 'Home', street: '', city: '', postal_code: '' })
      reload()
    } catch (err) {
      setError(
        (err as Error).message ??
          t('settings.addresses.saveError', {}, { defaultValue: 'Could not save address.' }),
      )
    }
  }

  async function setAsDefault(id: string): Promise<void> {
    try {
      await http.post(`/api/addresses/${id}/default`, {})
      reload()
    } catch (_error) {
      // best-effort — list will reflect actual state on next reload
    }
  }

  async function remove(id: string): Promise<void> {
    try {
      await http.delete(`/api/addresses/${id}`)
      reload()
    } catch (_error) {
      // best-effort — stale item will disappear on next reload
    }
  }

  return (
    <section data-testid="settings-addresses" className={'space-y-3'}>
      <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
        {t('settings.addresses.heading', {}, { defaultValue: 'Saved addresses' })}
      </h2>
      {addresses.length === 0 ? (
        <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
          {t('settings.addresses.empty', {}, { defaultValue: 'No saved addresses yet.' })}
        </p>
      ) : (
        addresses.map((a) => (
          <div
            key={a.id}
            data-testid="address-row"
            className={cm.cn(
              cm.sp('p', 4),
              cm.flex({ align: 'center', justify: 'between' }),
              'bg-surface rounded-xl shadow-sm',
            )}
          >
            <div>
              <p className={cm.cn(cm.fontWeight('semibold'))}>
                {a.label ?? t('form.address', {}, { defaultValue: 'Address' })}
                {a.is_default ? (
                  <span
                    data-testid="address-default-badge"
                    className={cm.cn(
                      cm.sp('ml', 2),
                      cm.sp('px', 2),
                      cm.textSize('xs'),
                      'rounded-full bg-primary-container text-on-primary-container',
                    )}
                  >
                    {t('settings.addresses.defaultBadge', {}, { defaultValue: 'Default' })}
                  </span>
                ) : null}
              </p>
              <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
                {a.street}
                {a.city ? `, ${a.city}` : ''}
                {a.postal_code ? ` ${a.postal_code}` : ''}
              </p>
            </div>
            <div className={cm.flex({ align: 'center', gap: 'sm' })}>
              {!a.is_default ? (
                <button
                  type="button"
                  onClick={() => setAsDefault(a.id)}
                  data-testid="address-make-default"
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'text-primary hover:underline',
                  )}
                >
                  {t('settings.addresses.makeDefault', {}, { defaultValue: 'Make default' })}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => remove(a.id)}
                data-testid="address-remove"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'text-error hover:underline',
                )}
              >
                {t('common.remove', {}, { defaultValue: 'Remove' })}
              </button>
            </div>
          </div>
        ))
      )}
      {adding ? (
        <form
          onSubmit={handleAdd}
          data-testid="address-form"
          className={cm.cn(cm.sp('p', 4), 'bg-surface rounded-xl shadow-sm space-y-2')}
        >
          <input
            type="text"
            name="label"
            placeholder={t(
              'settings.addresses.labelPlaceholder',
              {},
              { defaultValue: 'Label (Home, Work…)' },
            )}
            value={draft.label}
            onChange={(e) => setDraft({ ...draft, label: e.target.value })}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              'block w-full border border-outline-variant rounded-md',
            )}
          />
          <input
            type="text"
            name="street"
            required
            placeholder={t(
              'settings.addresses.streetPlaceholder',
              {},
              { defaultValue: 'Street address' },
            )}
            value={draft.street}
            onChange={(e) => setDraft({ ...draft, street: e.target.value })}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              'block w-full border border-outline-variant rounded-md',
            )}
          />
          <div className={cm.flex({ gap: 'sm' })}>
            <input
              type="text"
              name="city"
              placeholder={t('settings.addresses.cityPlaceholder', {}, { defaultValue: 'City' })}
              value={draft.city}
              onChange={(e) => setDraft({ ...draft, city: e.target.value })}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                'flex-1 border border-outline-variant rounded-md',
              )}
            />
            <input
              type="text"
              name="postal_code"
              placeholder={t('settings.addresses.zipPlaceholder', {}, { defaultValue: 'ZIP' })}
              value={draft.postal_code}
              onChange={(e) => setDraft({ ...draft, postal_code: e.target.value })}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                'w-32 border border-outline-variant rounded-md',
              )}
            />
          </div>
          {error ? <p className="text-sm text-error">{error}</p> : null}
          <div className={cm.flex({ gap: 'sm' })}>
            <button
              type="submit"
              data-testid="address-save"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'bg-primary text-on-primary rounded-full hover:bg-primary-hover',
              )}
            >
              {t('settings.addresses.save', {}, { defaultValue: 'Save address' })}
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'border border-outline rounded-full hover:bg-surface-container',
              )}
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          data-testid="address-add"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            'border border-outline rounded-full hover:bg-surface-container',
          )}
        >
          {t('settings.addresses.addCta', {}, { defaultValue: 'Add address' })}
        </button>
      )}
    </section>
  )
}

function PaymentsSection() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [searchParams, setSearchParams] = useSearchParams()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reload(): void {
    http
      .get('/api/payment-methods')
      .then((res) => setMethods(unwrapList<PaymentMethod>(res)))
      .catch(() => {
        /* ignore */
      })
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Stripe redirects back with `?payment_setup=success&session_id=...`. Sync.
  useEffect(() => {
    const status = searchParams.get('payment_setup')
    const sessionId = searchParams.get('session_id')
    if (status === 'success' && sessionId) {
      void (async () => {
        try {
          await http.post('/api/payment-methods/sync', { session_id: sessionId })
        } catch (_error) {
          // ignore — Stripe webhook may already have synced; list refresh below handles it
        } finally {
          searchParams.delete('payment_setup')
          searchParams.delete('session_id')
          setSearchParams(searchParams, { replace: true })
          reload()
        }
      })()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  async function startSetup(): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      const res = await http.post<{ url?: string }>('/api/payment-methods/setup-session', {})
      const url = unwrapSingle<{ url?: string }>(res.data)?.url
      if (url) {
        window.location.href = url
      } else {
        setError(t('settings.payments.setupFailed', {}, { defaultValue: 'Could not start setup.' }))
        setBusy(false)
      }
    } catch (err) {
      setError(
        (err as Error).message ??
          t('settings.payments.setupFailed', {}, { defaultValue: 'Could not start setup.' }),
      )
      setBusy(false)
    }
  }

  async function remove(id: string): Promise<void> {
    try {
      await http.delete(`/api/payment-methods/${id}`)
      reload()
    } catch (_error) {
      // best-effort — stale card will disappear on next reload
    }
  }

  return (
    <section data-testid="settings-payments" className={'space-y-3'}>
      <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
        {t('settings.payments.heading', {}, { defaultValue: 'Payment methods' })}
      </h2>
      {methods.length === 0 ? (
        <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
          {t('settings.payments.empty', {}, { defaultValue: 'No saved cards yet.' })}
        </p>
      ) : (
        methods.map((p) => (
          <div
            key={p.id}
            data-testid="payment-row"
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
              <div>
                <p className={cm.fontWeight('medium')}>
                  {(p.brand ?? 'card').toUpperCase()} {p.last4 ? `•••• ${p.last4}` : ''}
                  {p.is_default ? (
                    <span
                      className={cm.cn(
                        cm.sp('ml', 2),
                        cm.sp('px', 2),
                        cm.textSize('xs'),
                        'rounded-full bg-primary-container text-on-primary-container',
                      )}
                    >
                      {t('settings.payments.defaultBadge', {}, { defaultValue: 'Default' })}
                    </span>
                  ) : null}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => remove(p.id)}
              data-testid="payment-remove"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-error hover:underline',
              )}
            >
              {t('common.remove', {}, { defaultValue: 'Remove' })}
            </button>
          </div>
        ))
      )}
      {error ? <p className="text-sm text-error">{error}</p> : null}
      <button
        type="button"
        onClick={startSetup}
        disabled={busy}
        data-testid="payment-add"
        className={cm.cn(
          cm.sp('px', 4),
          cm.sp('py', 2),
          cm.textSize('sm'),
          cm.fontWeight('medium'),
          'border border-outline rounded-full hover:bg-surface-container disabled:opacity-50',
        )}
      >
        {busy
          ? t('settings.payments.adding', {}, { defaultValue: 'Opening Stripe…' })
          : t('settings.payments.addCta', {}, { defaultValue: 'Add payment method' })}
      </button>
    </section>
  )
}

function PreferencesSection() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user: authUser } = useAuth<UserProfile>()
  const userId = authUser?.id
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFS)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    // Server-side settings channel — see ProfileSection. oauthData is not
    // readable through the platform user resource.
    http
      .get('/api/settings/me')
      .then((res) => {
        if (cancelled) return
        const me = unwrapSingle<SettingsMe>(res)
        const p = me?.preferences
        if (p) setPrefs({ push: !!p.push, email: !!p.email, sms: !!p.sms })
      })
      .catch(() => {
        /* ignore */
      })
    return () => {
      cancelled = true
    }
  }, [http, userId])

  async function update(next: NotificationPreferences): Promise<void> {
    if (!userId) return
    setPrefs(next)
    try {
      await http.patch('/api/settings/me', { preferences: next })
      setSavedAt(Date.now())
    } catch (_error) {
      // best-effort — preference toggles are non-critical; local state already updated
    }
  }

  return (
    <section
      data-testid="settings-preferences"
      className={cm.cn(cm.sp('p', 5), 'bg-surface rounded-xl shadow-sm space-y-4')}
    >
      <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
        {t('nav.notificationPreferences', {}, { defaultValue: 'Notification preferences' })}
      </h2>
      <Switch
        label={t('settings.pushNotifications', {}, { defaultValue: 'Push notifications' })}
        checked={prefs.push}
        onChange={(e) => update({ ...prefs, push: (e.target as HTMLInputElement).checked })}
        testId="toggle-push"
      />
      <Switch
        label={t('settings.preferences.email', {}, { defaultValue: 'Email updates' })}
        checked={prefs.email}
        onChange={(e) => update({ ...prefs, email: (e.target as HTMLInputElement).checked })}
        testId="toggle-email"
      />
      <Switch
        label={t('settings.preferences.sms', {}, { defaultValue: 'SMS alerts' })}
        checked={prefs.sms}
        onChange={(e) => update({ ...prefs, sms: (e.target as HTMLInputElement).checked })}
        testId="toggle-sms"
      />
      {savedAt ? (
        <p data-testid="preferences-saved" className="text-sm text-success">
          {t('common.saved', {}, { defaultValue: 'Saved' })}
        </p>
      ) : null}
    </section>
  )
}

function LanguageSection() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <section
      data-testid="settings-language"
      className={cm.cn(cm.sp('p', 5), 'bg-surface rounded-xl shadow-sm space-y-4')}
    >
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
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  name,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  name?: string
}) {
  const cm = getClassMap()
  return (
    <label className="block">
      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}>
        {label}
      </span>
      <input
        type={type}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 2),
          'w-full border border-outline-variant rounded-md',
        )}
      />
    </label>
  )
}
