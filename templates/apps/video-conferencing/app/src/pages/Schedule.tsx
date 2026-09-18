import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { MeetingCard, type MeetingCardStatus } from '../components/MeetingCard.js'

interface ApiMeeting {
  id: string
  title: string
  starts_at?: string | null
  ends_at?: string | null
  status?: string
  is_recurring?: boolean
}

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function unwrap<T>(value: unknown, fallback: T): T {
  let current: unknown = value
  for (let i = 0; i < 3; i++) {
    if (Array.isArray(current)) return current as T
    if (current && typeof current === 'object' && 'data' in current) {
      current = (current as { data: unknown }).data
      continue
    }
    break
  }
  return Array.isArray(current) ? (current as T) : fallback
}

function dayLabelFromIso(iso?: string | null): string {
  if (!iso) return 'Unscheduled'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Unscheduled'
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: '2-digit' })
}

function timeLabelFromIso(iso?: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function durationFromIso(start?: string | null, end?: string | null): number | undefined {
  if (!start || !end) return undefined
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (Number.isNaN(ms) || ms <= 0) return undefined
  return Math.round(ms / 60_000)
}

function defaultStartIso(): string {
  const next = new Date(Date.now() + 30 * 60_000)
  next.setSeconds(0, 0)
  next.setMinutes(Math.ceil(next.getMinutes() / 15) * 15)
  const tzOffset = next.getTimezoneOffset() * 60_000
  return new Date(next.getTime() - tzOffset).toISOString().slice(0, 16)
}

const DURATION_OPTIONS = [15, 30, 45, 60, 90]

export function Schedule() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [meetings, setMeetings] = useState<ApiMeeting[]>([])
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming')
  const [showCreate, setShowCreate] = useState(false)
  const [createTitle, setCreateTitle] = useState('')
  const [createStart, setCreateStart] = useState(defaultStartIso())
  const [createDuration, setCreateDuration] = useState(30)
  const [createInvites, setCreateInvites] = useState('')
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const loadMeetings = useCallback(() => {
    http
      .get('/api/meetings')
      .then((res) => setMeetings(unwrap<ApiMeeting[]>(res, [])))
      .catch(() => undefined)
  }, [http])

  useEffect(() => {
    loadMeetings()
  }, [loadMeetings])

  const filteredMeetings = useMemo(() => {
    const now = Date.now()
    return meetings.filter((m) => {
      if (!m.starts_at) return filter === 'upcoming'
      const ts = new Date(m.starts_at).getTime()
      return filter === 'upcoming' ? ts >= now - 30 * 60_000 : ts < now - 30 * 60_000
    })
  }, [meetings, filter])

  const grouped = useMemo(() => {
    const groups = new Map<string, ApiMeeting[]>()
    for (const m of filteredMeetings) {
      const key = dayLabelFromIso(m.starts_at)
      const current = groups.get(key) ?? []
      current.push(m)
      groups.set(key, current)
    }
    return Array.from(groups.entries())
  }, [filteredMeetings])

  const submitCreate = useCallback(async () => {
    setCreateError(null)
    if (!createTitle.trim()) {
      setCreateError(t('schedule.titleRequired', {}, { defaultValue: 'Title is required' }))
      return
    }
    if (!createStart) {
      setCreateError(t('schedule.startRequired', {}, { defaultValue: 'Start time is required' }))
      return
    }
    setCreateSubmitting(true)
    try {
      const startsAt = new Date(createStart)
      if (Number.isNaN(startsAt.getTime())) {
        setCreateError(t('schedule.invalidStart', {}, { defaultValue: 'Invalid start time' }))
        setCreateSubmitting(false)
        return
      }
      const endsAt = new Date(startsAt.getTime() + createDuration * 60_000)
      const inviteEmails = createInvites
        .split(/[\s,;]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
      const res = (await http.post('/api/meetings', {
        title: createTitle.trim(),
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        invite_emails: inviteEmails.length ? inviteEmails : undefined,
      })) as { id?: string } | { data?: { id?: string } }
      const id = (res as { id?: string })?.id ?? (res as { data?: { id?: string } })?.data?.id
      setShowCreate(false)
      setCreateTitle('')
      setCreateInvites('')
      setCreateStart(defaultStartIso())
      setCreateDuration(30)
      loadMeetings()
      if (id) navigate(`/meeting/${id}/details`)
    } catch (err) {
      setCreateError(
        err instanceof Error
          ? err.message
          : t('schedule.createFailed', {}, { defaultValue: 'Failed to create meeting' }),
      )
    } finally {
      setCreateSubmitting(false)
    }
  }, [createDuration, createInvites, createStart, createTitle, http, loadMeetings, navigate, t])

  return (
    <div className={cm.stack(8)}>
      <header
        className={cm.cn(cm.flex({ align: 'start', justify: 'between', gap: 6 }), 'flex-wrap')}
      >
        <div className={cm.stack(2)}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-primary',
            )}
          >
            {t('status.thisWeek', {}, { defaultValue: 'This week' })}
          </span>
          <h1 className={cm.cn('text-4xl font-extrabold tracking-tight text-on-surface')}>
            {t('nav.schedule', {}, { defaultValue: 'Schedule' })}
          </h1>
          <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant')}>
            {t(
              'schedule.subtitle',
              {},
              { defaultValue: 'Plan, invite, and run meetings without the calendar tab-juggle.' },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setCreateError(null)
            setShowCreate(true)
          }}
          data-testid="open-create-meeting"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 2 }),
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.roundedFull,
            'bg-gradient-to-r from-primary to-secondary text-on-primary shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/45 transition-all',
          )}
        >
          <span className={'material-symbols-outlined text-lg'}>add</span>
          {t('schedule.newMeeting', {}, { defaultValue: 'New meeting' })}
        </button>
      </header>

      <section
        className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl shadow-sm')}
      >
        <div className={cm.cn(cm.flex({ justify: 'between' }), cm.sp('mb', 4))}>
          {DAYS_OF_WEEK.map((day, i) => {
            const date = new Date()
            date.setDate(date.getDate() + i)
            const isToday = i === 0
            return (
              <div key={day} className={cm.cn(cm.textCenter, cm.flex1)}>
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {day}
                </p>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.mxAuto,
                    cm.sp('mt', 2),
                    'w-10 h-10 rounded-full text-base font-bold transition-colors',
                    isToday
                      ? 'bg-primary text-on-primary shadow-lg shadow-primary/30'
                      : 'text-on-surface hover:bg-surface-container',
                  )}
                >
                  {date.getDate()}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <div className={cm.flex({ gap: 2 })}>
        {(['upcoming', 'past'] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setFilter(option)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              cm.roundedFull,
              'transition-colors',
              filter === option
                ? 'bg-primary text-on-primary shadow-md shadow-primary/25'
                : 'bg-surface-container text-on-surface-variant hover:text-on-surface',
            )}
          >
            {option === 'upcoming'
              ? t('status.upcoming', {}, { defaultValue: 'Upcoming' })
              : t('schedule.past', {}, { defaultValue: 'Past' })}
          </button>
        ))}
      </div>

      <section className={cm.stack(8)}>
        {filteredMeetings.length === 0 ? (
          <div data-testid="no-meetings" className={cm.cn(cm.textCenter, cm.sp('py', 12))}>
            <span className="material-symbols-outlined text-5xl text-on-surface-variant/40">
              event_busy
            </span>
            <p className={cm.cn(cm.sp('mt', 3), cm.textSize('base'), 'text-on-surface-variant')}>
              {filter === 'upcoming'
                ? t('schedule.noUpcoming', {}, { defaultValue: 'No upcoming meetings.' })
                : t('schedule.noPast', {}, { defaultValue: 'No past meetings.' })}
            </p>
          </div>
        ) : (
          grouped.map(([day, items]) => (
            <div key={day} className={cm.stack(3)}>
              <h2
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {day}
              </h2>
              <div className={cm.stack(3)}>
                {items.map((m) => (
                  <MeetingCard
                    key={m.id}
                    id={m.id}
                    title={m.title}
                    timeLabel={timeLabelFromIso(m.starts_at)}
                    durationLabel={
                      durationFromIso(m.starts_at, m.ends_at)
                        ? `${durationFromIso(m.starts_at, m.ends_at)} min`
                        : undefined
                    }
                    attendees={[]}
                    status={
                      (m.is_recurring
                        ? 'recurring'
                        : ((m.status as MeetingCardStatus | undefined) ??
                          'upcoming')) as MeetingCardStatus
                    }
                    onPrimary={() => navigate(`/meeting/${m.id}/lobby`)}
                    onSecondary={() => navigate(`/meeting/${m.id}/details`)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      {showCreate && (
        <div
          role="dialog"
          aria-modal="true"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'fixed inset-0 z-50 bg-black/40 p-4',
          )}
        >
          <div
            data-testid="create-meeting-form"
            className={cm.cn(
              cm.sp('p', 6),
              cm.stack(4),
              'bg-surface rounded-2xl shadow-2xl w-full max-w-md',
            )}
          >
            <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
              {t('schedule.newMeeting', {}, { defaultValue: 'New meeting' })}
            </h2>
            <label className={cm.stack(1)}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('form.title', {}, { defaultValue: 'Title' })}
              </span>
              <input
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                aria-label="Meeting title"
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'rounded-lg bg-surface-container border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none',
                )}
              />
            </label>
            <label className={cm.stack(1)}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('schedule.fieldStart', {}, { defaultValue: 'Starts at' })}
              </span>
              <input
                type="datetime-local"
                value={createStart}
                onChange={(e) => setCreateStart(e.target.value)}
                aria-label="Meeting starts at"
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'rounded-lg bg-surface-container border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none',
                )}
              />
            </label>
            <label className={cm.stack(1)}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('form.duration', {}, { defaultValue: 'Duration' })}
              </span>
              <select
                value={createDuration}
                onChange={(e) => setCreateDuration(Number(e.target.value))}
                aria-label="Meeting duration"
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'rounded-lg bg-surface-container border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none',
                )}
              >
                {DURATION_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d} min
                  </option>
                ))}
              </select>
            </label>
            <label className={cm.stack(1)}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t(
                  'schedule.fieldInvites',
                  {},
                  { defaultValue: 'Invite emails (comma-separated)' },
                )}
              </span>
              <input
                value={createInvites}
                onChange={(e) => setCreateInvites(e.target.value)}
                aria-label="Invite emails"
                placeholder="alice@example.com, bob@example.com"
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'rounded-lg bg-surface-container border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none',
                )}
              />
            </label>
            {createError && (
              <p role="alert" className={cm.cn(cm.textSize('sm'), 'text-error')}>
                {createError}
              </p>
            )}
            <div className={cm.cn(cm.flex({ justify: 'end', gap: 2 }))}>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  cm.roundedFull,
                  'bg-surface-container text-on-surface hover:bg-surface-container-high',
                )}
              >
                {t('common.cancel', {}, { defaultValue: 'Cancel' })}
              </button>
              <button
                type="button"
                disabled={createSubmitting}
                onClick={submitCreate}
                data-testid="submit-create-meeting"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  cm.roundedFull,
                  'bg-primary text-on-primary hover:bg-primary-dark disabled:opacity-50',
                )}
              >
                {createSubmitting
                  ? t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })
                  : t('common.create', {}, { defaultValue: 'Create' })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
