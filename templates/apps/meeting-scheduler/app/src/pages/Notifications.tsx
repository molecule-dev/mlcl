/**
 * Notifications — recent activity feed (derived from real bookings)
 * plus persisted channel + reminder preferences via /api/profile/me.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'

import type { TranslateFunction } from '@molecule/app-i18n'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface ApiBooking {
  id: string
  invitee_name: string
  start_at: string
  end_at: string
  status: string
  created_at: string
  updated_at: string
}

interface ProfileResponse {
  user: {
    id: string
    name: string
    email: string
    preferences?: NotificationPrefs
  }
}

interface NotificationPrefs {
  emailConfirmations?: boolean
  emailReminders?: boolean
  pushNotifications?: boolean
  smsReminders?: boolean
  reminderPresets?: string[]
}

interface FeedItem {
  id: string
  icon: string
  iconClass: string
  title: string
  body: string
  time: string
}

const CHANNELS = [
  { key: 'emailConfirmations', label: 'Email confirmations' },
  { key: 'emailReminders', label: 'Email reminders' },
  { key: 'pushNotifications', label: 'Push notifications' },
  { key: 'smsReminders', label: 'SMS reminders (Pro)' },
] as const

const REMINDER_PRESETS = ['5 min', '15 min', '30 min', '1 hour'] as const

const DEFAULT_PREFS: NotificationPrefs = {
  emailConfirmations: true,
  emailReminders: true,
  pushNotifications: true,
  smsReminders: false,
  reminderPresets: ['15 min'],
}

function relTime(t: TranslateFunction, d: Date) {
  const diff = Math.max(0, Date.now() - d.getTime())
  const min = Math.floor(diff / 60000)
  if (min < 1) return t('common.justNow', {}, { defaultValue: 'just now' })
  if (min < 60)
    return t('notifications.time.minAgo', { count: min }, { defaultValue: '{{count}} min ago' })
  const hr = Math.floor(min / 60)
  if (hr < 24)
    return t('notifications.time.hrAgo', { count: hr }, { defaultValue: '{{count}} hr ago' })
  const day = Math.floor(hr / 24)
  if (day === 1) return t('notifications.time.yesterday', {}, { defaultValue: 'Yesterday' })
  return t('notifications.time.daysAgo', { count: day }, { defaultValue: '{{count}}d ago' })
}

function deriveFeed(t: TranslateFunction, bookings: ApiBooking[]): FeedItem[] {
  return bookings
    .slice()
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 12)
    .map((b) => {
      const updated = new Date(b.updated_at)
      const created = new Date(b.created_at)
      const isUpdate = b.status === 'cancelled' || updated.getTime() - created.getTime() > 5_000
      const start = new Date(b.start_at)
      const startLabel = start.toLocaleString(undefined, {
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit',
      })
      if (b.status === 'cancelled') {
        return {
          id: b.id,
          icon: 'event_busy',
          iconClass: 'bg-rose-500/10 text-error',
          title: t(
            'notifications.feed.cancelledTitle',
            { name: b.invitee_name },
            { defaultValue: '{{name}} cancelled' },
          ),
          body: t(
            'notifications.feed.cancelledBody',
            { when: startLabel },
            { defaultValue: 'Originally for {{when}}' },
          ),
          time: relTime(t, updated),
        }
      }
      if (isUpdate) {
        return {
          id: b.id,
          icon: 'edit_calendar',
          iconClass: 'bg-amber-500/10 text-warning',
          title: t(
            'notifications.feed.updatedTitle',
            { name: b.invitee_name },
            { defaultValue: '{{name}} updated' },
          ),
          body: t(
            'notifications.feed.updatedBody',
            { when: startLabel },
            { defaultValue: 'Now {{when}}' },
          ),
          time: relTime(t, updated),
        }
      }
      return {
        id: b.id,
        icon: 'event_available',
        iconClass: 'bg-emerald-500/10 text-success',
        title: t(
          'notifications.feed.bookedTitle',
          { name: b.invitee_name },
          { defaultValue: '{{name}} booked a meeting' },
        ),
        body: t(
          'notifications.feed.bookedBody',
          { when: startLabel },
          { defaultValue: 'Scheduled for {{when}}' },
        ),
        time: relTime(t, created),
      }
    })
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [bookings, setBookings] = useState<ApiBooking[]>([])
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      http.get('/api/bookings').then((res) => unwrapList<ApiBooking>(res)),
      http.get('/api/profile/me').then((res) => unwrapSingle<ProfileResponse>(res)),
    ])
      .then(([bookingList, profile]) => {
        if (cancelled) return
        setBookings(bookingList)
        const merged = { ...DEFAULT_PREFS, ...(profile?.user?.preferences ?? {}) }
        setPrefs(merged)
      })
      .catch(() => {
        if (cancelled) return
        setError(
          t('nav.couldNotLoadNotifications', {}, { defaultValue: 'Could not load notifications.' }),
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const feed = useMemo(() => deriveFeed(t, bookings), [t, bookings])

  const persistPrefs = useCallback(
    async (next: NotificationPrefs) => {
      setPrefs(next)
      setSaving(true)
      setError(null)
      try {
        // PATCH replaces the whole preferences object — merge over the
        // stored one so keys owned by other pages (integrations, booking
        // defaults) survive.
        const profileRes = await http.get('/api/profile/me')
        const profile = unwrapSingle<ProfileResponse>(profileRes)
        const prevPrefs = (profile?.user?.preferences ?? {}) as Record<string, unknown>
        await http.patch('/api/profile/me', { preferences: { ...prevPrefs, ...next } })
      } catch (error) {
        logError('notifications.savePrefs', error)
        setError(t('notifications.saveError', {}, { defaultValue: 'Could not save preferences.' }))
      } finally {
        setSaving(false)
      }
    },
    [http, t],
  )

  const reminders = new Set(prefs.reminderPresets ?? [])

  return (
    <div className={cm.cn(cm.stack(8), cm.sp('p', 8), 'max-w-[1200px] mx-auto')}>
      <header className={cm.stack(2)}>
        <p className={cm.cn(cm.textSize('xs'), 'font-bold uppercase tracking-widest text-primary')}>
          {t('nav.activity', {}, { defaultValue: 'Activity' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
          {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
        </h1>
        {saving ? (
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })}
          </p>
        ) : null}
        {error ? (
          <p
            role="alert"
            data-testid="notifications-error"
            className={cm.cn(cm.textSize('sm'), 'text-error font-semibold')}
          >
            {error}
          </p>
        ) : null}
      </header>

      <section className={cm.cn(cm.grid({ gap: 'xl' }), 'grid-cols-1 lg:grid-cols-12 items-start')}>
        <div
          data-testid="notifications-feed"
          className={cm.cn(
            cm.sp('p', 6),
            cm.stack(5),
            'lg:col-span-8 bg-surface-container-lowest rounded-3xl shadow-sm',
          )}
        >
          <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight')}>
            {t('nav.recentActivity', {}, { defaultValue: 'Recent activity' })}
          </h2>
          {loading ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('nav.loadingActivity', {}, { defaultValue: 'Loading activity…' })}
            </p>
          ) : feed.length === 0 ? (
            <p
              data-testid="notifications-empty"
              className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
            >
              {t(
                'notifications.empty',
                {},
                {
                  defaultValue:
                    'Nothing happening yet — share a booking link to start receiving meetings.',
                },
              )}
            </p>
          ) : (
            <ul
              className={cm.cn(
                cm.stack(0),
                'relative before:absolute before:left-[1.25rem] before:top-2 before:bottom-2 before:w-px before:bg-outline-variant/30',
              )}
            >
              {feed.map((item) => (
                <li
                  key={item.id}
                  data-testid={`notifications-item-${item.id}`}
                  className={cm.cn(
                    cm.flex({ align: 'start', gap: 'md' }),
                    cm.sp('py', 4),
                    'relative',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.w(10),
                      cm.h(10),
                      cm.roundedFull,
                      cm.flex({ align: 'center', justify: 'center' }),
                      'shrink-0 z-10 shadow-sm',
                      item.iconClass,
                    )}
                  >
                    <span
                      className={'material-symbols-outlined text-base'}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                      aria-hidden="true"
                    >
                      {item.icon}
                    </span>
                  </span>
                  <div className={cm.flex1}>
                    <p
                      className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'), 'text-on-surface')}
                    >
                      {item.title}
                    </p>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {item.body}
                    </p>
                    <p
                      className={cm.cn(
                        'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mt-1',
                      )}
                    >
                      {item.time}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside
          className={cm.cn(
            cm.stack(6),
            cm.sp('p', 6),
            'lg:col-span-4 bg-surface-container-lowest rounded-3xl shadow-sm',
          )}
        >
          <div className={cm.stack(3)}>
            <h3
              className={cm.cn(
                cm.textSize('sm'),
                'font-bold uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('notifications.channels', {}, { defaultValue: 'Channels' })}
            </h3>
            {CHANNELS.map((c) => {
              const on = Boolean(prefs[c.key])
              return (
                <button
                  key={c.key}
                  type="button"
                  aria-pressed={on}
                  data-testid={`notifications-channel-${c.key}`}
                  onClick={() => persistPrefs({ ...prefs, [c.key]: !on })}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('p', 3),
                    cm.w('full'),
                    'gap-3 bg-surface rounded-xl border border-outline-variant text-left hover:border-primary/40 transition-colors',
                  )}
                >
                  <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                    {t(`notifications.channel.${c.key}`, {}, { defaultValue: c.label })}
                  </span>
                  <span
                    className={cm.cn(
                      cm.w(10),
                      'h-6 rounded-full relative transition-colors',
                      on ? 'bg-primary' : 'bg-outline-variant',
                    )}
                  >
                    <span
                      className={cm.cn(
                        cm.w(5),
                        cm.h(5),
                        cm.roundedFull,
                        'absolute top-0.5 bg-surface shadow-sm transition-transform',
                        on ? 'translate-x-4' : 'translate-x-0.5',
                      )}
                    />
                  </span>
                </button>
              )
            })}
          </div>

          <div className={cm.stack(3)}>
            <h3
              className={cm.cn(
                cm.textSize('sm'),
                'font-bold uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('notifications.reminders', {}, { defaultValue: 'Reminders' })}
            </h3>
            <div className={cm.cn(cm.flex({ wrap: 'wrap' }), 'gap-2')}>
              {REMINDER_PRESETS.map((p) => {
                const active = reminders.has(p)
                return (
                  <button
                    key={p}
                    type="button"
                    aria-pressed={active}
                    data-testid={`notifications-reminder-${p.replace(/\s+/g, '-')}`}
                    onClick={() => {
                      const next = new Set(reminders)
                      if (next.has(p)) next.delete(p)
                      else next.add(p)
                      persistPrefs({ ...prefs, reminderPresets: Array.from(next) })
                    }}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      cm.fontWeight('bold'),
                      cm.textSize('xs'),
                      cm.roundedFull,
                      'uppercase tracking-widest border transition-colors',
                      active
                        ? 'bg-primary text-on-primary border-primary shadow-sm'
                        : 'bg-surface text-on-surface-variant border-outline-variant hover:bg-surface-container-low',
                    )}
                  >
                    {t(`notifications.preset.${p.replace(/\s+/g, '-')}`, {}, { defaultValue: p })}
                  </button>
                )
              })}
            </div>
          </div>
        </aside>
      </section>
    </div>
  )
}

export default Notifications
