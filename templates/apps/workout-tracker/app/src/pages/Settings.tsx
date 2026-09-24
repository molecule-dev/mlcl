import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, Switch, ThemeToggle } from '@molecule/app-ui-react'

import { ForjaTopBar } from '../components/ForjaTopBar.js'
import { primeWeightUnit } from '../lib/weight.js'

type Preferences = {
  weightUnit: 'kg' | 'lbs'
  distanceUnit: 'km' | 'mi'
  restTimerSeconds: number
  notifyRestTimer: boolean
  notifyStreak: boolean
  notifyPR: boolean
  csvExport: boolean
}

/**
 * Shape returned by GET /api/settings — the server-side preferences channel.
 * The platform user resource NEVER returns `oauthData` on reads, so prefs
 * cannot ride PATCH/GET /users/:id (writes vanish on the next read); this
 * channel reads and merges the slice server-side instead.
 */
type SettingsResponse = {
  preferences?: Partial<Preferences>
}

const DEFAULT_PREFS: Preferences = {
  weightUnit: 'kg',
  distanceUnit: 'km',
  restTimerSeconds: 120,
  notifyRestTimer: true,
  notifyStreak: true,
  notifyPR: true,
  csvExport: false,
}

const REST_TIMER_OPTIONS = [60, 90, 120, 180, 240]

const PREF_GROUPS: { groupKey: string; groupLabel: string; description: string }[] = [
  {
    groupKey: 'units',
    groupLabel: 'Units & display',
    description: 'How weight and distance render across the app.',
  },
  {
    groupKey: 'notifications',
    groupLabel: 'Notifications',
    description: 'Which in-app pings fire while you train.',
  },
  {
    groupKey: 'integrations',
    groupLabel: 'Integrations',
    description: 'External tools wired into your account.',
  },
]

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user, logout } = useAuth<UserProfile>()
  const http = useHttpClient()
  const navigate = useNavigate()

  const [activeGroup, setActiveGroup] = useState('units')
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS)
  const [loaded, setLoaded] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState<keyof Preferences | null>(null)
  const [showCacheCleared, setShowCacheCleared] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    if (!showDeleteModal) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowDeleteModal(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [showDeleteModal])

  useEffect(() => {
    let cancelled = false
    if (!user?.id) return
    async function load() {
      try {
        const response = await http.get<SettingsResponse>('/settings')
        if (cancelled) return
        const remote = response.data?.preferences ?? {}
        setPrefs({ ...DEFAULT_PREFS, ...remote })
        primeWeightUnit(remote.weightUnit)
      } catch (_error) {
        // Prefs fetch failed — keep hardcoded defaults
      } finally {
        if (!cancelled) setLoaded(true)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [http, user?.id])

  async function persist(next: Preferences, key: keyof Preferences) {
    if (!user?.id) return
    setSaveError('')
    setSaving(key)
    try {
      // PATCH /api/settings merges server-side, so sending just the full
      // preferences slice never clobbers unrelated oauthData keys.
      await http.patch<SettingsResponse>('/settings', { preferences: next })
      // Domain event: a preference was persisted.
      void track({ name: 'settings.updated', properties: { preference: key } })
      setPrefs(next)
      primeWeightUnit(next.weightUnit)
    } catch (err) {
      setSaveError(
        err instanceof Error
          ? err.message
          : t('forja.settings.error.save', {}, { defaultValue: 'Could not save preference.' }),
      )
    } finally {
      setSaving(null)
    }
  }

  function update<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    const next = { ...prefs, [key]: value }
    void persist(next, key)
  }

  async function handleResetCache() {
    try {
      window.localStorage.clear()
      window.sessionStorage.clear()
    } catch (_error) {
      // Storage clear failed — ignored (private mode or restricted context)
    }
    setShowCacheCleared(true)
    window.setTimeout(() => setShowCacheCleared(false), 4000)
  }

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.id) return
    setDeleting(true)
    setDeleteError('')
    try {
      await http.delete(`/users/${user.id}`, { data: { password: deletePassword } })
      await logout()
      navigate('/login')
    } catch (err) {
      setDeleteError(
        err instanceof Error
          ? err.message
          : t(
              'forja.settings.danger.deleteError',
              {},
              { defaultValue: 'Could not delete account.' },
            ),
      )
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <ForjaTopBar
        title={t('nav.settings', {}, { defaultValue: 'Settings' })}
        eyebrow={
          <>
            <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-base')}>
              settings
            </span>
            <span>
              {t(
                'forja.settings.eyebrow',
                {},
                { defaultValue: 'Account · Preferences · Integrations' },
              )}
            </span>
          </>
        }
      />

      {saveError ? (
        <p
          role="alert"
          data-testid="settings-error"
          className={cm.cn(
            cm.textSize('sm'),
            cm.sp('p', 4),
            'rounded-xl bg-error-container text-on-error-container',
          )}
        >
          {saveError}
        </p>
      ) : null}

      {showCacheCleared ? (
        <p
          role="status"
          data-testid="settings-cache-cleared"
          className={cm.cn(
            cm.textSize('sm'),
            cm.sp('p', 4),
            'rounded-xl bg-volume-up/15 text-on-surface border border-volume-up/40',
          )}
        >
          {t('forja.settings.danger.resetSuccess', {}, { defaultValue: 'Local cache cleared.' })}
        </p>
      ) : null}

      {/* Below lg the group nav becomes a horizontal chip row and the panel
          gets the full width — a 200px+panel split at 768px leaves the pref
          rows ~220px wide, narrower than a phone, and overflows the row. */}
      <div className={cm.cn('grid grid-cols-1 lg:grid-cols-[200px_minmax(0,1fr)] gap-6')}>
        <nav
          aria-label={t('forja.settings.groupsNavLabel', {}, { defaultValue: 'Settings groups' })}
          className={cm.cn(
            cm.flex({ gap: 'xs' }),
            'flex-row overflow-x-auto lg:flex-col lg:overflow-visible list-none',
          )}
        >
          {PREF_GROUPS.map((g) => (
            <button
              key={g.groupKey}
              type="button"
              data-testid={`settings-tab-${g.groupKey}`}
              onClick={() => setActiveGroup(g.groupKey)}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'shrink-0 whitespace-nowrap rounded-xl text-left transition-colors uppercase tracking-widest',
                activeGroup === g.groupKey
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface hover:bg-surface-variant',
              )}
            >
              <span>{g.groupLabel}</span>
            </button>
          ))}
        </nav>

        <section
          className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), 'min-w-0')}
          data-testid="settings-panel"
        >
          {!loaded ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('forja.settings.loading', {}, { defaultValue: 'Loading preferences…' })}
            </p>
          ) : null}

          {activeGroup === 'units' ? (
            <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), 'list-none')}>
              <li
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('p', 5),
                  'rounded-xl bg-surface border border-outline/40',
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'w-12 h-12 rounded-full bg-primary-container text-primary shrink-0',
                  )}
                >
                  <span aria-hidden="true" className={cm.cn('material-symbols-outlined')}>
                    monitor_weight
                  </span>
                </span>
                <div className={cm.cn(cm.flex({ direction: 'col' }), 'flex-1 min-w-0')}>
                  <label htmlFor="pref-weight-unit" className={cm.cn('font-bold text-on-surface')}>
                    {t('forja.settings.units.weight.title', {}, { defaultValue: 'Weight unit' })}
                  </label>
                  <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                    {t(
                      'forja.settings.units.weight.body',
                      {},
                      { defaultValue: 'How weights render in workouts and PRs.' },
                    )}
                  </span>
                </div>
                <select
                  id="pref-weight-unit"
                  data-testid="pref-weight-unit"
                  value={prefs.weightUnit}
                  disabled={saving === 'weightUnit'}
                  onChange={(e) => update('weightUnit', e.target.value as 'kg' | 'lbs')}
                  className={cm.cn(
                    cm.sp('px', 3),
                    'h-10 rounded-lg border border-outline bg-surface text-on-surface font-bold',
                  )}
                >
                  <option value="kg">kg</option>
                  <option value="lbs">lbs</option>
                </select>
              </li>
              <li
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('p', 5),
                  'rounded-xl bg-surface border border-outline/40',
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'w-12 h-12 rounded-full bg-primary-container text-primary shrink-0',
                  )}
                >
                  <span aria-hidden="true" className={cm.cn('material-symbols-outlined')}>
                    straighten
                  </span>
                </span>
                <div className={cm.cn(cm.flex({ direction: 'col' }), 'flex-1 min-w-0')}>
                  <label
                    htmlFor="pref-distance-unit"
                    className={cm.cn('font-bold text-on-surface')}
                  >
                    {t(
                      'forja.settings.units.distance.title',
                      {},
                      { defaultValue: 'Distance unit' },
                    )}
                  </label>
                  <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                    {t(
                      'forja.settings.units.distance.body',
                      {},
                      { defaultValue: 'Cardio distance display.' },
                    )}
                  </span>
                </div>
                <select
                  id="pref-distance-unit"
                  data-testid="pref-distance-unit"
                  value={prefs.distanceUnit}
                  disabled={saving === 'distanceUnit'}
                  onChange={(e) => update('distanceUnit', e.target.value as 'km' | 'mi')}
                  className={cm.cn(
                    cm.sp('px', 3),
                    'h-10 rounded-lg border border-outline bg-surface text-on-surface font-bold',
                  )}
                >
                  <option value="km">km</option>
                  <option value="mi">mi</option>
                </select>
              </li>
              <li
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('p', 5),
                  'rounded-xl bg-surface border border-outline/40',
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'w-12 h-12 rounded-full bg-primary-container text-primary shrink-0',
                  )}
                >
                  <span aria-hidden="true" className={cm.cn('material-symbols-outlined')}>
                    timer
                  </span>
                </span>
                <div className={cm.cn(cm.flex({ direction: 'col' }), 'flex-1 min-w-0')}>
                  <label htmlFor="pref-rest-timer" className={cm.cn('font-bold text-on-surface')}>
                    {t(
                      'forja.settings.units.rest.title',
                      {},
                      { defaultValue: 'Default rest timer' },
                    )}
                  </label>
                  <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                    {t(
                      'forja.settings.units.rest.body',
                      {},
                      { defaultValue: 'Auto-start countdown after each completed set.' },
                    )}
                  </span>
                </div>
                <select
                  id="pref-rest-timer"
                  data-testid="pref-rest-timer"
                  value={prefs.restTimerSeconds}
                  disabled={saving === 'restTimerSeconds'}
                  onChange={(e) => update('restTimerSeconds', Number(e.target.value))}
                  className={cm.cn(
                    cm.sp('px', 3),
                    'h-10 rounded-lg border border-outline bg-surface text-on-surface font-bold',
                  )}
                >
                  {REST_TIMER_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}s
                    </option>
                  ))}
                </select>
              </li>
              <li
                data-testid="pref-language"
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('p', 5),
                  'rounded-xl bg-surface border border-outline/40',
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'w-12 h-12 rounded-full bg-primary-container text-primary shrink-0',
                  )}
                >
                  <span aria-hidden="true" className={cm.cn('material-symbols-outlined')}>
                    language
                  </span>
                </span>
                <div className={cm.cn(cm.flex({ direction: 'col' }), 'flex-1 min-w-0')}>
                  <span className={cm.cn('font-bold text-on-surface')}>
                    {t('footer.language', {}, { defaultValue: 'Language' })}
                  </span>
                  <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                    {t(
                      'common.chooseTheLanguage',
                      {},
                      { defaultValue: 'Choose the language used throughout the app.' },
                    )}
                  </span>
                </div>
                <LanguagePicker />
              </li>
            </ul>
          ) : null}

          {activeGroup === 'notifications' ? (
            <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), 'list-none')}>
              <NotifyRow
                cm={cm}
                icon="notifications_active"
                titleKey="forja.settings.notify.rest.title"
                titleDefault="Rest timer ping"
                bodyKey="forja.settings.notify.rest.body"
                bodyDefault="Vibrate + chime when rest ends."
                checked={prefs.notifyRestTimer}
                onChange={(v) => update('notifyRestTimer', v)}
                testId="pref-notify-rest"
                saving={saving === 'notifyRestTimer'}
              />
              <NotifyRow
                cm={cm}
                icon="local_fire_department"
                titleKey="forja.settings.notify.streak.title"
                titleDefault="Streak reminders"
                bodyKey="forja.settings.notify.streak.body"
                bodyDefault="Nudge when a streak is at risk."
                checked={prefs.notifyStreak}
                onChange={(v) => update('notifyStreak', v)}
                testId="pref-notify-streak"
                saving={saving === 'notifyStreak'}
              />
              <NotifyRow
                cm={cm}
                icon="emoji_events"
                titleKey="forja.settings.notify.pr.title"
                titleDefault="PR celebrations"
                bodyKey="forja.settings.notify.pr.body"
                bodyDefault="Toast + confetti on a new personal record."
                checked={prefs.notifyPR}
                onChange={(v) => update('notifyPR', v)}
                testId="pref-notify-pr"
                saving={saving === 'notifyPR'}
              />
            </ul>
          ) : null}

          {activeGroup === 'integrations' ? (
            <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), 'list-none')}>
              <NotifyRow
                cm={cm}
                icon="download"
                titleKey="forja.settings.integrations.csv.title"
                titleDefault="CSV export enabled"
                bodyKey="forja.settings.integrations.csv.body"
                bodyDefault="Download your full set log from /history."
                checked={prefs.csvExport}
                onChange={(v) => update('csvExport', v)}
                testId="pref-csv-export"
                saving={saving === 'csvExport'}
              />
            </ul>
          ) : null}

          <article
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'sm' }),
              cm.sp('p', 5),
              'rounded-2xl bg-error-container/30 border border-error/30',
            )}
          >
            <h3 className={cm.cn(cm.fontWeight('bold'), 'text-error')}>
              {t('nav.dangerZone', {}, { defaultValue: 'Danger zone' })}
            </h3>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'forja.settings.danger.body',
                {},
                {
                  defaultValue: 'Wipe your local cache or permanently delete your account.',
                },
              )}
            </p>
            <div className={cm.cn(cm.flex({ gap: 'sm' }), 'flex-wrap')}>
              <button
                type="button"
                onClick={handleResetCache}
                data-testid="settings-reset-cache"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  'rounded-full bg-surface text-on-surface border border-outline hover:bg-surface-variant transition-colors uppercase tracking-wide',
                )}
              >
                {t('forja.settings.danger.reset', {}, { defaultValue: 'Reset cache' })}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                data-testid="settings-delete-account"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  'rounded-full bg-error text-on-error hover:bg-error/90 transition-colors uppercase tracking-wide',
                )}
              >
                {t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
              </button>
            </div>
          </article>

          {/* Appearance lives inside the panel column so it never wraps
              into the nav column on narrow viewports. */}
          <article
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'sm' }),
              cm.sp('p', 5),
              'bg-surface-container-low rounded-xl',
            )}
          >
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
            <ThemeToggle />
          </article>
        </section>
      </div>

      {showDeleteModal ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t(
            'forja.settings.danger.deleteModalLabel',
            {},
            { defaultValue: 'Confirm account deletion' },
          )}
          data-testid="settings-delete-modal"
          className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), 'fixed inset-0 z-50')}
        >
          <div
            role="presentation"
            className={cm.cn('absolute inset-0 bg-black/60')}
            onClick={() => setShowDeleteModal(false)}
          />
          <form
            onSubmit={handleDelete}
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'sm' }),
              cm.sp('p', 6),
              'relative w-full max-w-md rounded-2xl bg-surface border border-outline shadow-xl',
            )}
          >
            <h2 className={cm.cn('text-xl font-extrabold tracking-tight text-error')}>
              {t('forja.settings.danger.deleteTitle', {}, { defaultValue: 'Delete this account?' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'forja.settings.danger.deleteWarning',
                {},
                {
                  defaultValue:
                    'This permanently removes your workouts, templates, exercises, and personal records. This cannot be undone.',
                },
              )}
            </p>
            <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  'font-black uppercase tracking-widest text-on-surface',
                )}
              >
                {t(
                  'forja.settings.danger.password',
                  {},
                  { defaultValue: 'Confirm with your password' },
                )}
              </span>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                data-testid="settings-delete-password"
                autoComplete="current-password"
                required
                className={cm.cn(
                  cm.sp('px', 4),
                  'h-12 rounded-lg border border-outline bg-surface text-on-surface',
                )}
              />
            </label>
            {deleteError ? (
              <p role="alert" className={cm.cn(cm.textSize('sm'), 'text-error')}>
                {deleteError}
              </p>
            ) : null}
            <div className={cm.cn(cm.flex({ gap: 'sm' }))}>
              <button
                type="submit"
                disabled={deleting}
                data-testid="settings-delete-submit"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  'rounded-full bg-error text-on-error hover:bg-error/90 transition-colors uppercase tracking-wide disabled:opacity-50',
                )}
              >
                {deleting
                  ? t('common.deletingEllipsis', {}, { defaultValue: 'Deleting…' })
                  : t(
                      'forja.settings.danger.confirmDelete',
                      {},
                      { defaultValue: 'Permanently delete' },
                    )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeletePassword('')
                  setDeleteError('')
                }}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  'rounded-full bg-surface text-on-surface border border-outline hover:bg-surface-variant transition-colors uppercase tracking-wide',
                )}
              >
                {t('common.cancel', {}, { defaultValue: 'Cancel' })}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  )
}

interface NotifyRowProps {
  cm: ReturnType<typeof getClassMap>
  icon: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
  checked: boolean
  onChange: (next: boolean) => void
  testId: string
  saving: boolean
}

function NotifyRow({
  cm,
  icon,
  titleKey,
  titleDefault,
  bodyKey,
  bodyDefault,
  checked,
  onChange,
  testId,
  saving,
}: NotifyRowProps) {
  const { t } = useTranslation()
  return (
    <li
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'sm' }),
        cm.sp('p', 5),
        'rounded-xl bg-surface border border-outline/40',
      )}
    >
      <span
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          'w-12 h-12 rounded-full bg-primary-container text-primary shrink-0',
        )}
      >
        <span aria-hidden="true" className={cm.cn('material-symbols-outlined')}>
          {icon}
        </span>
      </span>
      <div className={cm.cn(cm.flex({ direction: 'col' }), 'flex-1 min-w-0')}>
        <span className={cm.cn('font-bold text-on-surface')}>
          {t(titleKey, {}, { defaultValue: titleDefault })}
        </span>
        <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(bodyKey, {}, { defaultValue: bodyDefault })}
        </span>
      </div>
      <Switch
        checked={checked}
        onChange={(e) => onChange((e.target as HTMLInputElement).checked)}
        disabled={saving}
        testId={testId}
        aria-label={t(titleKey, {}, { defaultValue: titleDefault })}
      />
    </li>
  )
}
