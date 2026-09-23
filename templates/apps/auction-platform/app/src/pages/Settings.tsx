import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'

const SECTIONS = ['profile', 'payments', 'shipping', 'notifications', 'language'] as const
type Section = (typeof SECTIONS)[number]

function parseSection(hash: string): Section {
  const v = hash.replace(/^#/, '')
  return (SECTIONS as readonly string[]).includes(v) ? (v as Section) : 'profile'
}

interface MeResponse {
  id?: string
  name?: string | null
  username?: string | null
  email?: string | null
  notifyPrefs?: Record<string, boolean>
}

interface PaymentMethod {
  id: string
  kind: string
  last4: string
  exp: string
  primary: boolean
}

interface ShippingAddress {
  id: string
  label: string
  street: string
  city: string
  region: string
  postal: string
  primary: boolean
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const location = useLocation()
  const navigate = useNavigate()
  const section = parseSection(location.hash)
  const setSection = (next: Section) => {
    navigate({ pathname: '/settings', hash: `#${next}` })
  }
  const [me, setMe] = useState<MeResponse | null>(null)
  const [payments, setPayments] = useState<PaymentMethod[] | null>(null)
  const [addresses, setAddresses] = useState<ShippingAddress[] | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileStatus, setProfileStatus] = useState<{
    kind: 'idle' | 'success' | 'error'
    message?: string
  }>({ kind: 'idle' })
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [notifyPrefs, setNotifyPrefs] = useState<Record<string, boolean>>({
    outbid: true,
    ending: true,
    won: true,
    new_bid: true,
    sold: true,
    watchlist: true,
    system: true,
  })
  const [notifyStatus, setNotifyStatus] = useState<{
    kind: 'idle' | 'success' | 'error'
    message?: string
  }>({ kind: 'idle' })

  useEffect(() => {
    let cancelled = false
    setMe(null)
    setProfileError(null)
    http
      .get<MeResponse>('/api/me')
      .then((res) => {
        if (cancelled) return
        const body = res.data ?? {}
        setMe(body)
        setName(body.name ?? '')
        setUsername(body.username ?? '')
        setEmail(body.email ?? '')
        if (body.notifyPrefs && Object.keys(body.notifyPrefs).length > 0) {
          setNotifyPrefs((prev) => ({ ...prev, ...body.notifyPrefs }))
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setProfileError(
          e instanceof Error
            ? e.message
            : t('nav.couldNotLoadProfile', {}, { defaultValue: 'Could not load profile.' }),
        )
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  useEffect(() => {
    if (section !== 'payments' || payments !== null) return
    setPayments([])
  }, [section, payments])

  useEffect(() => {
    if (section !== 'shipping' || addresses !== null) return
    setAddresses([])
  }, [section, addresses])

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    setProfileStatus({ kind: 'idle' })
    const payload: Record<string, string> = {}
    if (name) payload.name = name
    if (username) payload.username = username
    if (email) payload.email = email
    http
      .patch('/api/me', payload)
      .then(() => {
        setMe((prev) => ({ ...(prev ?? {}), name, username, email }))
        setProfileStatus({
          kind: 'success',
          message: t('common.profileSavedPeriod', {}, { defaultValue: 'Profile saved.' }),
        })
      })
      .catch((err: unknown) => {
        setProfileStatus({
          kind: 'error',
          message:
            err instanceof Error
              ? err.message
              : t('common.couldNotSaveProfile', {}, { defaultValue: 'Could not save profile.' }),
        })
      })
      .finally(() => setSaving(false))
  }

  const toggleNotify = (key: string) => {
    const next = { ...notifyPrefs, [key]: !notifyPrefs[key] }
    setNotifyPrefs(next)
    setNotifyStatus({ kind: 'idle' })
    http
      .patch('/api/me', { notifyPrefs: next })
      .then(() => {
        setNotifyStatus({
          kind: 'success',
          message: t('settings.notifySaved', {}, { defaultValue: 'Preferences saved.' }),
        })
      })
      .catch((err: unknown) => {
        setNotifyPrefs((prev) => ({ ...prev, [key]: !prev[key] }))
        setNotifyStatus({
          kind: 'error',
          message:
            err instanceof Error
              ? err.message
              : t('settings.notifyError', {}, { defaultValue: 'Could not save preference.' }),
        })
      })
  }

  return (
    <div
      id="top"
      className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, cm.stack(8))}
    >
      <header className={cm.stack(2)}>
        <p className={cm.cn('text-xs font-black uppercase tracking-widest text-primary')}>
          {t('settings.account', {}, { defaultValue: 'Account' })}
        </p>
        <h1 className={cm.cn('text-4xl font-extrabold tracking-tight')}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
      </header>

      <nav
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          // The 4 section tabs overflow a 390px row — scroll horizontally
          // instead of clipping the last tab.
          'border-b border-outline-variant/40 overflow-x-auto',
        )}
        aria-label={t('nav.settingsSections', {}, { defaultValue: 'Settings sections' })}
      >
        {SECTIONS.map((s) => {
          const active = s === section
          const label = t(
            `settings.section.${s}`,
            {},
            { defaultValue: s.charAt(0).toUpperCase() + s.slice(1) },
          )
          if (active) {
            return (
              <span
                key={s}
                aria-current="true"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'shrink-0 whitespace-nowrap text-sm font-bold tracking-tight border-b-2 text-primary',
                )}
                style={{ borderBottomColor: 'var(--mol-color-primary)' }}
              >
                {label}
              </span>
            )
          }
          return (
            <button
              key={s}
              type="button"
              onClick={() => setSection(s)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                'shrink-0 whitespace-nowrap text-sm font-bold tracking-tight border-b-2 transition-colors',
                'text-on-surface-variant border-transparent hover:text-on-surface',
              )}
            >
              {label}
            </button>
          )
        })}
      </nav>

      {section === 'profile' ? (
        <form
          onSubmit={handleSaveProfile}
          className={cm.cn(
            cm.sp('p', 6),
            cm.stack(5),
            'rounded-xl bg-surface border border-outline-variant/40',
          )}
        >
          <h2 className={cm.cn('text-lg font-extrabold tracking-tight')}>
            {t('settings.profileHeading', {}, { defaultValue: 'Profile' })}
          </h2>
          {me === null && !profileError ? (
            <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
              {t('nav.loadingProfile', {}, { defaultValue: 'Loading profile…' })}
            </p>
          ) : profileError ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{profileError}</p>
          ) : (
            <>
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'w-16 h-16 rounded-full text-white font-extrabold text-xl',
                  )}
                  style={{
                    background:
                      'linear-gradient(135deg, var(--mol-color-primary), var(--color-primary-gradient-end))',
                  }}
                >
                  {(name || username || email || '?').charAt(0).toUpperCase()}
                </div>
                <Link
                  to="/sell/new"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    'rounded-full text-sm font-semibold border border-outline-variant hover:bg-surface-container-low',
                  )}
                >
                  {t('settings.startSelling', {}, { defaultValue: 'Start a listing →' })}
                </Link>
              </div>
              <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-2')}>
                <label className={cm.stack(2)}>
                  <span
                    className={cm.cn(
                      'text-xs font-bold uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('form.displayName', {}, { defaultValue: 'Display name' })}
                  </span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'rounded-lg border border-outline-variant focus:outline-none focus:border-primary',
                    )}
                  />
                </label>
                <label className={cm.stack(2)}>
                  <span
                    className={cm.cn(
                      'text-xs font-bold uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('settings.fieldHandle', {}, { defaultValue: 'Bidder handle' })}
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'rounded-lg border border-outline-variant focus:outline-none focus:border-primary',
                    )}
                  />
                </label>
                <label className={cm.cn(cm.stack(2), 'sm:col-span-2')}>
                  <span
                    className={cm.cn(
                      'text-xs font-bold uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'rounded-lg border border-outline-variant focus:outline-none focus:border-primary',
                    )}
                  />
                </label>
              </div>
              {profileStatus.message ? (
                <p
                  role="status"
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'rounded-lg text-xs font-semibold',
                    profileStatus.kind === 'success'
                      ? 'text-success bg-success/10'
                      : 'text-error bg-error/10',
                  )}
                >
                  {profileStatus.message}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={saving}
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  'rounded-full self-start text-sm font-bold text-white disabled:opacity-60',
                )}
                style={{
                  background:
                    'linear-gradient(135deg, var(--mol-color-primary), var(--color-primary-gradient-end))',
                }}
              >
                {saving
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                  : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
              </button>
            </>
          )}
        </form>
      ) : null}

      {section === 'payments' ? (
        <section
          className={cm.cn(
            cm.sp('p', 6),
            cm.stack(4),
            'rounded-xl bg-surface border border-outline-variant/40',
          )}
        >
          <header className={cm.flex({ align: 'center', justify: 'between' })}>
            <h2 className={cm.cn('text-lg font-extrabold tracking-tight')}>
              {t('settings.paymentsHeading', {}, { defaultValue: 'Payment methods' })}
            </h2>
            <Link
              to="/pricing"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                'rounded-full text-sm font-semibold border border-outline-variant hover:bg-surface-container-low',
              )}
            >
              {t('settings.addCard', {}, { defaultValue: 'Manage billing →' })}
            </Link>
          </header>
          {payments === null ? (
            <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
              {t('settings.paymentsLoading', {}, { defaultValue: 'Loading payment methods…' })}
            </p>
          ) : payments.length === 0 ? (
            <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
              {t(
                'settings.paymentsEmpty',
                { appName: APP_NAME },
                {
                  defaultValue:
                    'Card details are entered directly on Stripe at checkout — {{appName}} does not store cards in-app. Manage saved cards from your Stripe customer portal via the link above.',
                },
              )}
            </p>
          ) : (
            <ul className={cm.cn('space-y-3')}>
              {payments.map((p) => (
                <li
                  key={p.id}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('p', 4),
                    'rounded-xl border border-outline-variant/40 bg-surface-container-low',
                  )}
                >
                  <div className={cm.flex({ align: 'center', gap: 'md' })}>
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        'w-10 h-10 rounded-md text-white font-bold text-xs uppercase',
                      )}
                      style={{ background: p.kind === 'visa' ? '#1a1f71' : '#eb001b' }}
                    >
                      {p.kind}
                    </span>
                    <div>
                      <p className={cm.cn('font-bold tabular-nums')}>•••• {p.last4}</p>
                      <p className={cm.cn(cm.textSize('xs'), cm.textMuted)}>
                        {t('settings.expires', { exp: p.exp }, { defaultValue: 'Expires {{exp}}' })}
                      </p>
                    </div>
                  </div>
                  {p.primary ? (
                    <span
                      className={cm.cn(
                        'px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white',
                      )}
                      style={{ background: 'var(--color-accent)' }}
                    >
                      {t('settings.primary', {}, { defaultValue: 'Primary' })}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {section === 'shipping' ? (
        <section
          className={cm.cn(
            cm.sp('p', 6),
            cm.stack(4),
            'rounded-xl bg-surface border border-outline-variant/40',
          )}
        >
          <header className={cm.flex({ align: 'center', justify: 'between' })}>
            <h2 className={cm.cn('text-lg font-extrabold tracking-tight')}>
              {t('settings.shippingHeading', {}, { defaultValue: 'Shipping addresses' })}
            </h2>
          </header>
          {addresses === null ? (
            <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
              {t('settings.shippingLoading', {}, { defaultValue: 'Loading addresses…' })}
            </p>
          ) : addresses.length === 0 ? (
            <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
              {t(
                'settings.shippingEmpty',
                {},
                {
                  defaultValue:
                    'Shipping addresses are collected on the secure Stripe checkout page when you pay for a won lot. The address you enter there is sent to your seller automatically.',
                },
              )}
            </p>
          ) : (
            <ul className={cm.cn('grid grid-cols-1 sm:grid-cols-2 gap-3')}>
              {addresses.map((a) => (
                <li
                  key={a.id}
                  className={cm.cn(
                    cm.sp('p', 4),
                    'rounded-xl border border-outline-variant/40 bg-surface-container-low stack-y space-y-1',
                  )}
                >
                  <div className={cm.flex({ align: 'center', justify: 'between' })}>
                    <span className={cm.cn('font-bold')}>{a.label}</span>
                    {a.primary ? (
                      <span
                        className={cm.cn(
                          'px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest text-white',
                        )}
                        style={{ background: 'var(--color-accent)' }}
                      >
                        {t('settings.primaryShort', {}, { defaultValue: 'Primary' })}
                      </span>
                    ) : null}
                  </div>
                  <p className={cm.cn('text-sm text-on-surface-variant')}>{a.street}</p>
                  <p className={cm.cn('text-sm text-on-surface-variant')}>
                    {a.city}, {a.region} {a.postal}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {section === 'language' ? (
        <section
          className={cm.cn(
            cm.sp('p', 6),
            cm.stack(4),
            'rounded-xl bg-surface border border-outline-variant/40',
          )}
        >
          <h2 className={cm.cn('text-lg font-extrabold tracking-tight')}>
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
      ) : null}

      {section === 'notifications' ? (
        <section
          className={cm.cn(
            cm.sp('p', 6),
            cm.stack(4),
            'rounded-xl bg-surface border border-outline-variant/40',
          )}
        >
          <h2 className={cm.cn('text-lg font-extrabold tracking-tight')}>
            {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          </h2>
          {notifyStatus.message ? (
            <p
              role="status"
              data-testid="notify-status"
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                'rounded-lg text-xs font-semibold',
                notifyStatus.kind === 'success'
                  ? 'text-success bg-success/10'
                  : 'text-error bg-error/10',
              )}
            >
              {notifyStatus.message}
            </p>
          ) : null}
          <ul className={cm.cn('divide-y divide-outline-variant/40')}>
            {(['outbid', 'ending', 'won', 'new_bid', 'sold', 'watchlist', 'system'] as const).map(
              (kind) => (
                <li
                  key={kind}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('py', 3),
                  )}
                >
                  <div>
                    <p className={cm.cn('font-semibold capitalize')}>
                      {t(`settings.notify.${kind}`, {}, { defaultValue: kind.replace('_', ' ') })}
                    </p>
                    <p className={cm.cn(cm.textSize('xs'), cm.textMuted)}>
                      {t(
                        `settings.notifyHint.${kind}`,
                        {},
                        { defaultValue: 'Push, email, and in-app alerts.' },
                      )}
                    </p>
                  </div>
                  <label className={cm.cn('inline-flex items-center cursor-pointer')}>
                    <input
                      type="checkbox"
                      checked={Boolean(notifyPrefs[kind])}
                      onChange={() => toggleNotify(kind)}
                      className={cm.cn('sr-only peer')}
                      aria-label={t(
                        `settings.notifyToggleLabel.${kind}`,
                        {},
                        { defaultValue: `Toggle ${kind} alerts` },
                      )}
                    />
                    <span
                      className={cm.cn(
                        'relative w-11 h-6 rounded-full bg-outline-variant peer-checked:bg-primary transition-colors after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5',
                      )}
                    />
                  </label>
                </li>
              ),
            )}
          </ul>
        </section>
      ) : null}
      <section className={cm.cn(cm.sp('p', 8), 'bg-surface-container-low rounded-xl')}>
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

export default Settings
