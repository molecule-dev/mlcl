import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { NotificationsSection } from '@molecule/app-settings-panel-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { API_BASE_URL } from '../config.js'
import { primeCurrency, primeDateFormat } from '../lib/format.js'
import { unwrapSingle } from '../lib/unwrap.js'

const SECTIONS = ['profile', 'preferences', 'billing', 'data'] as const
type Section = (typeof SECTIONS)[number]

interface ProfileResponse {
  id: string
  name: string
  email: string
  preferences?: {
    currency?: string
    dateFormat?: string
    firstDayOfWeek?: 'Sunday' | 'Monday' | 'Saturday'
    notifyBudgetOverspent?: boolean
    notifyGoalMilestones?: boolean
    notifyMonthlyReport?: boolean
  }
}

interface BillingStatus {
  planKey: string
  name: string
  isFree: boolean
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [section, setSection] = useState<Section>('profile')
  const [profile, setProfile] = useState<ProfileResponse | null>(null)
  const [billing, setBilling] = useState<BillingStatus | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [dateFormat, setDateFormat] = useState('MMM d, yyyy')
  const [firstDayOfWeek, setFirstDayOfWeek] = useState<'Sunday' | 'Monday' | 'Saturday'>('Sunday')
  const [notifyBudgetOverspent, setNotifyBudgetOverspent] = useState(true)
  const [notifyGoalMilestones, setNotifyGoalMilestones] = useState(true)
  const [notifyMonthlyReport, setNotifyMonthlyReport] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [feedbackKind, setFeedbackKind] = useState<'success' | 'error'>('success')

  useEffect(() => {
    let cancelled = false
    Promise.all([
      http.get('/api/profile/me').catch(() => null),
      http.get('/api/billing/status').catch(() => null),
    ]).then(([pRes, bRes]) => {
      if (cancelled) return
      const p = unwrapSingle<ProfileResponse>(pRes)
      const b = unwrapSingle<BillingStatus>(bRes)
      if (p) {
        setProfile(p)
        setName(p.name ?? '')
        setEmail(p.email ?? '')
        setCurrency(p.preferences?.currency ?? 'USD')
        setDateFormat(p.preferences?.dateFormat ?? 'MMM d, yyyy')
        setFirstDayOfWeek(p.preferences?.firstDayOfWeek ?? 'Sunday')
        setNotifyBudgetOverspent(p.preferences?.notifyBudgetOverspent ?? true)
        setNotifyGoalMilestones(p.preferences?.notifyGoalMilestones ?? true)
        setNotifyMonthlyReport(p.preferences?.notifyMonthlyReport ?? true)
      }
      if (b) setBilling(b)
    })
    return () => {
      cancelled = true
    }
  }, [http])

  function showFeedback(kind: 'success' | 'error', msg: string) {
    setFeedback(msg)
    setFeedbackKind(kind)
    setTimeout(() => setFeedback(null), 3500)
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSavingProfile(true)
    try {
      const res = await http.patch('/api/profile/me', { name, email })
      const p = unwrapSingle<ProfileResponse>(res)
      if (p) setProfile(p)
      showFeedback('success', t('settings.profile.saved', {}, { defaultValue: 'Profile updated.' }))
    } catch (_error) {
      // error surfaced to user via showFeedback below — no additional logging needed
      showFeedback(
        'error',
        t('common.couldNotSaveProfile', {}, { defaultValue: 'Could not save profile.' }),
      )
    } finally {
      setSavingProfile(false)
    }
  }

  async function savePrefs(e: React.FormEvent) {
    e.preventDefault()
    setSavingPrefs(true)
    try {
      const res = await http.patch('/api/profile/me', {
        preferences: {
          currency,
          dateFormat,
          firstDayOfWeek,
          notifyBudgetOverspent,
          notifyGoalMilestones,
          notifyMonthlyReport,
        },
      })
      const p = unwrapSingle<ProfileResponse>(res)
      if (p) setProfile(p)
      // Refresh the cached display currency + date format so formatters across
      // the app reflect the new choices on the next render without a full reload.
      primeCurrency(currency)
      primeDateFormat(dateFormat)
      showFeedback(
        'success',
        t('settings.preferences.saved', {}, { defaultValue: 'Preferences saved.' }),
      )
    } catch (_error) {
      // error surfaced to user via showFeedback below — no additional logging needed
      showFeedback(
        'error',
        t('settings.preferences.saveError', {}, { defaultValue: 'Could not save preferences.' }),
      )
    } finally {
      setSavingPrefs(false)
    }
  }

  async function downloadExport(format: 'csv' | 'json') {
    // Direct <a href> navigation strips the Authorization Bearer header, so
    // the API would 401. Fetch the file with the current auth token, build a
    // Blob URL, and trigger a click on a hidden <a download>.
    const url = `${API_BASE_URL}/export/transactions.${format}`
    const token = http.getAuthToken?.()
    try {
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `coffer-transactions.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      // Free the blob a beat after the click so the browser has a chance to
      // initiate the download.
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
      showFeedback(
        'success',
        t(
          'settings.data.downloaded',
          { format: format.toUpperCase() },
          { defaultValue: 'Downloaded {{format}}.' },
        ),
      )
    } catch (_error) {
      // error surfaced to user via showFeedback below — no additional logging needed
      showFeedback(
        'error',
        t(
          'settings.data.downloadError',
          { format: format.toUpperCase() },
          { defaultValue: 'Could not download {{format}}.' },
        ),
      )
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.grid({ cols: 12, gap: 'lg' }))}>
      <aside className={cm.cn('col-span-12 md:col-span-3')}>
        <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 4))}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
        <nav
          className={cm.stack(1)}
          aria-label={t('nav.settingsSections', {}, { defaultValue: 'Settings sections' })}
        >
          {SECTIONS.map((s) => {
            const isActive = section === s
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSection(s)}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'block w-full text-left rounded-md',
                  isActive
                    ? cm.cn('bg-primary-container', cm.textPrimary)
                    : cm.cn(
                        'text-on-surface-variant',
                        'hover:bg-surface-container hover:text-on-surface',
                      ),
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

      <main className={cm.cn('col-span-12 md:col-span-9 space-y-4')}>
        {feedback ? (
          <div
            role={feedbackKind === 'error' ? 'alert' : 'status'}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              'rounded-xl',
              feedbackKind === 'success'
                ? 'bg-success/10 text-success border border-success/20'
                : 'bg-error/10 text-error border border-error/20',
            )}
          >
            {feedback}
          </div>
        ) : null}

        {section === 'profile' && (
          <form onSubmit={saveProfile} className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-4')}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t('settings.profile.heading', {}, { defaultValue: 'Profile' })}
            </h2>
            <Field
              label={t('form.fullName', {}, { defaultValue: 'Full name' })}
              value={name}
              onChange={setName}
            />
            <Field
              label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
              value={email}
              onChange={setEmail}
              type="email"
            />
            <div className={cm.flex({ gap: 'sm' })}>
              <button
                type="submit"
                disabled={savingProfile}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  'bg-primary text-white rounded-md disabled:opacity-60',
                )}
              >
                {savingProfile
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                  : t('common.saveProfile', {}, { defaultValue: 'Save profile' })}
              </button>
              <Link
                to="/forgot-password"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('medium'),
                  'border border-outline rounded-md hover:bg-surface-container inline-flex items-center',
                )}
              >
                {t('settings.changePassword', {}, { defaultValue: 'Change password' })}
              </Link>
            </div>
          </form>
        )}

        {section === 'preferences' && (
          <form onSubmit={savePrefs} className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-4')}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t('nav.preferences', {}, { defaultValue: 'Preferences' })}
            </h2>
            <Field
              label={t('settings.preferences.currency', {}, { defaultValue: 'Currency' })}
              value={currency}
              onChange={setCurrency}
            />
            <Field
              label={t('settings.preferences.dateFormat', {}, { defaultValue: 'Date format' })}
              value={dateFormat}
              onChange={setDateFormat}
            />
            <label className="block">
              <span
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'block',
                  cm.sp('mb', 1),
                )}
              >
                {t(
                  'settings.preferences.firstDayOfWeek',
                  {},
                  { defaultValue: 'First day of week' },
                )}
              </span>
              <select
                value={firstDayOfWeek}
                onChange={(e) =>
                  setFirstDayOfWeek(e.target.value as 'Sunday' | 'Monday' | 'Saturday')
                }
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'w-full border border-outline-variant rounded-md',
                )}
              >
                <option value="Sunday">
                  {t('settings.day.sunday', {}, { defaultValue: 'Sunday' })}
                </option>
                <option value="Monday">
                  {t('settings.day.monday', {}, { defaultValue: 'Monday' })}
                </option>
                <option value="Saturday">
                  {t('settings.day.saturday', {}, { defaultValue: 'Saturday' })}
                </option>
              </select>
            </label>
            <button
              type="submit"
              disabled={savingPrefs}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                'bg-primary text-white rounded-md disabled:opacity-60',
              )}
            >
              {savingPrefs
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('settings.preferences.saveCta', {}, { defaultValue: 'Save preferences' })}
            </button>
            <div className={cm.cn('border-t border-outline-variant', cm.sp('pt', 4), 'space-y-2')}>
              <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
              </h3>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'settings.notifications.body',
                  {},
                  { defaultValue: 'Choose which alerts you want to receive.' },
                )}
              </p>
              <NotifyToggle
                label={t(
                  'settings.notify.budgetOverspent',
                  {},
                  { defaultValue: 'Budget overspent alerts' },
                )}
                checked={notifyBudgetOverspent}
                onChange={setNotifyBudgetOverspent}
              />
              <NotifyToggle
                label={t(
                  'settings.notify.goalMilestones',
                  {},
                  { defaultValue: 'Goal milestone alerts' },
                )}
                checked={notifyGoalMilestones}
                onChange={setNotifyGoalMilestones}
              />
              <NotifyToggle
                label={t(
                  'settings.notify.monthlyReport',
                  {},
                  { defaultValue: 'Monthly report summary' },
                )}
                checked={notifyMonthlyReport}
                onChange={setNotifyMonthlyReport}
              />
            </div>
            <div className={cm.cn('border-t border-outline-variant', cm.sp('pt', 4), 'space-y-2')}>
              <NotificationsSection />
            </div>
            <div className={cm.cn('border-t border-outline-variant', cm.sp('pt', 4), 'space-y-2')}>
              <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                {t('footer.language', {}, { defaultValue: 'Language' })}
              </h3>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'common.chooseTheLanguage',
                  {},
                  { defaultValue: 'Choose the language used throughout the app.' },
                )}
              </p>
              <LanguagePicker />
            </div>
            <section className={cm.cn(cm.sp('p', 8), 'bg-surface-container-low rounded-xl')}>
              <div className={cm.sp('mb', 6)}>
                <h3 className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}>
                  {t('nav.appearance', {}, { defaultValue: 'Appearance' })}
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
          </form>
        )}

        {section === 'billing' && (
          <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t('settings.billing', {}, { defaultValue: 'Billing' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {billing
                ? t(
                    'settings.billing.planLine',
                    { name: billing.name },
                    { defaultValue: 'You are on the {{name}} plan.' },
                  )
                : t('settings.billing.loading', {}, { defaultValue: 'Loading plan…' })}
            </p>
            <div className={cm.flex({ gap: 'sm' })}>
              <button
                type="button"
                onClick={() => navigate('/settings/billing')}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('medium'),
                  'border border-outline rounded-md hover:bg-surface-container',
                )}
              >
                {t('settings.billing.detailsCta', {}, { defaultValue: 'Billing details' })}
              </button>
              <button
                type="button"
                onClick={() => navigate('/pricing')}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  'bg-primary text-white rounded-md',
                )}
              >
                {t('settings.billing.manageCta', {}, { defaultValue: 'Change plan' })}
              </button>
            </div>
          </section>
        )}

        {section === 'data' && (
          <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t('common.dataExport', {}, { defaultValue: 'Data export' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'settings.data.body',
                {},
                {
                  defaultValue:
                    'Download all your transactions, budgets, and goals as CSV or JSON.',
                },
              )}
            </p>
            <div className={cm.flex({ gap: 'sm' })}>
              <button
                type="button"
                onClick={() => downloadExport('csv')}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('medium'),
                  'border border-outline rounded-md hover:bg-surface-container',
                )}
              >
                {t('common.exportCsv', {}, { defaultValue: 'Export CSV' })}
              </button>
              <button
                type="button"
                onClick={() => downloadExport('json')}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('medium'),
                  'border border-outline rounded-md hover:bg-surface-container',
                )}
              >
                {t('settings.data.exportJsonCta', {}, { defaultValue: 'Export JSON' })}
              </button>
            </div>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {profile
                ? t(
                    'settings.data.signedInAs',
                    { email: profile.email },
                    { defaultValue: 'Signed in as {{email}}.' },
                  )
                : null}
            </p>
          </section>
        )}
      </main>
    </div>
  )
}

function NotifyToggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (next: boolean) => void
}) {
  const cm = getClassMap()
  return (
    <label
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
        cm.sp('py', 1),
        'cursor-pointer',
      )}
    >
      <span className={cm.textSize('sm')}>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={cm.cn('h-4 w-4 rounded border-outline-variant')}
      />
    </label>
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
  onChange: (next: string) => void
  type?: string
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
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 2),
          'w-full border border-outline-variant rounded-md',
        )}
      />
    </label>
  )
}
