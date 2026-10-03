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
import { LanguagePicker, Switch, ThemeToggle } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { SimmerTopBar } from '../components/SimmerTopBar.js'

interface DetailRow {
  key: string
  icon: string
  label: string
  defaultLabel: string
  description: string
  defaultDescription: string
  to: string
}

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
    key: 'recipes',
    icon: 'menu_book',
    label: 'Recipe box',
    defaultLabel: 'Recipe box',
    description: 'Your saved recipes and the starter catalog.',
    defaultDescription: 'Your saved recipes and the starter catalog.',
    to: '/recipes',
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
    description: 'Download your recipe box as CSV.',
    defaultDescription: 'Download your recipe box as CSV.',
    to: '/settings#export',
  },
]

interface RecipeRow {
  id: string
  title: string
  description: string
  servings: number
  prep_minutes: number
  cook_minutes: number
  tags: string[]
  ingredients?: Array<{ item_name: string; quantity: number | string; unit: string }>
  steps?: Array<{ text: string }>
}

const EXPORT_COLUMNS = [
  'title',
  'description',
  'servings',
  'prep_minutes',
  'cook_minutes',
  'tags',
  'ingredients',
  'steps',
] as const

/** localStorage keys shared with Pantry (restock) and GroceryList (badges). */
const PANTRY_BADGES_KEY = 'simmer.settings.pantryBadges'
const RESTOCK_THRESHOLD_KEY = 'simmer.settings.restockThreshold'

function readStoredFlag(key: string, fallback: boolean): boolean {
  try {
    const raw = window.localStorage.getItem(key)
    return raw === null ? fallback : raw === 'on'
  } catch (_error) {
    // Private mode / storage unavailable: the flag just starts at its default.
    return fallback
  }
}

function readStoredThreshold(fallback: number): number {
  try {
    const raw = window.localStorage.getItem(RESTOCK_THRESHOLD_KEY)
    const n = raw === null ? NaN : Number.parseInt(raw, 10)
    return Number.isFinite(n) && n >= 1 ? Math.min(n, 10) : fallback
  } catch (_error) {
    // Private mode / storage unavailable: the threshold just starts at its default.
    return fallback
  }
}

const csvEscape = (v: unknown): string => {
  const s = String(v ?? '')
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { user, logout } = useAuth<UserProfile>()
  const [showDelete, setShowDelete] = useState(false)
  const [deletePw, setDeletePw] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  // Smart-pantry automation preferences — read/written locally; the pantry
  // restock queue and the grocery list's pantry badges consume them.
  const [pantryBadges, setPantryBadges] = useState<boolean>(() =>
    readStoredFlag(PANTRY_BADGES_KEY, true),
  )
  const [restockThreshold, setRestockThreshold] = useState<number>(() => readStoredThreshold(1))
  const { hash } = useLocation()

  // The Account rows link to /settings#profile and /settings#export —
  // React Router does not scroll to hash fragments on its own.
  useEffect(() => {
    if (!hash) return
    document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [hash])

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
          : t('simmer.settings.deleteError', {}, { defaultValue: 'Could not delete account.' }),
      )
    } finally {
      setDeleting(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    setInfo(t('simmer.settings.loggedOut', {}, { defaultValue: 'Signed out.' }))
    navigate('/login', { replace: true })
  }

  const handleExport = async () => {
    setError(null)
    setInfo(null)
    setExporting(true)
    try {
      const r = await http.get<RecipeRow[]>('/api/recipes?limit=100')
      const list = Array.isArray(r.data) ? (r.data as RecipeRow[]) : []
      // Ingredients + steps live behind the detail endpoint; fetch them for
      // the first 100 recipes so the export carries full recipes.
      const detailed = await Promise.all(
        list.slice(0, 100).map(async (row) => {
          try {
            const d = await http.get<RecipeRow>(`/api/recipes/${row.id}`)
            return (d.data as RecipeRow) ?? row
          } catch (_e) {
            return row
          }
        }),
      )
      const rows = detailed.map((row) => ({
        ...row,
        tags: (row.tags ?? []).join('|'),
        ingredients: (row.ingredients ?? [])
          .map((i) => `${i.quantity}${i.unit ? ` ${i.unit}` : ''} ${i.item_name}`.trim())
          .join('; '),
        steps: (row.steps ?? []).map((s, i) => `${i + 1}. ${s.text}`).join('; '),
      }))
      const csv = [
        EXPORT_COLUMNS.join(','),
        ...rows.map((row) => EXPORT_COLUMNS.map((col) => csvEscape(row[col])).join(',')),
      ].join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${APP_NAME.toLowerCase()}-recipe-box.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setInfo(
        t(
          'simmer.settings.export.done',
          { count: rows.length },
          { defaultValue: 'Downloaded {{count}} recipes as CSV.' },
        ),
      )
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : t('simmer.settings.export.error', {}, { defaultValue: 'Could not export your data.' }),
      )
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <SimmerTopBar
        title={t('nav.settings', {}, { defaultValue: 'Settings' })}
        eyebrow={t('simmer.settings.eyebrow', {}, { defaultValue: 'Account · Recipes · Privacy' })}
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

      <section className={cm.cn(cm.sp('p', 6), 'bg-surface rounded-2xl shadow-sm')}>
        <h2 className={cm.cn(cm.fontWeight('semibold'), cm.sp('mb', 4), 'text-on-surface')}>
          {t('settings.account', {}, { defaultValue: 'Account' })}
        </h2>
        <ul
          className={cm.cn(cm.flex({ direction: 'col' }), 'list-none divide-y divide-outline/30')}
        >
          {ACCOUNT.map((row) => (
            <li key={row.key}>
              <Link
                to={row.to}
                data-mol-id={`settings-account-${row.key}`}
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
                        `simmer.settings.${row.key}.label`,
                        {},
                        { defaultValue: row.defaultLabel },
                      )}
                    </p>
                    <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                      {t(
                        `simmer.settings.${row.key}.description`,
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
        <NotificationsSection />
      </section>

      <section
        id="profile"
        className={cm.cn(cm.sp('p', 6), 'bg-surface rounded-2xl shadow-sm scroll-mt-24')}
      >
        <h2 className={cm.cn(cm.fontWeight('semibold'), cm.sp('mb', 4), 'text-on-surface')}>
          {t('simmer.settings.profile.label', {}, { defaultValue: 'Profile' })}
        </h2>
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
        <h2 className={cm.cn(cm.fontWeight('semibold'), cm.sp('mb', 2), 'text-on-surface')}>
          {t('simmer.settings.export.label', {}, { defaultValue: 'Export data' })}
        </h2>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mb', 4), 'text-on-surface-variant')}>
          {t(
            'simmer.settings.export.description',
            {},
            { defaultValue: 'Download every recipe you can see as CSV.' },
          )}
        </p>
        <button
          type="button"
          data-mol-id="settings-export-csv"
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
            ? t('simmer.settings.export.preparing', {}, { defaultValue: 'Preparing…' })
            : t('simmer.settings.export.cta', {}, { defaultValue: 'Download CSV' })}
        </button>
      </section>

      {/* Measurement, Language & Regional Standards (Stitch design section) */}
      <section className={cm.cn(cm.sp('p', 6), 'bg-surface rounded-2xl shadow-sm')}>
        <h2 className={cm.cn(cm.fontWeight('semibold'), cm.sp('mb', 2), 'text-on-surface')}>
          {t(
            'simmer.settings.standards.title',
            {},
            { defaultValue: 'Measurement, Language & Regional Standards' },
          )}
        </h2>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mb', 4), 'text-on-surface-variant')}>
          {t(
            'simmer.settings.standards.body',
            {},
            {
              defaultValue:
                'How Simmer formats quantities, weeks, and language across your plan and grocery list.',
            },
          )}
        </p>
        <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), 'list-none')}>
          {(
            [
              {
                key: 'units',
                icon: 'scale',
                label: 'Measurement units',
                value: 'Metric (g / ml / °C)',
                description: 'Recipe quantities and grocery amounts use metric package sizes.',
              },
              {
                key: 'weekStart',
                icon: 'calendar_view_week',
                label: 'Week starts',
                value: 'Monday',
                description: 'The planner and grocery list follow the ISO Monday-start week.',
              },
            ] as const
          ).map((row) => (
            <li
              key={row.key}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                cm.sp('py', 2),
              )}
            >
              <span className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'w-10 h-10 rounded-xl bg-primary-container text-primary',
                  )}
                  aria-hidden="true"
                >
                  <span aria-hidden="true" className={cm.cn('material-symbols-outlined')}>
                    {row.icon}
                  </span>
                </span>
                <span>
                  <span
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      'text-on-surface block',
                    )}
                  >
                    {t(
                      `simmer.settings.standards.${row.key}.label`,
                      {},
                      { defaultValue: row.label },
                    )}
                  </span>
                  <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {t(
                      `simmer.settings.standards.${row.key}.description`,
                      {},
                      { defaultValue: row.description },
                    )}
                  </span>
                </span>
              </span>
              <span
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'rounded-full bg-surface-variant text-on-surface-variant whitespace-nowrap',
                )}
              >
                {t(`simmer.settings.standards.${row.key}.value`, {}, { defaultValue: row.value })}
              </span>
            </li>
          ))}
        </ul>
        <div className={cm.sp('mt', 4)}>
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              cm.sp('mb', 2),
              'text-on-surface',
            )}
          >
            {t('settings.language.title', {}, { defaultValue: 'Language' })}
          </p>
          <LanguagePicker />
        </div>
      </section>

      {/* Smart Pantry & Grocery Automation (Stitch design section) — both
          rows are wired: pantryBadges drives the grocery list's "you already
          have this" badges, restockThreshold drives the pantry's restock
          queue. */}
      <section className={cm.cn(cm.sp('p', 6), 'bg-surface rounded-2xl shadow-sm')}>
        <h2 className={cm.cn(cm.fontWeight('semibold'), cm.sp('mb', 2), 'text-on-surface')}>
          {t(
            'simmer.settings.automation.title',
            {},
            { defaultValue: 'Smart Pantry & Grocery Automation' },
          )}
        </h2>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mb', 4), 'text-on-surface-variant')}>
          {t(
            'simmer.settings.automation.body',
            {},
            {
              defaultValue:
                'Let the pantry quietly work on your grocery list and restock reminders.',
            },
          )}
        </p>
        <ul
          className={cm.cn(cm.flex({ direction: 'col' }), 'list-none divide-y divide-outline/30')}
        >
          <li
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
              cm.sp('py', 4),
            )}
          >
            <div>
              <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}>
                {t(
                  'simmer.settings.automation.dedup.title',
                  {},
                  { defaultValue: 'Automated Pantry Deduplication' },
                )}
              </p>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t(
                  'simmer.settings.automation.dedup.body',
                  {},
                  {
                    defaultValue:
                      'Flag grocery-list items you already have, so you never re-buy staples.',
                  },
                )}
              </p>
            </div>
            <Switch
              checked={pantryBadges}
              onChange={(e) => {
                const next = (e.target as HTMLInputElement).checked
                setPantryBadges(next)
                try {
                  window.localStorage.setItem(PANTRY_BADGES_KEY, next ? 'on' : 'off')
                } catch (_error) {
                  // Private mode: the toggle still holds for this view.
                }
              }}
              size="md"
              data-mol-id="settings-automation-dedup"
              aria-label={t(
                'simmer.settings.automation.dedup.toggleLabel',
                {},
                { defaultValue: 'Toggle pantry deduplication' },
              )}
            />
          </li>
          <li
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
              cm.sp('py', 4),
            )}
          >
            <div>
              <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}>
                {t(
                  'simmer.settings.automation.restock.title',
                  {},
                  { defaultValue: 'Restock reminders' },
                )}
              </p>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t(
                  'simmer.settings.automation.restock.body',
                  {},
                  {
                    defaultValue:
                      'Flag pantry staples at or below this many units in the restock queue.',
                  },
                )}
              </p>
            </div>
            <select
              data-mol-id="settings-automation-restock-threshold"
              value={restockThreshold}
              onChange={(e) => {
                const next = Number.parseInt(e.target.value, 10) || 1
                setRestockThreshold(next)
                try {
                  window.localStorage.setItem(RESTOCK_THRESHOLD_KEY, String(next))
                } catch (_error) {
                  // Private mode: the select still holds for this view.
                }
              }}
              aria-label={t(
                'simmer.settings.automation.restock.aria',
                {},
                { defaultValue: 'Restock threshold' },
              )}
              className={cm.cn(
                'h-10 px-3 rounded-xl bg-surface border border-outline text-on-surface text-sm outline-none focus:border-primary',
              )}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {t(
                    'simmer.settings.automation.restock.option',
                    { count: n },
                    { defaultValue: '{{count}} or fewer' },
                  )}
                </option>
              ))}
            </select>
          </li>
        </ul>
      </section>

      <section className={cm.cn(cm.sp('p', 8), 'bg-surface-container-low rounded-xl')}>
        <div className={cm.sp('mb', 6)}>
          <h2 className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}>
            {t('nav.appearance', {}, { defaultValue: 'Appearance' })}
          </h2>
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
        <h2 className={cm.cn(cm.fontWeight('semibold'), cm.sp('mb', 3), 'text-on-surface')}>
          {t('simmer.settings.session.title', {}, { defaultValue: 'Session' })}
        </h2>
        <button
          type="button"
          data-mol-id="settings-sign-out"
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
        <h2 className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface mb-1')}>
          {t('nav.dangerZone', {}, { defaultValue: 'Danger zone' })}
        </h2>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mb-4')}>
          {t(
            'simmer.settings.danger.body',
            {},
            { defaultValue: 'Permanently delete your account, plan, and recipe box.' },
          )}
        </p>
        {!showDelete ? (
          <button
            type="button"
            data-mol-id="settings-delete-account"
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
                'simmer.settings.danger.confirm',
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
                'simmer.settings.danger.passwordPlaceholder',
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
                      'simmer.settings.danger.confirmCta',
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
