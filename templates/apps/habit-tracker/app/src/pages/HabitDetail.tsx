import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Habit {
  id: string
  name: string
  emoji: string
  description: string
  category: string
  cadence: 'daily' | 'weekly'
  current_streak: number
  longest_streak: number
  total_completions: number
  completed_today: boolean
  reminder_time: string | null
  created_at: string
}

interface Completion {
  id: string
  habit_id: string
  completed_at: string
  was_freeze: boolean
}

interface Reminder {
  id: string
  habit_id: string
  time_of_day: string
  channel: 'push' | 'email'
  active: boolean
  days_of_week: number[] | string
}

const HEATMAP_LEVELS = [
  'var(--color-heatmap-empty)',
  'var(--color-heatmap-level1)',
  'var(--color-heatmap-level2)',
  'var(--color-heatmap-level3)',
  'var(--color-heatmap-level4)',
]

export function HabitDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id = '' } = useParams<{ id: string }>()
  const [habit, setHabit] = useState<Habit | null>(null)
  const [completions, setCompletions] = useState<Completion[]>([])
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [reminderTime, setReminderTime] = useState('')
  const [reminderChannel, setReminderChannel] = useState<'push' | 'email'>('push')
  const [reminderError, setReminderError] = useState<string | null>(null)
  const [reminderBusy, setReminderBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [draftDescription, setDraftDescription] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const startEdit = () => {
    if (!habit) return
    setDraftName(habit.name)
    setDraftDescription(habit.description ?? '')
    setEditError(null)
    setEditing(true)
  }

  const saveEdit = async () => {
    if (!habit || savingEdit) return
    if (!draftName.trim()) {
      setEditError(t('auth.signup.nameRequired', {}, { defaultValue: 'Name is required.' }))
      return
    }
    setSavingEdit(true)
    setEditError(null)
    try {
      const resp = await http.patch(`/api/habits/${habit.id}`, {
        name: draftName.trim(),
        description: draftDescription.trim() || null,
      })
      setHabit(unwrapSingle<Habit>(resp))
      void track({ name: 'habit.updated', properties: { habit_id: habit.id } })
      setEditing(false)
    } catch (err) {
      setEditError(err instanceof Error ? err.message : String(err))
    } finally {
      setSavingEdit(false)
    }
  }

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get(`/api/habits/${id}`),
      http.get(`/api/completions?habit_id=${id}`),
      http.get(`/api/reminders?habit_id=${id}`),
    ])
      .then(([h, c, r]) => {
        if (cancelled) return
        setHabit(unwrapSingle<Habit>(h))
        setCompletions(unwrapList<Completion>(c))
        setReminders(unwrapList<Reminder>(r))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('habitDetail.loadError', {}, { defaultValue: 'Failed to load habit.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  const addReminder = async () => {
    if (!habit || reminderBusy) return
    setReminderError(null)
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(reminderTime)) {
      setReminderError(
        t('habitDetail.reminders.invalidTime', {}, { defaultValue: 'Use HH:MM (00:00–23:59).' }),
      )
      return
    }
    setReminderBusy(true)
    try {
      const resp = await http.post('/api/reminders', {
        habit_id: habit.id,
        time_of_day: reminderTime,
        channel: reminderChannel,
      })
      const created = unwrapSingle<Reminder>(resp)
      if (created)
        setReminders((prev) =>
          [...prev, created].sort((a, b) => a.time_of_day.localeCompare(b.time_of_day)),
        )
      void track({
        name: 'reminder.created',
        properties: { habit_id: habit.id, channel: reminderChannel },
      })
      setReminderTime('')
    } catch (err) {
      setReminderError(err instanceof Error ? err.message : String(err))
    } finally {
      setReminderBusy(false)
    }
  }

  const removeReminder = async (reminderId: string) => {
    if (!habit) return
    setReminderError(null)
    setReminderBusy(true)
    try {
      await http.delete(`/api/reminders/${reminderId}`)
      setReminders((prev) => prev.filter((r) => r.id !== reminderId))
      void track({
        name: 'reminder.removed',
        properties: { habit_id: habit.id, reminder_id: reminderId },
      })
    } catch (err) {
      setReminderError(err instanceof Error ? err.message : String(err))
    } finally {
      setReminderBusy(false)
    }
  }

  if (error) return <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
  if (loading)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </p>
    )
  if (!habit)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('habitDetail.notFound', {}, { defaultValue: 'Habit not found.' })}
      </p>
    )

  const days = buildHeatmapDays(completions)

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('4xl'), cm.mxAuto, 'space-y-6')}>
      <div className={cm.flex({ align: 'center', justify: 'between' })}>
        <Link
          to="/habits"
          className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', 'hover:text-on-surface')}
        >
          ← {t('habitDetail.backLink', {}, { defaultValue: 'All habits' })}
        </Link>
        {editing ? null : (
          <button
            type="button"
            onClick={startEdit}
            data-testid="habit-edit"
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('xs'),
              cm.fontWeight('medium'),
              'border border-outline-variant rounded',
            )}
          >
            {t('common.edit', {}, { defaultValue: 'Edit' })}
          </button>
        )}
      </div>

      {editing ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void saveEdit()
          }}
          className={cm.cn(cm.card(), cm.sp('p', 6), 'space-y-4')}
        >
          <label
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('form.name', {}, { defaultValue: 'Name' })}
            <input
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              data-testid="habit-edit-name"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.sp('mt', 2),
                'block w-full text-base font-semibold text-on-surface bg-surface-container rounded-xl border-2 border-transparent focus:border-primary focus:outline-none transition-colors',
              )}
            />
          </label>
          <label
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('form.description', {}, { defaultValue: 'Description' })}
            <textarea
              value={draftDescription}
              onChange={(e) => setDraftDescription(e.target.value)}
              data-testid="habit-edit-description"
              rows={2}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.sp('mt', 2),
                'block w-full text-base text-on-surface bg-surface-container rounded-xl border-2 border-transparent focus:border-primary focus:outline-none transition-colors resize-none',
              )}
            />
          </label>
          {editError ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-error')} data-testid="habit-edit-error">
              {editError}
            </p>
          ) : null}
          <div className={cm.flex({ align: 'center', gap: 'sm', justify: 'end' })}>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'border border-outline-variant rounded',
              )}
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </button>
            <button
              type="submit"
              disabled={savingEdit}
              data-testid="habit-edit-save"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'bg-primary text-on-primary rounded disabled:opacity-50',
              )}
            >
              {savingEdit
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
            </button>
          </div>
        </form>
      ) : (
        <header
          className={cm.cn(cm.card(), cm.sp('p', 6), cm.flex({ align: 'center', gap: 'md' }))}
        >
          <span aria-hidden="true" className={cm.cn(cm.textSize('5xl'))}>
            {habit.emoji}
          </span>
          <div className={cm.flex1}>
            <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>{habit.name}</h1>
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
              {habit.description}
            </p>
          </div>
        </header>
      )}

      <section className={cm.grid({ cols: 4, gap: 'md' })}>
        <Stat
          label={t('habitDetail.stat.current', {}, { defaultValue: 'Current streak' })}
          value={`${habit.current_streak}`}
          unit={t('habitDetail.stat.days', {}, { defaultValue: 'days' })}
          accent
        />
        <Stat
          label={t('habitDetail.stat.longest', {}, { defaultValue: 'Longest' })}
          value={`${habit.longest_streak}`}
          unit={t('habitDetail.stat.days', {}, { defaultValue: 'days' })}
        />
        <Stat
          label={t('nav.total', {}, { defaultValue: 'Total' })}
          value={`${habit.total_completions}`}
          unit={t('habitDetail.stat.checkins', {}, { defaultValue: 'check-ins' })}
        />
        <Stat
          label={t('habitDetail.stat.cadence', {}, { defaultValue: 'Cadence' })}
          value={habit.cadence}
          unit=""
        />
      </section>

      <section className={cm.cn(cm.card(), cm.sp('p', 5))}>
        <h2 className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), cm.sp('mb', 4))}>
          {t('habitDetail.heatmapHeading', {}, { defaultValue: 'Last 365 days' })}
        </h2>
        <div className={cm.flex({ gap: 'xs' })} style={{ flexWrap: 'wrap', maxWidth: '720px' }}>
          {days.map((d, i) => (
            <div
              key={i}
              title={`${d.date} · ${d.count}`}
              style={{
                width: '11px',
                height: '11px',
                backgroundColor: HEATMAP_LEVELS[d.level],
                borderRadius: '2px',
              }}
            />
          ))}
        </div>
        <div
          className={cm.flex({ align: 'center', gap: 'sm', justify: 'end' })}
          style={{ marginTop: '0.75rem' }}
        >
          <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t('habitDetail.legendLess', {}, { defaultValue: 'Less' })}
          </span>
          {HEATMAP_LEVELS.map((c, i) => (
            <div
              key={i}
              style={{ width: '11px', height: '11px', backgroundColor: c, borderRadius: '2px' }}
            />
          ))}
          <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t('habitDetail.legendMore', {}, { defaultValue: 'More' })}
          </span>
        </div>
      </section>

      <section className={cm.cn(cm.card(), cm.sp('p', 5))} data-testid="habit-reminders">
        <h2 className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), cm.sp('mb', 3))}>
          {t('habitDetail.reminders.heading', {}, { defaultValue: 'Reminders' })}
        </h2>
        {reminders.length === 0 ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mb', 3))}>
            {t(
              'habitDetail.reminders.empty',
              {},
              { defaultValue: 'No reminders yet. Add one to nudge yourself.' },
            )}
          </p>
        ) : (
          <ul className={cm.cn('space-y-2', cm.sp('mb', 4))} data-testid="habit-reminders-list">
            {reminders.map((r) => (
              <li
                key={r.id}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm', justify: 'between' }),
                  cm.textSize('sm'),
                )}
                data-testid={`habit-reminder-${r.id}`}
              >
                <span>
                  <span aria-hidden="true">⏰ </span>
                  <span className={cm.cn(cm.fontWeight('medium'))}>{r.time_of_day}</span>
                  <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {' '}
                    · {r.channel}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => void removeReminder(r.id)}
                  disabled={reminderBusy}
                  data-testid={`habit-reminder-delete-${r.id}`}
                  className={cm.cn(
                    cm.sp('px', 2),
                    cm.sp('py', 1),
                    cm.textSize('xs'),
                    'border border-outline-variant rounded text-on-surface-variant hover:text-on-surface disabled:opacity-50',
                  )}
                >
                  {t('common.remove', {}, { defaultValue: 'Remove' })}
                </button>
              </li>
            ))}
          </ul>
        )}
        <form
          className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}
          onSubmit={(e) => {
            e.preventDefault()
            void addReminder()
          }}
        >
          <input
            type="time"
            value={reminderTime}
            onChange={(e) => setReminderTime(e.target.value)}
            data-testid="habit-reminder-time"
            aria-label={t('habitDetail.reminders.timeLabel', {}, { defaultValue: 'Reminder time' })}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'border border-outline-variant rounded',
            )}
          />
          <select
            value={reminderChannel}
            onChange={(e) => setReminderChannel(e.target.value as 'push' | 'email')}
            data-testid="habit-reminder-channel"
            aria-label={t(
              'habitDetail.reminders.channelLabel',
              {},
              { defaultValue: 'Reminder channel' },
            )}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'border border-outline-variant rounded',
            )}
          >
            <option value="push">
              {t('habitDetail.reminders.channelPush', {}, { defaultValue: 'Push' })}
            </option>
            <option value="email">
              {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
            </option>
          </select>
          <button
            type="submit"
            disabled={reminderBusy || !reminderTime}
            data-testid="habit-reminder-add"
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'bg-primary text-on-primary rounded disabled:opacity-50',
            )}
          >
            {t('habitDetail.reminders.add', {}, { defaultValue: 'Add reminder' })}
          </button>
        </form>
        {reminderError ? (
          <p
            className={cm.cn(cm.textSize('xs'), 'text-error', cm.sp('mt', 2))}
            data-testid="habit-reminder-error"
          >
            {reminderError}
          </p>
        ) : null}
      </section>

      <section className={cm.cn(cm.card(), cm.sp('p', 5))}>
        <h2 className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), cm.sp('mb', 3))}>
          {t('habitDetail.recentHeading', {}, { defaultValue: 'Recent check-ins' })}
        </h2>
        {completions.length === 0 ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('habitDetail.recentEmpty', {}, { defaultValue: 'No check-ins yet.' })}
          </p>
        ) : (
          <ul className={cm.cn('space-y-1.5')}>
            {completions.slice(0, 10).map((c) => (
              <li
                key={c.id}
                className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.textSize('sm'))}
              >
                <span aria-hidden="true">{c.was_freeze ? '❄️' : '✓'}</span>
                <span>
                  {new Date(c.completed_at).toLocaleString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                {c.was_freeze ? (
                  <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {t('habitDetail.freezeUsed', {}, { defaultValue: '(freeze used)' })}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function Stat({
  label,
  value,
  unit,
  accent,
}: {
  label: string
  value: string
  unit: string
  accent?: boolean
}) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.card(), cm.sp('p', 5))}>
      <p
        className={cm.cn(
          cm.textSize('xs'),
          'text-on-surface-variant',
          cm.fontWeight('medium'),
          'uppercase tracking-wider',
        )}
      >
        {label}
      </p>
      <p
        className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mt', 1))}
        style={accent ? { color: 'var(--color-flame)' } : undefined}
      >
        {value}
      </p>
      {unit ? <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>{unit}</p> : null}
    </div>
  )
}

interface HeatDay {
  date: string
  count: number
  level: number
}

function buildHeatmapDays(completions: Completion[]): HeatDay[] {
  const counts = new Map<string, number>()
  for (const c of completions) {
    const d = c.completed_at.slice(0, 10)
    counts.set(d, (counts.get(d) ?? 0) + 1)
  }
  const days: HeatDay[] = []
  const today = new Date()
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const count = counts.get(key) ?? 0
    days.push({
      date: key,
      count,
      level: count === 0 ? 0 : Math.min(4, count),
    })
  }
  return days
}
