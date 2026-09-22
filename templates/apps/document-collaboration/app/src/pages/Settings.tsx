import { useEffect, useState } from 'react'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface ToggleSetting {
  key: string
  defaultLabel: string
  defaultDescription: string
  defaultValue: boolean
}

const NOTIFICATIONS: ToggleSetting[] = [
  {
    key: 'comments',
    defaultLabel: 'Comments and replies',
    defaultDescription: 'Email me when a thread is opened or replied to on a document I authored.',
    defaultValue: true,
  },
  {
    key: 'mentions',
    defaultLabel: 'Mentions',
    defaultDescription: "Always email me when I'm @mentioned, even outside studio hours.",
    defaultValue: true,
  },
  {
    key: 'sharing',
    defaultLabel: 'New shares',
    defaultDescription: 'Tell me when a teammate shares a manuscript with me.',
    defaultValue: true,
  },
  {
    key: 'suggestions',
    defaultLabel: 'Suggestion requests',
    defaultDescription: 'Notify me when an editor asks for my input on a passage.',
    defaultValue: false,
  },
  {
    key: 'digest',
    defaultLabel: 'Weekly studio digest',
    defaultDescription: 'A Monday-morning summary of what moved last week.',
    defaultValue: true,
  },
]

const EDITOR: ToggleSetting[] = [
  {
    key: 'serif',
    defaultLabel: 'Serif body',
    defaultDescription: 'Render the editor canvas in Charter for long-form readability.',
    defaultValue: true,
  },
  {
    key: 'spellcheck',
    defaultLabel: 'Spell check',
    defaultDescription: 'Highlight likely typos with a soft underline.',
    defaultValue: true,
  },
  {
    key: 'smart-quotes',
    defaultLabel: 'Smart quotes',
    defaultDescription: "Convert \" and ' to typographer's quotes as you type.",
    defaultValue: true,
  },
  {
    key: 'autosave',
    defaultLabel: 'Autosave on every keystroke',
    defaultDescription: 'Save constantly. Disable for offline-first drafting.',
    defaultValue: true,
  },
  {
    key: 'focus-mode',
    defaultLabel: 'Focus mode by default',
    defaultDescription: 'Dim chrome when you start typing in the editor.',
    defaultValue: false,
  },
]

interface ProfileResponse {
  email: string | null
  display_name: string
  notification_prefs: Record<string, boolean>
  editor_prefs: Record<string, boolean>
}

interface BillingTierPrice {
  period: 'month' | 'year'
  price: string
  stripePriceId: string | null
}

interface BillingTier {
  key: string
  name: string
  prices: BillingTierPrice[]
}

interface BillingStatus {
  planKey: string
  category: string
  name: string
  isFree: boolean
}

const defaultsFor = (specs: ToggleSetting[]): Record<string, boolean> =>
  Object.fromEntries(specs.map((s) => [s.key, s.defaultValue]))

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  const [email, setEmail] = useState<string>('')
  const [notifications, setNotifications] = useState<Record<string, boolean>>(
    defaultsFor(NOTIFICATIONS),
  )
  const [editor, setEditor] = useState<Record<string, boolean>>(defaultsFor(EDITOR))

  const [tiers, setTiers] = useState<BillingTier[]>([])
  const [status, setStatus] = useState<BillingStatus | null>(null)
  const [billingBusy, setBillingBusy] = useState(false)
  const [billingMsg, setBillingMsg] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get('/api/profile/me').catch(() => null),
      http.get('/api/billing/tiers').catch(() => null),
      http.get('/api/billing/status').catch(() => null),
    ]).then(([profileRes, tiersRes, statusRes]) => {
      if (cancelled) return
      const profile = unwrapSingle<ProfileResponse>(profileRes)
      if (profile) {
        setEmail(profile.email ?? '')
        setNotifications({ ...defaultsFor(NOTIFICATIONS), ...(profile.notification_prefs ?? {}) })
        setEditor({ ...defaultsFor(EDITOR), ...(profile.editor_prefs ?? {}) })
      }
      const tierList = unwrapList<BillingTier>(tiersRes)
      setTiers(tierList)
      const billingStatus = unwrapSingle<BillingStatus>(statusRes)
      setStatus(billingStatus)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [http])

  const persistNotifications = async (next: Record<string, boolean>): Promise<void> => {
    setSaving('notifications')
    setError(null)
    try {
      await http.patch('/api/profile/me', { notification_prefs: next })
      setSavedAt(Date.now())
    } catch (error) {
      logError('settings.persistNotifications', error)
      setError(t('common.saveFailed', {}, { defaultValue: 'Save failed.' }))
    } finally {
      setSaving(null)
    }
  }

  const persistEditor = async (next: Record<string, boolean>): Promise<void> => {
    setSaving('editor')
    setError(null)
    try {
      await http.patch('/api/profile/me', { editor_prefs: next })
      setSavedAt(Date.now())
    } catch (error) {
      logError('settings.persistEditor', error)
      setError(t('common.saveFailed', {}, { defaultValue: 'Save failed.' }))
    } finally {
      setSaving(null)
    }
  }

  const onNotificationToggle = (key: string, value: boolean): void => {
    setNotifications((prev) => {
      const next = { ...prev, [key]: value }
      void persistNotifications(next)
      return next
    })
  }

  const onEditorToggle = (key: string, value: boolean): void => {
    setEditor((prev) => {
      const next = { ...prev, [key]: value }
      void persistEditor(next)
      return next
    })
  }

  const upgrade = async (priceId: string): Promise<void> => {
    setBillingBusy(true)
    setBillingMsg(null)
    try {
      const res = (await http.post('/api/billing/checkout', { priceId })) as {
        checkoutUrl?: string
        updated?: boolean
        data?: unknown
      }
      const payload = (res?.data ?? res) as { checkoutUrl?: string; updated?: boolean }
      if (payload.checkoutUrl) {
        window.location.href = payload.checkoutUrl
      } else if (payload.updated) {
        const refreshed = await http.get('/api/billing/status')
        setStatus(unwrapSingle<BillingStatus>(refreshed))
        setBillingMsg(t('settings.billing.updated', {}, { defaultValue: 'Plan updated.' }))
      } else {
        setBillingMsg(
          t('nav.couldNotStartCheckout', {}, { defaultValue: 'Could not start checkout.' }),
        )
      }
    } catch (error) {
      logError('settings.upgrade', error)
      setBillingMsg(
        t('nav.couldNotStartCheckout', {}, { defaultValue: 'Could not start checkout.' }),
      )
    } finally {
      setBillingBusy(false)
    }
  }

  const cancelPlan = async (): Promise<void> => {
    setBillingBusy(true)
    setBillingMsg(null)
    try {
      await http.post('/api/billing/cancel', {})
      const refreshed = await http.get('/api/billing/status')
      setStatus(unwrapSingle<BillingStatus>(refreshed))
      setBillingMsg(t('settings.billing.canceled', {}, { defaultValue: 'Subscription canceled.' }))
    } catch (error) {
      logError('settings.cancelPlan', error)
      setBillingMsg(t('settings.billing.cancelFailed', {}, { defaultValue: 'Could not cancel.' }))
    } finally {
      setBillingBusy(false)
    }
  }

  return (
    <div
      className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'mx-auto w-full max-w-3xl space-y-8')}
      data-testid="settings-root"
    >
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('extrabold'),
            'uppercase tracking-widest text-secondary',
          )}
        >
          {t('settings.eyebrow', {}, { defaultValue: 'Studio preferences' })}
        </p>
        <h1
          className={cm.cn(
            cm.sp('mt', 1),
            cm.textSize('3xl'),
            cm.fontWeight('extrabold'),
            'tracking-tight',
          )}
        >
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
        <p className={cm.cn(cm.sp('mt', 1), cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'settings.subtitle',
            {},
            {
              defaultValue: 'Tune notifications, the editor canvas, and your account preferences.',
            },
          )}
        </p>
        {savedAt ? (
          <p
            className={cm.cn(cm.sp('mt', 2), cm.textSize('xs'), 'text-success')}
            data-testid="settings-saved-indicator"
          >
            {t('common.savedPeriod', {}, { defaultValue: 'Saved.' })}
          </p>
        ) : null}
        {error ? (
          <p className={cm.cn(cm.sp('mt', 2), cm.textSize('xs'), 'text-error')}>{error}</p>
        ) : null}
      </header>

      <SettingsSection
        title={t('settings.account', {}, { defaultValue: 'Account' })}
        description={t('settings.account.description', {}, { defaultValue: 'How you sign in.' })}
      >
        <FieldRow
          label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          value={loading ? '…' : email || '—'}
          testId="settings-email"
        />
      </SettingsSection>

      <SettingsSection
        title={t('nav.planAndBilling', {}, { defaultValue: 'Plan & billing' })}
        description={t(
          'settings.billing.description',
          {},
          { defaultValue: 'Upgrade, downgrade, or cancel your subscription.' },
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
            cm.sp('py', 3),
          )}
        >
          <div>
            <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('extrabold'), 'text-on-surface')}>
              {t('nav.currentPlan', {}, { defaultValue: 'Current plan' })}
            </p>
            <p
              className={cm.cn(cm.sp('mt', 1), cm.textSize('sm'), 'text-on-surface-variant')}
              data-testid="settings-current-plan"
            >
              {status?.name ?? '—'}
              {status ? ` · ${status.category}` : ''}
            </p>
          </div>
          {status && !status.isFree ? (
            <button
              type="button"
              onClick={cancelPlan}
              disabled={billingBusy}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('xs'),
                cm.fontWeight('extrabold'),
                'rounded-full border border-outline text-on-surface hover:bg-surface-container disabled:opacity-50',
              )}
              data-testid="settings-cancel-plan"
            >
              {t('nav.cancelSubscription', {}, { defaultValue: 'Cancel subscription' })}
            </button>
          ) : null}
        </div>

        {tiers.length > 0 ? (
          <div className={cm.cn(cm.sp('mt', 2), 'grid grid-cols-1 gap-3 sm:grid-cols-3')}>
            {tiers.map((tier) => (
              <div
                key={tier.key}
                className={cm.cn(
                  cm.sp('p', 4),
                  'rounded-xl border border-outline-variant bg-surface-container-lowest',
                )}
                data-testid={`settings-tier-${tier.key}`}
              >
                <p className={cm.cn(cm.fontWeight('extrabold'), cm.textSize('sm'))}>{tier.name}</p>
                <ul className={cm.cn(cm.sp('mt', 2), 'space-y-1 text-xs text-on-surface-variant')}>
                  {tier.prices.map((p) => (
                    <li key={`${tier.key}-${p.period}`}>
                      <div className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
                        <span>{p.price}</span>
                        {p.stripePriceId ? (
                          <button
                            type="button"
                            onClick={() => upgrade(p.stripePriceId!)}
                            disabled={billingBusy}
                            className={cm.cn(
                              cm.sp('px', 3),
                              cm.textSize('xs'),
                              cm.fontWeight('extrabold'),
                              'inline-flex min-h-[28px] items-center rounded-full bg-primary text-white hover:-translate-y-0.5 disabled:opacity-50',
                            )}
                            data-testid={`settings-upgrade-${tier.key}-${p.period}`}
                          >
                            {t('settings.billing.choose', {}, { defaultValue: 'Choose' })}
                          </button>
                        ) : (
                          <span
                            className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant italic')}
                          >
                            {t(
                              'settings.billing.unconfigured',
                              {},
                              { defaultValue: 'Not configured' },
                            )}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : null}
        {billingMsg ? (
          <p
            className={cm.cn(cm.sp('mt', 3), cm.textSize('xs'), 'text-on-surface-variant')}
            data-testid="settings-billing-message"
          >
            {billingMsg}
          </p>
        ) : null}
      </SettingsSection>

      <SettingsSection
        title={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
        description={t(
          'settings.notifications.description',
          {},
          { defaultValue: 'Choose what reaches your inbox.' },
        )}
      >
        {NOTIFICATIONS.map((n) => (
          <ToggleRow
            key={n.key}
            testId={`settings-notif-${n.key}`}
            label={t(`settings.notifications.${n.key}.label`, {}, { defaultValue: n.defaultLabel })}
            description={t(
              `settings.notifications.${n.key}.description`,
              {},
              { defaultValue: n.defaultDescription },
            )}
            value={notifications[n.key] ?? n.defaultValue}
            disabled={saving !== null}
            onChange={(v) => onNotificationToggle(n.key, v)}
          />
        ))}
      </SettingsSection>

      <SettingsSection
        title={t('settings.language.title', {}, { defaultValue: 'Language' })}
        description={t(
          'common.chooseTheLanguage',
          {},
          { defaultValue: 'Choose the language used throughout the app.' },
        )}
      >
        <div className={cm.sp('py', 3)}>
          <LanguagePicker />
        </div>
      </SettingsSection>

      <SettingsSection
        title={t('nav.appearance', {}, { defaultValue: 'Appearance' })}
        description={t(
          'common.toggleLightDark',
          {},
          { defaultValue: 'Toggle between light and dark mode.' },
        )}
      >
        <div className={cm.sp('py', 3)}>
          <ThemeToggle />
        </div>
      </SettingsSection>

      <SettingsSection
        title={t('settings.editor.title', {}, { defaultValue: 'Editor preferences' })}
        description={t(
          'settings.editor.description',
          {},
          { defaultValue: 'How the canvas behaves while you write.' },
        )}
      >
        {EDITOR.map((n) => (
          <ToggleRow
            key={n.key}
            testId={`settings-editor-${n.key}`}
            label={t(`settings.editor.${n.key}.label`, {}, { defaultValue: n.defaultLabel })}
            description={t(
              `settings.editor.${n.key}.description`,
              {},
              { defaultValue: n.defaultDescription },
            )}
            value={editor[n.key] ?? n.defaultValue}
            disabled={saving !== null}
            onChange={(v) => onEditorToggle(n.key, v)}
          />
        ))}
      </SettingsSection>
    </div>
  )
}

interface SectionProps {
  title: string
  description: string
  children: React.ReactNode
}

function SettingsSection({ title, description, children }: SectionProps) {
  const cm = getClassMap()
  return (
    <section
      className={cm.cn(
        cm.sp('p', 6),
        'rounded-2xl bg-surface-container-lowest ring-1 ring-outline-variant',
      )}
    >
      <header className={cm.cn(cm.sp('pb', 4), 'border-b border-outline-variant')}>
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('extrabold'))}>{title}</h2>
        <p className={cm.cn(cm.sp('mt', 1), cm.textSize('sm'), 'text-on-surface-variant')}>
          {description}
        </p>
      </header>
      <div className={cm.cn(cm.sp('mt', 4), 'space-y-1')}>{children}</div>
    </section>
  )
}

function FieldRow({ label, value, testId }: { label: string; value: string; testId?: string }) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'md' }), cm.sp('py', 3))}
    >
      <div className={cm.cn('min-w-0 flex-1')}>
        <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('extrabold'), 'text-on-surface')}>
          {label}
        </p>
        <p
          className={cm.cn(cm.sp('mt', 1), cm.textSize('sm'), 'truncate text-on-surface-variant')}
          data-testid={testId}
        >
          {value}
        </p>
      </div>
    </div>
  )
}

function ToggleRow({
  label,
  description,
  value,
  onChange,
  disabled,
  testId,
}: {
  label: string
  description: string
  value: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  testId?: string
}) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(cm.flex({ align: 'start', justify: 'between', gap: 'md' }), cm.sp('py', 3))}
    >
      <div className={cm.cn('min-w-0 flex-1')}>
        <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('extrabold'), 'text-on-surface')}>
          {label}
        </p>
        <p className={cm.cn(cm.sp('mt', 1), cm.textSize('sm'), 'text-on-surface-variant')}>
          {description}
        </p>
      </div>
      {/* The button pads the 24px track out to a >=40px tap target without
          visually enlarging the switch itself. */}
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={label}
        onClick={() => onChange(!value)}
        disabled={disabled}
        data-testid={testId}
        className={cm.cn('inline-flex h-10 shrink-0 items-center px-1 disabled:opacity-50')}
      >
        <span
          className={cm.cn(
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
            value ? 'bg-primary' : 'bg-surface-container-high',
          )}
        >
          <span
            className={cm.cn(
              'inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform',
              value ? 'translate-x-5' : 'translate-x-1',
            )}
            aria-hidden="true"
          />
        </span>
      </button>
    </div>
  )
}

export default Settings
