import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import {
  AccountSection,
  AuthSection,
  DevicesSection,
  NotificationsSection,
  ThisDeviceSection,
} from '@molecule/app-settings-panel-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { NoshTopBar } from '../components/NoshTopBar.js'

interface ToggleRow {
  key: string
  icon: string
  label: string
  defaultLabel: string
  description: string
  defaultDescription: string
  defaultEnabled: boolean
}

interface DetailRow {
  key: string
  icon: string
  label: string
  defaultLabel: string
  description: string
  defaultDescription: string
  to: string
}

const NOTIFICATIONS: ToggleRow[] = [
  {
    key: 'meals',
    icon: 'restaurant',
    label: 'Meal reminders',
    defaultLabel: 'Meal reminders',
    description: 'Get a friendly nudge at each mealtime.',
    defaultDescription: 'Get a friendly nudge at each mealtime.',
    defaultEnabled: true,
  },
  {
    key: 'water',
    icon: 'water_drop',
    label: 'Water reminders',
    defaultLabel: 'Water reminders',
    description: 'Hydration check-ins every 2 hours.',
    defaultDescription: 'Hydration check-ins every 2 hours.',
    defaultEnabled: true,
  },
  {
    key: 'streak',
    icon: 'local_fire_department',
    label: 'Streak alerts',
    defaultLabel: 'Streak alerts',
    description: 'Heads-up before your streak resets.',
    defaultDescription: 'Heads-up before your streak resets.',
    defaultEnabled: false,
  },
  {
    key: 'weekly',
    icon: 'mail',
    label: 'Weekly summary email',
    defaultLabel: 'Weekly summary email',
    description: 'Sunday recap of your wins and patterns.',
    defaultDescription: 'Sunday recap of your wins and patterns.',
    defaultEnabled: true,
  },
]

const ACCOUNT: DetailRow[] = [
  {
    key: 'profile',
    icon: 'person',
    label: 'Profile',
    defaultLabel: 'Profile',
    description: 'Update your name and email.',
    defaultDescription: 'Update your name and email.',
    to: '/settings#profile',
  },
  {
    key: 'goals',
    icon: 'flag',
    label: 'Daily goals',
    defaultLabel: 'Daily goals',
    description: 'Calories, macros, and activity level.',
    defaultDescription: 'Calories, macros, and activity level.',
    to: '/goals',
  },
  {
    key: 'subscription',
    icon: 'workspace_premium',
    label: 'Subscription',
    defaultLabel: 'Subscription',
    description: 'Manage your plan and billing.',
    defaultDescription: 'Manage your plan and billing.',
    to: '/pricing',
  },
  {
    key: 'export',
    icon: 'download',
    label: 'Export data',
    defaultLabel: 'Export data',
    description: 'Download your full food log as CSV.',
    defaultDescription: 'Download your full food log as CSV.',
    to: '/settings#export',
  },
]

interface NotificationPrefs {
  meals?: boolean
  water?: boolean
  streak?: boolean
  weekly?: boolean
}

interface DiaryExportRow {
  date: string
  meal_type: string
  food_name: string
  servings: number | string
  serving_unit: string
  calories: number | string
  protein: number | string
  carbs: number | string
  fat: number | string
}

const EXPORT_COLUMNS = [
  'date',
  'meal_type',
  'food_name',
  'servings',
  'serving_unit',
  'calories',
  'protein',
  'carbs',
  'fat',
] as const

const csvEscape = (v: unknown): string => {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const todayDate = (): string => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { user, logout } = useAuth<UserProfile>()
  const [prefs, setPrefs] = useState<NotificationPrefs>(() => {
    const init: NotificationPrefs = {}
    for (const n of NOTIFICATIONS) init[n.key as keyof NotificationPrefs] = n.defaultEnabled
    return init
  })
  const [showDelete, setShowDelete] = useState(false)
  const [deletePw, setDeletePw] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const { hash } = useLocation()

  // The Account rows link to /settings#profile and /settings#export —
  // React Router does not scroll to hash fragments on its own.
  useEffect(() => {
    if (!hash) return
    document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [hash])

  useEffect(() => {
    let cancelled = false
    http
      .get<NotificationPrefs>('/api/notification-preferences')
      .then((r) => {
        if (cancelled) return
        if (r.data && typeof r.data === 'object') {
          setPrefs((prev) => ({ ...prev, ...(r.data as NotificationPrefs) }))
        }
      })
      .catch(() => {
        // Defaults already set; treat fetch error as silent.
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const handleToggle = async (key: keyof NotificationPrefs, next: boolean) => {
    const previous = prefs[key]
    setPrefs((p) => ({ ...p, [key]: next }))
    setError(null)
    try {
      await http.put('/api/notification-preferences', { [key]: next })
    } catch (e: unknown) {
      setPrefs((p) => ({ ...p, [key]: previous }))
      setError(
        e instanceof Error
          ? e.message
          : t('nosh.settings.toggleError', {}, { defaultValue: 'Could not save preference.' }),
      )
    }
  }

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setDeleting(true)
    try {
      await http.delete(`/api/users/${user?.id}`, { data: { password: deletePw } })
      await logout()
      navigate('/login', { replace: true })
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : t('nosh.settings.deleteError', {}, { defaultValue: 'Could not delete account.' }),
      )
    } finally {
      setDeleting(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    setInfo(t('nosh.settings.loggedOut', {}, { defaultValue: 'Signed out.' }))
    navigate('/login', { replace: true })
  }

  const handleExport = async () => {
    setError(null)
    setInfo(null)
    setExporting(true)
    try {
      const r = await http.get<DiaryExportRow[]>(
        `/api/diary/range?start_date=1970-01-01&end_date=${todayDate()}`,
      )
      const rows = Array.isArray(r.data) ? (r.data as DiaryExportRow[]) : []
      const csv = [
        EXPORT_COLUMNS.join(','),
        ...rows.map((row) => EXPORT_COLUMNS.map((col) => csvEscape(row[col])).join(',')),
      ].join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${APP_NAME.toLowerCase()}-food-log.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setInfo(
        t(
          'nosh.settings.export.done',
          { count: rows.length },
          { defaultValue: 'Downloaded {{count}} diary entries as CSV.' },
        ),
      )
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : t('nosh.settings.export.error', {}, { defaultValue: 'Could not export your data.' }),
      )
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <NoshTopBar
        title={t('nav.settings', {}, { defaultValue: 'Settings' })}
        eyebrow={t(
          'nosh.settings.eyebrow',
          {},
          { defaultValue: 'Account · Notifications · Privacy' },
        )}
      />

      {error ? (
        <div
          className={cm.cn(
            cm.sp('p', 3),
            cm.textSize('sm'),
            'rounded-lg bg-error-container text-on-error-container',
          )}
          role="alert"
        >
          {error}
        </div>
      ) : null}
      {info ? (
        <div
          className={cm.cn(
            cm.sp('p', 3),
            cm.textSize('sm'),
            'rounded-lg bg-success-container text-on-success-container',
          )}
          role="status"
        >
          {info}
        </div>
      ) : null}

      <div className={cm.cn('grid grid-cols-1 lg:grid-cols-2 gap-6')}>
        <section className={cm.cn(cm.sp('p', 6), 'bg-surface rounded-2xl shadow-sm')}>
          <h3 className={cm.cn(cm.fontWeight('semibold'), cm.sp('mb', 4), 'text-on-surface')}>
            {t('settings.account', {}, { defaultValue: 'Account' })}
          </h3>
          <ul
            className={cm.cn(cm.flex({ direction: 'col' }), 'list-none divide-y divide-outline/30')}
          >
            {ACCOUNT.map((row) => (
              <li key={row.key}>
                <Link
                  to={row.to}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                    cm.sp('py', 4),
                    'group',
                  )}
                >
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        'w-10 h-10 rounded-xl bg-primary-container text-primary',
                      )}
                    >
                      <span aria-hidden="true" className={cm.cn('material-symbols-outlined')}>
                        {row.icon}
                      </span>
                    </span>
                    <div>
                      <p
                        className={cm.cn(
                          cm.fontWeight('semibold'),
                          'text-on-surface group-hover:text-primary transition-colors',
                        )}
                      >
                        {t(
                          `nosh.settings.${row.key}.label`,
                          {},
                          { defaultValue: row.defaultLabel },
                        )}
                      </p>
                      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                        {t(
                          `nosh.settings.${row.key}.description`,
                          {},
                          { defaultValue: row.defaultDescription },
                        )}
                      </p>
                    </div>
                  </div>
                  <span
                    aria-hidden="true"
                    className={cm.cn(
                      'material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors',
                    )}
                  >
                    chevron_right
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className={cm.cn(cm.sp('p', 6), 'bg-surface rounded-2xl shadow-sm')}>
          <h3 className={cm.cn(cm.fontWeight('semibold'), cm.sp('mb', 4), 'text-on-surface')}>
            {t('nosh.settings.notifications.title', {}, { defaultValue: 'Notifications' })}
          </h3>
          <ul
            className={cm.cn(cm.flex({ direction: 'col' }), 'list-none divide-y divide-outline/30')}
          >
            {NOTIFICATIONS.map((row) => {
              const checked = prefs[row.key as keyof NotificationPrefs] ?? row.defaultEnabled
              return (
                <li
                  key={row.key}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                    cm.sp('py', 4),
                  )}
                >
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        'w-10 h-10 rounded-xl bg-primary-container text-primary',
                      )}
                    >
                      <span aria-hidden="true" className={cm.cn('material-symbols-outlined')}>
                        {row.icon}
                      </span>
                    </span>
                    <div>
                      <p className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
                        {t(
                          `nosh.settings.${row.key}.label`,
                          {},
                          { defaultValue: row.defaultLabel },
                        )}
                      </p>
                      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                        {t(
                          `nosh.settings.${row.key}.description`,
                          {},
                          { defaultValue: row.defaultDescription },
                        )}
                      </p>
                    </div>
                  </div>
                  <label className={cm.cn('relative inline-flex items-center cursor-pointer')}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        handleToggle(row.key as keyof NotificationPrefs, e.target.checked)
                      }
                      className={cm.cn('sr-only peer')}
                      aria-label={t(
                        `nosh.settings.${row.key}.label`,
                        {},
                        { defaultValue: row.defaultLabel },
                      )}
                    />
                    <span
                      className={cm.cn(
                        "w-11 h-6 bg-outline rounded-full peer peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:rounded-full after:bg-surface after:shadow after:transition-transform peer-checked:after:translate-x-5",
                      )}
                    />
                  </label>
                </li>
              )
            })}
          </ul>
        </section>
      </div>

      <section className={cm.cn(cm.sp('p', 6), 'bg-surface rounded-2xl shadow-sm')}>
        <NotificationsSection />
      </section>

      <section
        id="profile"
        className={cm.cn(cm.sp('p', 6), 'bg-surface rounded-2xl shadow-sm scroll-mt-24')}
      >
        <h3 className={cm.cn(cm.fontWeight('semibold'), cm.sp('mb', 4), 'text-on-surface')}>
          {t('nosh.settings.profile.label', {}, { defaultValue: 'Profile' })}
        </h3>
        <div className={cm.stack(6)}>
          <AccountSection />
          <AuthSection />
        </div>
      </section>

      <section className={cm.cn(cm.sp('p', 6), 'bg-surface rounded-2xl shadow-sm')}>
        <div className={cm.stack(6)}>
          <DevicesSection />
          <ThisDeviceSection />
        </div>
      </section>

      <section
        id="export"
        className={cm.cn(cm.sp('p', 6), 'bg-surface rounded-2xl shadow-sm scroll-mt-24')}
      >
        <h3 className={cm.cn(cm.fontWeight('semibold'), cm.sp('mb', 2), 'text-on-surface')}>
          {t('nosh.settings.export.label', {}, { defaultValue: 'Export data' })}
        </h3>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mb', 4), 'text-on-surface-variant')}>
          {t(
            'nosh.settings.export.description',
            {},
            { defaultValue: 'Download your full food log as CSV.' },
          )}
        </p>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            cm.textSize('sm'),
            'rounded-lg bg-primary text-on-primary hover:bg-primary-light transition-colors disabled:opacity-50',
          )}
        >
          <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-base')}>
            download
          </span>
          {exporting
            ? t('nosh.settings.export.preparing', {}, { defaultValue: 'Preparing…' })
            : t('nosh.settings.export.cta', {}, { defaultValue: 'Download CSV' })}
        </button>
      </section>

      <section className={cm.cn(cm.sp('p', 6), 'bg-surface rounded-2xl shadow-sm')}>
        <h3 className={cm.cn(cm.fontWeight('semibold'), cm.sp('mb', 2), 'text-on-surface')}>
          {t('settings.language.title', {}, { defaultValue: 'Language' })}
        </h3>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mb', 4), 'text-on-surface-variant')}>
          {t(
            'common.chooseTheLanguage',
            {},
            { defaultValue: 'Choose the language used throughout the app.' },
          )}
        </p>
        <LanguagePicker />
      </section>

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
      <section className={cm.cn(cm.sp('p', 6), 'bg-surface rounded-2xl shadow-sm')}>
        <h3 className={cm.cn(cm.fontWeight('semibold'), cm.sp('mb', 3), 'text-on-surface')}>
          {t('nosh.settings.session.title', {}, { defaultValue: 'Session' })}
        </h3>
        <button
          type="button"
          onClick={handleLogout}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            cm.textSize('sm'),
            'rounded-lg bg-surface-variant text-on-surface hover:bg-outline transition-colors',
          )}
        >
          {t('settings.logOut', {}, { defaultValue: 'Sign out' })}
        </button>
      </section>

      <section
        className={cm.cn(cm.sp('p', 6), 'bg-surface rounded-2xl shadow-sm border border-error/30')}
      >
        <h3 className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface mb-1')}>
          {t('nav.dangerZone', {}, { defaultValue: 'Danger zone' })}
        </h3>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mb-4')}>
          {t(
            'nosh.settings.danger.body',
            {},
            { defaultValue: 'Permanently delete your account and all logged data.' },
          )}
        </p>
        {!showDelete ? (
          <button
            type="button"
            onClick={() => setShowDelete(true)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-lg bg-error-container text-on-error-container hover:bg-error hover:text-on-error transition-colors',
            )}
          >
            {t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
          </button>
        ) : (
          <form onSubmit={handleDelete} className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
            <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-on-surface')}>
              {t(
                'nosh.settings.danger.confirm',
                {},
                { defaultValue: 'Confirm with your password to delete your account permanently.' },
              )}
            </p>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={deletePw}
              onChange={(e) => setDeletePw(e.target.value)}
              placeholder={t(
                'nosh.settings.danger.passwordPlaceholder',
                {},
                { defaultValue: 'Current password' },
              )}
              className={cm.cn(
                'w-full max-w-sm h-11 px-4 rounded-xl bg-surface border border-outline focus:border-error focus:ring-2 focus:ring-error/20 transition-all text-on-surface outline-none',
              )}
            />
            <div className={cm.cn(cm.flex({ gap: 'sm' }))}>
              <button
                type="submit"
                disabled={deleting || !deletePw}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  'rounded-lg bg-error text-on-error hover:bg-error/90 transition-colors disabled:opacity-50',
                )}
              >
                {deleting
                  ? t('common.deletingEllipsis', {}, { defaultValue: 'Deleting…' })
                  : t(
                      'nosh.settings.danger.confirmCta',
                      {},
                      { defaultValue: 'Permanently delete' },
                    )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDelete(false)
                  setDeletePw('')
                }}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('medium'),
                  cm.textSize('sm'),
                  'text-on-surface-variant hover:text-on-surface transition-colors',
                )}
              >
                {t('common.cancel', {}, { defaultValue: 'Cancel' })}
              </button>
            </div>
          </form>
        )}
      </section>
    </>
  )
}
