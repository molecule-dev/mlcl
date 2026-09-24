/**
 * Settings — /settings notification + channel + permissions panels.
 *
 * Pulls live channel/category data from /api/categories. Notification
 * preference toggles and per-channel mute toggles are persisted to
 * localStorage so they survive a page reload — the production-ready
 * gate requires this even though there is no per-user prefs API yet.
 */
import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, Switch, ThemeToggle } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { SettingsPanel } from '../components/SettingsPanel.js'
import { type ApiCategory, categoryColor } from '../lib/announcements.js'

const SECTIONS = [
  {
    id: 'notifications',
    icon: 'notifications',
    labelKey: 'settings.tabNotifications',
    defaultLabel: 'Notifications',
  },
  {
    id: 'channels',
    icon: 'workspaces',
    labelKey: 'settings.tabChannels',
    defaultLabel: 'Channels',
  },
  {
    id: 'language',
    icon: 'language',
    labelKey: 'settings.tabLanguage',
    defaultLabel: 'Language',
  },
  {
    id: 'permissions',
    icon: 'admin_panel_settings',
    labelKey: 'settings.tabPermissions',
    defaultLabel: 'Permissions',
  },
  {
    id: 'account',
    icon: 'manage_accounts',
    labelKey: 'settings.tabAccount',
    defaultLabel: 'Account',
  },
] as const

const NOTIF_PREFS: Array<{
  id: string
  labelKey: string
  defaultLabel: string
  descKey: string
  defaultDesc: string
  defaultOn: boolean
  alwaysOn?: boolean
}> = [
  {
    id: 'urgent',
    labelKey: 'settings.notifUrgent',
    defaultLabel: 'Urgent announcements',
    descKey: 'settings.notifUrgentDesc',
    defaultDesc: 'Push, email, and badge — always on, cannot be muted.',
    defaultOn: true,
    alwaysOn: true,
  },
  {
    id: 'mentions',
    labelKey: 'settings.notifMentions',
    defaultLabel: 'Mentions and replies',
    descKey: 'settings.notifMentionsDesc',
    defaultDesc: 'When someone @-mentions you or replies to your thread.',
    defaultOn: true,
  },
  {
    id: 'channels',
    labelKey: 'settings.notifChannels',
    defaultLabel: 'New posts in channels you follow',
    descKey: 'settings.notifChannelsDesc',
    defaultDesc: 'Once-per-day digest. Override per channel below.',
    defaultOn: true,
  },
  {
    id: 'reminders',
    labelKey: 'settings.notifReminders',
    defaultLabel: 'Acknowledgment reminders',
    descKey: 'settings.notifRemindersDesc',
    defaultDesc: 'Nudge me 24h after an unacked announcement is posted.',
    defaultOn: true,
  },
  {
    id: 'weekly',
    labelKey: 'settings.notifWeekly',
    defaultLabel: 'Weekly digest',
    descKey: 'settings.notifWeeklyDesc',
    defaultDesc: 'Monday 9 AM summary of last week\u2019s announcements.',
    defaultOn: false,
  },
]

const PERMISSIONS: Array<{
  id: string
  labelKey: string
  defaultLabel: string
  descKey: string
  defaultDesc: string
}> = [
  {
    id: 'post-company',
    labelKey: 'settings.permPostCompany',
    defaultLabel: 'Post to #company',
    descKey: 'settings.permPostCompanyDesc',
    defaultDesc: 'Only assigned admins.',
  },
  {
    id: 'pin',
    labelKey: 'settings.permPin',
    defaultLabel: 'Pin announcements',
    descKey: 'settings.permPinDesc',
    defaultDesc: 'Channel managers + admins.',
  },
  {
    id: 'urgent',
    labelKey: 'settings.permUrgent',
    defaultLabel: 'Send urgent announcements',
    descKey: 'settings.permUrgentDesc',
    defaultDesc: 'Admins only. Audited weekly.',
  },
]

const STORAGE_KEY_NOTIF = 'internal-announcements:settings:notif-prefs'
const STORAGE_KEY_MUTES = 'internal-announcements:settings:channel-mutes'

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch (_error) {
    // invalid JSON in storage — fall back to default
    return fallback
  }
}

function writeJSON<T>(key: string, value: T) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch (_error) {
    // storage write failures (quota exceeded, private browsing) are non-fatal
  }
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [section, setSection] = useState<(typeof SECTIONS)[number]['id']>('notifications')
  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>(() =>
    readJSON(STORAGE_KEY_NOTIF, Object.fromEntries(NOTIF_PREFS.map((p) => [p.id, p.defaultOn]))),
  )
  const [channelMutes, setChannelMutes] = useState<Record<string, boolean>>(() =>
    readJSON(STORAGE_KEY_MUTES, {}),
  )

  useEffect(() => {
    let cancelled = false
    http
      .get<ApiCategory[]>('/categories')
      .then((r) => {
        if (cancelled) return
        setCategories(Array.isArray(r.data) ? r.data : [])
      })
      .catch(() => {
        // empty list — show loading-empty state
      })
    return () => {
      cancelled = true
    }
  }, [http])

  // Persist notification prefs whenever they change.
  useEffect(() => {
    writeJSON(STORAGE_KEY_NOTIF, notifPrefs)
  }, [notifPrefs])

  // Persist channel mutes whenever they change.
  useEffect(() => {
    writeJSON(STORAGE_KEY_MUTES, channelMutes)
  }, [channelMutes])

  const channelRows = useMemo(
    () =>
      categories.map((c) => ({
        id: c.id,
        slug: c.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') ?? c.id,
        name: c.name,
        icon: c.icon ?? 'tag',
        color: categoryColor(c),
      })),
    [categories],
  )

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
      <header className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[11px] uppercase tracking-widest text-primary',
          )}
        >
          {t('nav.preferences', {}, { defaultValue: 'Preferences' })}
        </span>
        <h1 className={cm.cn(cm.fontWeight('bold'), 'text-3xl tracking-tight text-on-surface')}>
          {t(
            'settings.title',
            { appName: APP_NAME },
            { defaultValue: 'Tune how {{appName}} talks to you.' },
          )}
        </h1>
      </header>

      <div
        data-testid="settings-tabs"
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          'flex-wrap rounded-full bg-surface-container-low/60 p-1 self-start',
        )}
      >
        {SECTIONS.map((current) => {
          const isActive = current.id === section
          return (
            <button
              key={current.id}
              type="button"
              data-testid={`settings-tab-${current.id}`}
              onClick={() => setSection(current.id)}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                cm.sp('px', 4),
                cm.sp('py', 2),
                'rounded-full transition-colors',
                isActive
                  ? 'bg-surface text-on-surface shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-base')}>{current.icon}</span>
              {t(current.labelKey, {}, { defaultValue: current.defaultLabel })}
            </button>
          )
        })}
      </div>

      {section === 'notifications' && (
        <section
          data-testid="settings-notifications"
          className={cm.cn(
            cm.flex({ direction: 'col' }),
            'rounded-2xl border border-outline-variant/40 bg-surface divide-y divide-outline-variant/30',
          )}
        >
          {NOTIF_PREFS.map((p) => (
            <div
              key={p.id}
              className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), cm.sp('p', 5), 'flex-wrap')}
            >
              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'flex-1 min-w-0')}>
                <span
                  className={cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'), 'text-on-surface')}
                >
                  {t(p.labelKey, {}, { defaultValue: p.defaultLabel })}
                </span>
                <span
                  className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant leading-relaxed')}
                >
                  {t(p.descKey, {}, { defaultValue: p.defaultDesc })}
                </span>
              </div>
              <Switch
                checked={p.alwaysOn ? true : (notifPrefs[p.id] ?? false)}
                disabled={p.alwaysOn}
                testId={`settings-notif-${p.id}`}
                onChange={(e) =>
                  setNotifPrefs((prev) => ({
                    ...prev,
                    [p.id]: (e.target as HTMLInputElement).checked,
                  }))
                }
              />
            </div>
          ))}
        </section>
      )}

      {section === 'channels' && (
        <section
          data-testid="settings-channels"
          className={cm.cn(
            cm.flex({ direction: 'col' }),
            'rounded-2xl border border-outline-variant/40 bg-surface divide-y divide-outline-variant/30',
          )}
        >
          {channelRows.length === 0 ? (
            <p className={cm.cn(cm.sp('p', 5), cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'settings.noChannels',
                {},
                { defaultValue: 'No channels yet — Composer will seed defaults.' },
              )}
            </p>
          ) : (
            channelRows.map((c) => (
              <div
                key={c.id}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'md' }),
                  cm.sp('p', 5),
                  'flex-wrap',
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(10),
                    cm.h(10),
                    cm.roundedFull,
                    'shrink-0',
                  )}
                  style={{ backgroundColor: `${c.color}1f`, color: c.color }}
                  aria-hidden="true"
                >
                  <span className={cm.cn('material-symbols-outlined text-lg')}>{c.icon}</span>
                </span>
                <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'flex-1 min-w-0')}>
                  <span
                    className={cm.cn(
                      cm.fontWeight('semibold'),
                      cm.textSize('sm'),
                      'text-on-surface',
                    )}
                  >
                    #{c.name}
                  </span>
                  <span
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      'text-[10px] uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {channelMutes[c.id]
                      ? t('settings.channelMuted', {}, { defaultValue: 'Muted' })
                      : t('common.following', {}, { defaultValue: 'Following' })}
                  </span>
                </div>
                <Switch
                  checked={!channelMutes[c.id]}
                  testId={`settings-channel-${c.slug}`}
                  onChange={(e) =>
                    setChannelMutes((prev) => ({
                      ...prev,
                      [c.id]: !(e.target as HTMLInputElement).checked,
                    }))
                  }
                />
              </div>
            ))
          )}
        </section>
      )}

      {section === 'language' && (
        <section
          data-testid="settings-language"
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'md' }),
            cm.sp('p', 5),
            'rounded-2xl border border-outline-variant/40 bg-surface',
          )}
        >
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
            <h2 className={cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'), 'text-on-surface')}>
              {t('footer.language', {}, { defaultValue: 'Language' })}
            </h2>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant leading-relaxed')}>
              {t(
                'common.chooseTheLanguage',
                {},
                { defaultValue: 'Choose the language used throughout the app.' },
              )}
            </p>
          </div>
          <LanguagePicker />
        </section>
      )}

      {section === 'account' && (
        <section
          data-testid="settings-account"
          className={cm.cn(
            cm.flex({ direction: 'col' }),
            'rounded-2xl border border-outline-variant/40 bg-surface',
          )}
        >
          {/* SettingsPanel is the canonical email/password/2fa/devices/billing
              UI; it was previously only reachable from /pricing's user menu.
              Embedding it here means the same surface is accessible from the
              authed app's main /settings route too. The onClose prop is a
              no-op because there's no modal to dismiss on this page. */}
          <SettingsPanel onClose={() => undefined} />
        </section>
      )}

      {section === 'permissions' && (
        <section
          data-testid="settings-permissions"
          className={cm.cn(
            cm.flex({ direction: 'col' }),
            'rounded-2xl border border-outline-variant/40 bg-surface divide-y divide-outline-variant/30',
          )}
        >
          {PERMISSIONS.map((p) => (
            <div
              key={p.id}
              className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), cm.sp('p', 5), 'flex-wrap')}
            >
              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'flex-1 min-w-0')}>
                <span
                  className={cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'), 'text-on-surface')}
                >
                  {t(p.labelKey, {}, { defaultValue: p.defaultLabel })}
                </span>
                <span
                  className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant leading-relaxed')}
                >
                  {t(p.descKey, {}, { defaultValue: p.defaultDesc })}
                </span>
              </div>
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  'rounded-full text-[10px] uppercase tracking-widest',
                )}
                style={{
                  backgroundColor:
                    'var(--color-priority-fyi-light, var(--color-priority-fyi-light))',
                  color: 'var(--color-priority-fyi, var(--mol-color-text-secondary))',
                }}
              >
                {t('settings.adminOnly', {}, { defaultValue: 'Admin only' })}
              </span>
            </div>
          ))}
        </section>
      )}
      <section
        data-testid="settings-appearance"
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'md' }),
          cm.sp('p', 5),
          'rounded-2xl border border-outline-variant/40 bg-surface flex-wrap',
        )}
      >
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'flex-1 min-w-0')}>
          <h2 className={cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'), 'text-on-surface')}>
            {t('settings.appearance.title', {}, { defaultValue: 'Appearance' })}
          </h2>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant leading-relaxed')}>
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
