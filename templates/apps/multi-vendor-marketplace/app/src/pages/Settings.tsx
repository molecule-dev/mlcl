import { useEffect, useState } from 'react'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'

const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'shipping', label: 'Shipping' },
  { id: 'payouts', label: 'Payouts' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'language', label: 'Language' },
] as const
type Tab = (typeof TABS)[number]['id']

interface ProfileResponse {
  id: string
  email: string | null
  name: string | null
  username: string | null
  prefs?: ProfilePrefs
}

interface ProfilePrefs {
  firstName?: string
  lastName?: string
  username?: string
  avatarUrl?: string
  addresses?: ShippingAddressRow[]
  notificationPrefs?: Record<string, boolean>
  payoutAccount?: { account?: string; taxId?: string; currency?: string }
}

interface SettingsUser {
  id?: string
  email?: string
  name?: string
  username?: string
  createdAt?: string
}

interface ShippingAddressRow {
  id: string
  label: string
  street: string
  city: string
  state: string
  postal: string
  primary?: boolean
}

const NOTIFICATION_ROWS = [
  { id: 'orders', label: 'Order updates', sub: 'Status changes per vendor' },
  { id: 'reviews', label: 'Review requests', sub: 'Reminders to leave a review' },
  { id: 'promos', label: 'Vendor drops & promos', sub: 'New collections from shops you follow' },
  { id: 'payouts', label: 'Payout alerts (vendor)', sub: 'Friday payout summary email' },
] as const

const DEFAULT_PREFS: Record<string, boolean> = {
  orders: true,
  reviews: true,
  promos: false,
  payouts: true,
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<SettingsUser>()
  const http = useHttpClient()
  const [tab, setTab] = useState<Tab>('profile')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [memberSince, setMemberSince] = useState<string | null>(null)
  const [addresses, setAddresses] = useState<ShippingAddressRow[]>([])
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null)
  const [draft, setDraft] = useState<ShippingAddressRow>({
    id: '',
    label: '',
    street: '',
    city: '',
    state: '',
    postal: '',
  })
  const [prefs, setPrefs] = useState<Record<string, boolean>>(DEFAULT_PREFS)
  const [payoutAccount, setPayoutAccount] = useState<string>('')

  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    setName(user.name ?? '')
    setEmail(user.email ?? '')
    setUsername(user.username ?? '')
    if (user.createdAt) {
      setMemberSince(new Date(user.createdAt).toLocaleDateString())
    }
    http
      .get<ProfileResponse | { data?: ProfileResponse }>(`/api/profile/me`)
      .then((res) => {
        const raw = (res as { data?: unknown })?.data ?? res
        const body = (
          raw &&
          typeof raw === 'object' &&
          'data' in (raw as Record<string, unknown>) &&
          (raw as { id?: unknown }).id === undefined
            ? (raw as { data?: ProfileResponse }).data
            : (raw as ProfileResponse)
        ) as ProfileResponse | undefined
        if (cancelled || !body) return
        if (body.name) setName(body.name)
        if (body.email) setEmail(body.email)
        if (body.username) setUsername(body.username)
        const p = body.prefs ?? {}
        if (Array.isArray(p.addresses)) setAddresses(p.addresses)
        if (p.notificationPrefs) setPrefs({ ...DEFAULT_PREFS, ...p.notificationPrefs })
        if (p.payoutAccount?.account) setPayoutAccount(p.payoutAccount.account)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [user, http])

  useEffect(() => {
    if (savedAt === null) return
    const timer = setTimeout(() => setSavedAt(null), 2500)
    return () => clearTimeout(timer)
  }, [savedAt])

  async function persist() {
    if (!user?.id) return
    setSaving(true)
    setError(null)
    try {
      const prefsPayload: ProfilePrefs = {
        addresses,
        notificationPrefs: prefs,
        payoutAccount: payoutAccount ? { account: payoutAccount } : undefined,
      }
      const payload: Record<string, unknown> = { prefs: prefsPayload }
      const trimmedName = name.trim()
      if (trimmedName) payload.name = trimmedName
      const trimmedUser = username.trim()
      if (trimmedUser) payload.username = trimmedUser
      await http.patch('/api/profile/me', payload)
      setSavedAt(Date.now())
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : t('settings.saveError', {}, { defaultValue: 'Could not save changes.' })
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  function startEditAddress(addr?: ShippingAddressRow) {
    if (addr) {
      setEditingAddressId(addr.id)
      setDraft(addr)
    } else {
      const id = `addr-${Date.now()}`
      setEditingAddressId(id)
      setDraft({ id, label: '', street: '', city: '', state: '', postal: '' })
    }
  }

  function cancelEditAddress() {
    setEditingAddressId(null)
  }

  function saveAddress() {
    if (!editingAddressId) return
    setAddresses((prev) => {
      const exists = prev.find((a) => a.id === editingAddressId)
      const next = exists
        ? prev.map((a) => (a.id === editingAddressId ? draft : a))
        : [...prev, draft]
      // mark first as primary if none flagged
      if (!next.some((a) => a.primary) && next.length > 0) next[0].primary = true
      return next
    })
    setEditingAddressId(null)
    void persist()
  }

  function removeAddress(id: string) {
    setAddresses((prev) => {
      const next = prev.filter((a) => a.id !== id)
      if (!next.some((a) => a.primary) && next.length > 0) next[0].primary = true
      return next
    })
    void persist()
  }

  function togglePref(id: string, enabled: boolean) {
    setPrefs((prev) => ({ ...prev, [id]: enabled }))
    void persist()
  }

  return (
    <div
      data-testid="settings-page"
      className={cm.cn(cm.maxW('full'), cm.mxAuto, cm.sp('p', 8), 'max-w-[1100px] space-y-8')}
    >
      <div className={cm.cn(cm.stack(2))}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-orange-700 dark:text-primary',
          )}
        >
          {t('settings.account', {}, { defaultValue: 'Account' })}
        </p>
        <h1
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-4xl tracking-tight font-extrabold text-on-surface',
          )}
        >
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
        <p className={'text-on-surface-variant text-lg'}>
          {t(
            'settings.subtitle',
            {},
            { defaultValue: 'Manage how you shop, how vendors reach you, and where money goes.' },
          )}
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className={cm.cn(
            cm.textSize('sm'),
            'rounded-xl border border-error/30 bg-error/10 px-4 py-2 text-error',
          )}
        >
          {error}
        </p>
      )}
      {savedAt && (
        <p
          role="status"
          data-testid="settings-saved-flag"
          className={cm.cn(
            cm.textSize('sm'),
            'rounded-xl border border-success/30 bg-success/10 px-4 py-2 text-success',
          )}
        >
          {t('common.savedPeriod', {}, { defaultValue: 'Saved.' })}
        </p>
      )}

      <nav className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            data-testid={`settings-tab-${id}`}
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.roundedFull,
              'transition-colors',
              tab === id
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
            )}
          >
            {t(`settings.tab.${id}`, {}, { defaultValue: label })}
          </button>
        ))}
      </nav>

      {tab === 'profile' && (
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-3xl border border-outline-variant bg-surface space-y-4',
          )}
        >
          <h2 className={cm.cn(cm.fontWeight('bold'), 'text-xl text-on-surface')}>
            {t('nav.profile', {}, { defaultValue: 'Profile' })}
          </h2>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
            <img
              src={`https://picsum.photos/seed/vendry-settings-${user?.id ?? 'avatar'}/120/120`}
              alt=""
              className={'h-20 w-20 rounded-full object-cover ring-2 ring-primary/20'}
            />
            <div>
              <p className={cm.cn(cm.fontWeight('bold'), 'text-on-surface text-lg')}>
                {name || email || t('status.member', {}, { defaultValue: 'Member' })}
              </p>
              <p className={'text-on-surface-variant text-sm'}>
                {email}
                {memberSince
                  ? ` · ${t('vendor.memberSince', { date: memberSince }, { defaultValue: 'Member since {{date}}' })}`
                  : ''}
              </p>
            </div>
          </div>
          <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'md:grid-cols-2')}>
            <label className={cm.cn(cm.stack(1), cm.textSize('sm'))}>
              <span className="font-semibold text-on-surface-variant">
                {t('form.displayName', {}, { defaultValue: 'Display name' })}
              </span>
              <input
                type="text"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="settings-name"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'rounded-xl bg-surface-container-low border border-outline-variant focus:border-primary focus:outline-none transition-colors',
                )}
              />
            </label>
            <label className={cm.cn(cm.stack(1), cm.textSize('sm'))}>
              <span className="font-semibold text-on-surface-variant">
                {t('auth.username', {}, { defaultValue: 'Username' })}
              </span>
              <input
                type="text"
                name="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                data-testid="settings-username"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'rounded-xl bg-surface-container-low border border-outline-variant focus:border-primary focus:outline-none transition-colors',
                )}
              />
            </label>
            <label className={cm.cn(cm.stack(1), cm.textSize('sm'))}>
              <span className="font-semibold text-on-surface-variant">
                {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
              </span>
              <input
                type="email"
                value={email}
                disabled
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'rounded-xl bg-surface-container border border-outline-variant text-on-surface-variant cursor-not-allowed',
                )}
              />
            </label>
          </div>
          <div className={cm.cn(cm.flex({ justify: 'end' }))}>
            <button
              type="button"
              onClick={() => persist()}
              disabled={saving}
              data-testid="settings-save"
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.sp('px', 6),
                cm.sp('py', 3),
                cm.roundedFull,
                'bg-primary text-on-primary hover:bg-primary-dark transition-colors disabled:opacity-60',
              )}
            >
              {saving
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
            </button>
          </div>
        </section>
      )}

      {tab === 'shipping' && (
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-3xl border border-outline-variant bg-surface space-y-4',
          )}
        >
          <div className={cm.cn(cm.flex({ justify: 'between', align: 'center' }))}>
            <h2 className={cm.cn(cm.fontWeight('bold'), 'text-xl text-on-surface')}>
              {t('settings.shipping.title', {}, { defaultValue: 'Shipping addresses' })}
            </h2>
            <button
              type="button"
              onClick={() => startEditAddress()}
              data-testid="settings-add-address"
              className={cm.cn(
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.roundedFull,
                'border border-outline-variant text-on-surface hover:bg-surface-container-low',
              )}
            >
              {t('settings.shipping.addCta', {}, { defaultValue: 'Add address' })}
            </button>
          </div>
          {addresses.length === 0 && editingAddressId === null && (
            <p className="text-on-surface-variant text-sm" data-testid="settings-shipping-empty">
              {t(
                'settings.shipping.empty',
                {},
                { defaultValue: 'No saved addresses yet. Add one so checkout can pre-fill it.' },
              )}
            </p>
          )}
          {addresses.map((addr) => (
            <article
              key={addr.id}
              data-testid="settings-address-row"
              className={cm.cn(
                cm.flex({ justify: 'between', align: 'center', wrap: 'wrap', gap: 'md' }),
                cm.sp('p', 4),
                'rounded-2xl border border-outline-variant bg-surface-container-low',
              )}
            >
              <div>
                <p
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    cm.flex({ align: 'center', gap: 'sm' }),
                    'text-on-surface',
                  )}
                >
                  {addr.label || addr.city || t('form.address', {}, { defaultValue: 'Address' })}
                  {addr.primary && (
                    <span
                      className={cm.cn(
                        cm.fontWeight('bold'),
                        cm.textSize('xs'),
                        cm.sp('px', 2),
                        cm.sp('py', 0),
                        cm.roundedFull,
                        'uppercase tracking-widest bg-primary/15 text-orange-700 dark:text-primary',
                      )}
                    >
                      {t('settings.shipping.primary', {}, { defaultValue: 'Primary' })}
                    </span>
                  )}
                </p>
                <p className={'text-on-surface-variant text-sm'}>
                  {addr.street} · {addr.city}, {addr.state} {addr.postal}
                </p>
              </div>
              <div className={cm.cn(cm.flex({ gap: 'sm' }))}>
                <button
                  type="button"
                  onClick={() => startEditAddress(addr)}
                  className={cm.cn(
                    cm.fontWeight('semibold'),
                    cm.textSize('sm'),
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.roundedFull,
                    'border border-outline-variant text-on-surface hover:bg-surface-container transition-colors',
                  )}
                >
                  {t('common.edit', {}, { defaultValue: 'Edit' })}
                </button>
                <button
                  type="button"
                  onClick={() => removeAddress(addr.id)}
                  className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant hover:text-error')}
                >
                  {t('common.remove', {}, { defaultValue: 'Remove' })}
                </button>
              </div>
            </article>
          ))}
          {editingAddressId !== null && (
            <article
              data-testid="settings-address-editor"
              className={cm.cn(
                cm.sp('p', 4),
                'rounded-2xl border border-primary bg-primary/5 space-y-3',
              )}
            >
              <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'md:grid-cols-2')}>
                {[
                  { id: 'label', label: 'Label', placeholder: 'Home' },
                  { id: 'street', label: 'Street', placeholder: '221B Rua das Janelas Verdes' },
                  { id: 'city', label: 'City', placeholder: 'Lisbon' },
                  { id: 'state', label: 'State / Region', placeholder: 'Lisboa' },
                  { id: 'postal', label: 'Postal code', placeholder: '1200-690' },
                ].map((field) => (
                  <label key={field.id} className={cm.cn(cm.stack(1), cm.textSize('sm'))}>
                    <span className="font-semibold text-on-surface-variant">
                      {t(`settings.shipping.field.${field.id}`, {}, { defaultValue: field.label })}
                    </span>
                    <input
                      type="text"
                      name={field.id}
                      value={(draft as unknown as Record<string, string>)[field.id] || ''}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, [field.id]: e.target.value }))
                      }
                      placeholder={field.placeholder}
                      data-testid={`settings-address-${field.id}`}
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        'rounded-xl bg-surface border border-outline-variant focus:border-primary focus:outline-none transition-colors',
                      )}
                    />
                  </label>
                ))}
              </div>
              <div className={cm.cn(cm.flex({ justify: 'end', gap: 'sm' }))}>
                <button
                  type="button"
                  onClick={cancelEditAddress}
                  className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant hover:text-error')}
                >
                  {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                </button>
                <button
                  type="button"
                  onClick={saveAddress}
                  data-testid="settings-address-save"
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.roundedFull,
                    'bg-primary text-on-primary hover:bg-primary-dark transition-colors',
                  )}
                >
                  {t('settings.shipping.save', {}, { defaultValue: 'Save address' })}
                </button>
              </div>
            </article>
          )}
        </section>
      )}

      {tab === 'payouts' && (
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-3xl border border-outline-variant bg-surface space-y-4',
          )}
        >
          <h2 className={cm.cn(cm.fontWeight('bold'), 'text-xl text-on-surface')}>
            {t('settings.payouts.title', {}, { defaultValue: 'Payout method' })}
          </h2>
          <p className={'text-on-surface-variant text-sm'}>
            {t(
              'settings.payouts.body',
              { appName: APP_NAME },
              {
                defaultValue:
                  '{{appName}} pays out every Friday in your local currency, minus the 8% commission.',
              },
            )}
          </p>
          <label className={cm.cn(cm.stack(1), cm.textSize('sm'))}>
            <span className="font-semibold text-on-surface-variant">
              {t('settings.payouts.accountLabel', {}, { defaultValue: 'Account number / IBAN' })}
            </span>
            <input
              type="text"
              value={payoutAccount}
              onChange={(e) => setPayoutAccount(e.target.value)}
              placeholder="GB29 NWBK 6016 1331 9268 19"
              data-testid="settings-payout-account"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                'rounded-xl bg-surface-container-low border border-outline-variant focus:border-primary focus:outline-none transition-colors',
              )}
            />
          </label>
          <div className={cm.cn(cm.flex({ justify: 'end' }))}>
            <button
              type="button"
              onClick={() => persist()}
              disabled={saving}
              data-testid="settings-payout-save"
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.sp('px', 6),
                cm.sp('py', 3),
                cm.roundedFull,
                'bg-primary text-on-primary hover:bg-primary-dark transition-colors disabled:opacity-60',
              )}
            >
              {t('settings.payouts.save', {}, { defaultValue: 'Save payout details' })}
            </button>
          </div>
        </section>
      )}

      {tab === 'language' && (
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-3xl border border-outline-variant bg-surface space-y-4',
          )}
        >
          <h2 className={cm.cn(cm.fontWeight('bold'), 'text-xl text-on-surface')}>
            {t('footer.language', {}, { defaultValue: 'Language' })}
          </h2>
          <p className={'text-on-surface-variant text-sm'}>
            {t(
              'settings.language.description',
              {},
              { defaultValue: 'Choose the language used throughout the marketplace.' },
            )}
          </p>
          <LanguagePicker />
        </section>
      )}

      {tab === 'notifications' && (
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-3xl border border-outline-variant bg-surface space-y-4',
          )}
        >
          <h2 className={cm.cn(cm.fontWeight('bold'), 'text-xl text-on-surface')}>
            {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          </h2>
          {NOTIFICATION_ROWS.map((row) => (
            <label
              key={row.id}
              className={cm.cn(
                cm.flex({ justify: 'between', align: 'center', gap: 'md' }),
                cm.sp('p', 4),
                'rounded-2xl border border-outline-variant bg-surface-container-low',
              )}
            >
              <div>
                <p className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}>
                  {t(`settings.notifRow.${row.id}.label`, {}, { defaultValue: row.label })}
                </p>
                <p className={'text-on-surface-variant text-sm'}>
                  {t(`settings.notifRow.${row.id}.sub`, {}, { defaultValue: row.sub })}
                </p>
              </div>
              <input
                type="checkbox"
                data-testid={`settings-pref-${row.id}`}
                checked={!!prefs[row.id]}
                onChange={(e) => togglePref(row.id, e.target.checked)}
                className={'h-5 w-5 accent-primary'}
              />
            </label>
          ))}
        </section>
      )}

      <section
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-3xl border border-outline-variant bg-surface space-y-4',
        )}
      >
        <div>
          <h2 className={cm.cn(cm.fontWeight('bold'), 'text-xl text-on-surface')}>
            {t('settings.appearance.title', {}, { defaultValue: 'Appearance' })}
          </h2>
          <p className={'text-on-surface-variant text-sm'}>
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

export default Settings
