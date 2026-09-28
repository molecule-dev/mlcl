import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { unwrapList } from '../lib/unwrap.js'

interface Meeting {
  id: string
  title: string
  recorded_at: string
  duration_minutes: number
  attendee_initials: string[]
  primary_speaker: number // 1-5
  ai_summary: string
  action_count: number
  unread: boolean
}

const SPEAKER_COLOR: Record<number, string> = {
  1: 'var(--color-speaker-1)',
  2: 'var(--color-speaker-2)',
  3: 'var(--color-speaker-3)',
  4: 'var(--color-speaker-4)',
  5: 'var(--color-speaker-5)',
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function fmtRelative(iso: string, t: ReturnType<typeof useTranslation>['t']): string {
  const ms = Date.now() - new Date(iso).getTime()
  const h = Math.floor(ms / (1000 * 60 * 60))
  if (h < 1) return t('common.justNow', {}, { defaultValue: 'just now' })
  if (h < 24) return t('common.hoursAgo', { count: h }, { defaultValue: '{{count}}h ago' })
  const d = Math.floor(h / 24)
  if (d < 7) return t('common.daysAgo', { count: d }, { defaultValue: '{{count}}d ago' })
  return fmtDate(iso)
}

function fmtDuration(min: number): string {
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${h}h ${m.toString().padStart(2, '0')}m`
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/meetings')
      .then((res) => {
        if (!cancelled) setMeetings(unwrapList<Meeting>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('dashboard.loadError', {}, { defaultValue: 'Failed to load dashboard.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const stats = useMemo(() => {
    const totalMin = meetings.reduce((sum, m) => sum + m.duration_minutes, 0)
    const totalActions = meetings.reduce((sum, m) => sum + m.action_count, 0)
    const unread = meetings.filter((m) => m.unread).length
    return {
      meetingCount: meetings.length,
      hours: (totalMin / 60).toFixed(1),
      actions: totalActions,
      unread,
    }
  }, [meetings])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.stack(6))}>
      <header
        className={cm.cn(
          'relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-lg',
          cm.sp('p', 8),
        )}
      >
        <span
          aria-hidden="true"
          className={cm.cn(
            'absolute -right-20 -bottom-24 h-72 w-72 bg-surface/15 blur-3xl pointer-events-none',
            cm.roundedFull,
          )}
        />
        <span
          aria-hidden="true"
          className={cm.cn(
            'absolute -left-12 -top-12 h-44 w-44 bg-surface/10 blur-3xl pointer-events-none',
            cm.roundedFull,
          )}
        />

        <div
          className={cm.cn(
            'relative z-10',
            cm.flex({ align: 'start', justify: 'between', gap: 'md', wrap: 'wrap' }),
          )}
        >
          <div className={cm.cn('min-w-0', cm.stack(2))}>
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'self-start uppercase tracking-widest opacity-80',
              )}
            >
              <span
                aria-hidden="true"
                className={cm.cn('material-symbols-outlined')}
                style={{ fontSize: 14 }}
              >
                graphic_eq
              </span>
              {t('dashboard.eyebrow', {}, { defaultValue: 'Your meeting feed' })}
            </span>
            <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
              {t('auth.login.signInTitle', {}, { defaultValue: 'Welcome back' })}
            </h1>
            <p className={cm.cn(cm.textSize('sm'), 'opacity-90 max-w-xl')}>
              {t(
                'dashboard.subheading',
                { count: stats.unread, appName: APP_NAME },
                {
                  defaultValue:
                    '{{count}} unread summaries since you last checked. {{appName}} captured every word — here is the recap.',
                },
              )}
            </p>
          </div>
          <Link
            to="/record"
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-full bg-surface-container-lowest text-primary hover:bg-surface-container-low transition-colors shadow-md',
            )}
          >
            <span
              aria-hidden="true"
              className={cm.cn('material-symbols-outlined')}
              style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}
            >
              mic
            </span>
            {t('dashboard.recordCta', {}, { defaultValue: 'Record meeting' })}
          </Link>
        </div>

        <dl className={cm.cn('relative z-10', cm.sp('mt', 8), cm.grid({ cols: 4, gap: 'md' }))}>
          <StatTile
            label={t('dashboard.stat.meetings', {}, { defaultValue: 'Meetings' })}
            value={String(stats.meetingCount)}
            icon="event_note"
          />
          <StatTile
            label={t('dashboard.stat.hours', {}, { defaultValue: 'Hours captured' })}
            value={stats.hours}
            icon="schedule"
          />
          <StatTile
            label={t('dashboard.stat.actions', {}, { defaultValue: 'Action items' })}
            value={String(stats.actions)}
            icon="task_alt"
          />
          <StatTile
            label={t('dashboard.stat.unread', {}, { defaultValue: 'New summaries' })}
            value={String(stats.unread)}
            icon="auto_awesome"
          />
        </dl>
      </header>

      <section
        className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' }))}
      >
        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
          {t('dashboard.recentHeading', {}, { defaultValue: 'Recent meetings' })}
        </h2>
        <Link
          to="/calendar"
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            cm.textPrimary,
            'hover:underline',
          )}
        >
          {t('dashboard.viewCalendar', {}, { defaultValue: 'View calendar →' })}
        </Link>
      </section>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : meetings.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className={cm.cn(cm.grid({ cols: 2, gap: 'md' }))}>
          {meetings.map((m) => (
            <li
              key={m.id}
              className={cm.cn(
                cm.card(),
                'overflow-hidden hover:-translate-y-0.5 hover:shadow-md transition-all',
              )}
            >
              <Link
                to={`/meetings/${m.id}`}
                className={cm.cn(
                  'block',
                  cm.sp('p', 5),
                  cm.stack(3),
                  cm.accentCard({ tone: 'custom' }),
                )}
                style={{ ['--mol-accent' as string]: SPEAKER_COLOR[m.primary_speaker] }}
              >
                <header
                  className={cm.cn(cm.flex({ align: 'start', justify: 'between', gap: 'sm' }))}
                >
                  <div className={cm.cn('min-w-0', cm.stack(1))}>
                    <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'truncate')}>
                      {m.title}
                    </h3>
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        'text-on-surface-variant font-mono tabular-nums',
                      )}
                    >
                      {fmtRelative(m.recorded_at, t)} · {fmtDuration(m.duration_minutes)}
                    </p>
                  </div>
                  {m.unread ? (
                    <span
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.sp('py', 1),
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        'uppercase tracking-widest rounded-full bg-primary/10 text-primary',
                      )}
                    >
                      {t('status.new', {}, { defaultValue: 'New' })}
                    </span>
                  ) : null}
                </header>

                <div
                  className={cm.cn(
                    cm.sp('p', 3),
                    cm.flex({ align: 'start', gap: 'sm' }),
                    'rounded-xl bg-secondary-container/20',
                    cm.accentCard({ tone: 'custom' }),
                  )}
                  style={{ ['--mol-accent' as string]: 'var(--color-secondary)' }}
                >
                  <span
                    aria-hidden="true"
                    className={cm.cn('material-symbols-outlined text-secondary', cm.shrink0)}
                    style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}
                  >
                    auto_awesome
                  </span>
                  <p className={cm.cn(cm.textSize('sm'), 'line-clamp-2 text-on-surface')}>
                    {m.ai_summary}
                  </p>
                </div>

                <footer
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.textSize('xs'),
                  )}
                >
                  <div className={cm.cn(cm.flex({ align: 'center' }), '-space-x-2')}>
                    {m.attendee_initials.slice(0, 5).map((init, i) => (
                      <span
                        key={`${init}-${i}`}
                        className={cm.cn(
                          'h-7 w-7 grid place-items-center text-on-primary',
                          cm.roundedFull,
                          cm.textSize('xs'),
                          cm.fontWeight('bold'),
                          'ring-2 ring-surface-container-lowest',
                        )}
                        style={{
                          backgroundColor: `var(--color-speaker-${(i % 5) + 1})`,
                        }}
                      >
                        {init}
                      </span>
                    ))}
                    {m.attendee_initials.length > 5 ? (
                      <span
                        className={cm.cn(
                          'h-7 w-7 grid place-items-center',
                          cm.roundedFull,
                          cm.textSize('xs'),
                          cm.fontWeight('bold'),
                          'bg-surface-container text-on-surface-variant ring-2 ring-surface-container-lowest',
                        )}
                      >
                        +{m.attendee_initials.length - 5}
                      </span>
                    ) : null}
                  </div>
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'sm' }),
                      cm.fontWeight('medium'),
                      m.action_count > 0 ? cm.textPrimary : 'text-on-surface-variant',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cm.cn('material-symbols-outlined')}
                      style={{ fontSize: 14 }}
                    >
                      task_alt
                    </span>
                    {m.action_count > 0
                      ? t(
                          'dashboard.actionCount',
                          { count: m.action_count },
                          { defaultValue: '{{count}} action items' },
                        )
                      : t('dashboard.noActions', {}, { defaultValue: 'No actions' })}
                  </span>
                </footer>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function StatTile({ label, value, icon }: { label: string; value: string; icon: string }) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 4),
        cm.stack(1),
        'rounded-xl bg-surface/10 backdrop-blur border border-surface/10',
      )}
    >
      <dt
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.textSize('xs'),
          cm.fontWeight('semibold'),
          'uppercase tracking-widest opacity-80',
        )}
      >
        <span
          aria-hidden="true"
          className={cm.cn('material-symbols-outlined')}
          style={{ fontSize: 14 }}
        >
          {icon}
        </span>
        {label}
      </dt>
      <dd
        className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight tabular-nums')}
      >
        {value}
      </dd>
    </div>
  )
}

function EmptyState() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.card(),
        cm.sp('py', 16),
        cm.sp('px', 8),
        cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 'md' }),
        cm.textCenter,
      )}
    >
      <span
        aria-hidden="true"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.roundedFull,
          'h-16 w-16 bg-primary/10',
        )}
      >
        <span className={cm.cn('material-symbols-outlined text-primary')} style={{ fontSize: 28 }}>
          mic_none
        </span>
      </span>
      <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
        {t('dashboard.empty.heading', {}, { defaultValue: 'No meetings yet' })}
      </p>
      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-sm')}>
        {t(
          'dashboard.empty.body',
          { appName: APP_NAME },
          {
            defaultValue:
              'Start a recording or connect Google Calendar so {{appName}} joins your next meeting automatically.',
          },
        )}
      </p>
      <Link
        to="/record"
        className={cm.cn(
          cm.sp('px', 5),
          cm.sp('py', 3),
          cm.fontWeight('semibold'),
          cm.textSize('sm'),
          'rounded-full bg-primary text-on-primary hover:opacity-90 transition-opacity',
        )}
      >
        {t('dashboard.empty.cta', {}, { defaultValue: 'Start recording' })}
      </Link>
    </div>
  )
}
