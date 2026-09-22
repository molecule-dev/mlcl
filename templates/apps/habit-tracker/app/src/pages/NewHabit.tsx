import { useState } from 'react'
import { useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const CATEGORIES = [
  { id: 'health', label: 'Health', emoji: '💪', color: '#10b981' },
  { id: 'mind', label: 'Mind', emoji: '🧘', color: '#4a5fd7' },
  { id: 'learning', label: 'Learning', emoji: '📚', color: '#f59e0b' },
  { id: 'creativity', label: 'Creativity', emoji: '🎨', color: '#a78bfa' },
  { id: 'social', label: 'Social', emoji: '🤝', color: '#f472b6' },
] as const

const FREQUENCIES = ['daily', 'weekly', 'custom'] as const

// UI weekday order is Mon..Sun (see the days_of_week translation in onSubmit).
const WEEKDAYS = [
  { key: 'mon', letter: 'M', defaultLabel: 'Monday' },
  { key: 'tue', letter: 'T', defaultLabel: 'Tuesday' },
  { key: 'wed', letter: 'W', defaultLabel: 'Wednesday' },
  { key: 'thu', letter: 'T', defaultLabel: 'Thursday' },
  { key: 'fri', letter: 'F', defaultLabel: 'Friday' },
  { key: 'sat', letter: 'S', defaultLabel: 'Saturday' },
  { key: 'sun', letter: 'S', defaultLabel: 'Sunday' },
] as const

const ACCENT_SWATCHES = [
  '#4a5fd7',
  '#10b981',
  '#f97316',
  '#a78bfa',
  '#f472b6',
  '#06b6d4',
  '#fbbf24',
  '#ef4444',
]

export function NewHabit() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const [name, setName] = useState('')
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]['id']>('health')
  const [frequency, setFrequency] = useState<(typeof FREQUENCIES)[number]>('daily')
  const [days, setDays] = useState<boolean[]>(() => new Array(7).fill(true))
  const [reminders, setReminders] = useState(true)
  const [time, setTime] = useState('07:30')
  const [accent, setAccent] = useState('#4a5fd7')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const cat = CATEGORIES.find((c) => c.id === category)
      // UI weekday order is Mon=0..Sun=6; backend days_of_week uses Sun=0..Sat=6.
      // Translate: backend index 0 (Sun) ← UI index 6, then 1..6 (Mon..Sat) ← UI 0..5.
      const daysOfWeek = days
        .map((on, uiIdx) => (on ? (uiIdx === 6 ? 0 : uiIdx + 1) : -1))
        .filter((d) => d >= 0)
      const body: Record<string, unknown> = {
        name: name.trim(),
        emoji: cat?.emoji ?? '✨',
        category,
        cadence: frequency,
        color: accent,
        reminder_time: reminders ? time : null,
        description: notes.trim() || undefined,
      }
      if (frequency === 'custom') {
        body.days_of_week = daysOfWeek
      }
      const resp = await http.post('/api/habits', body)
      const created =
        (resp && (resp as { data?: { id?: string } }).data) ?? (resp as { id?: string })
      const id = (created as { id?: string })?.id
      void track({
        name: 'habit.created',
        properties: { habit_id: id, cadence: frequency, category },
      })
      navigate(id ? `/habits/${id}` : '/habits')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('2xl'), cm.mxAuto, 'space-y-6')}>
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('newHabit.eyebrow', {}, { defaultValue: 'Start a new chain' })}
        </p>
        <h1 className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight', cm.sp('mt', 2))}>
          {t('newHabit.heading', {}, { defaultValue: 'New habit' })}
        </h1>
        <p className={cm.cn(cm.textSize('lg'), cm.sp('mt', 2), 'text-on-surface-variant')}>
          {t(
            'newHabit.subheading',
            {},
            { defaultValue: 'Make it small. Make it specific. Show up tomorrow.' },
          )}
        </p>
      </header>

      <form
        onSubmit={onSubmit}
        className={cm.cn(
          'bg-surface-container-lowest rounded-2xl shadow-sm border-t-4 border-primary',
          cm.sp('p', 8),
          'space-y-7',
        )}
      >
        <div>
          <label
            htmlFor="habit-name"
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('form.name', {}, { defaultValue: 'Name' })}
          </label>
          <input
            type="text"
            id="habit-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t(
              'newHabit.namePlaceholder',
              {},
              { defaultValue: 'e.g. Morning meditation' },
            )}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.sp('mt', 2),
              'w-full text-lg font-semibold text-on-surface bg-surface-container rounded-xl border-2 border-transparent focus:border-primary focus:outline-none transition-colors',
            )}
          />
        </div>

        <div>
          <label
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('form.category', {}, { defaultValue: 'Category' })}
          </label>
          <div className={cm.cn(cm.sp('mt', 3), cm.flex({ gap: 'sm' }), 'flex-wrap')}>
            {CATEGORIES.map((c) => {
              const active = category === c.id
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={cm.cn(
                    'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all',
                    active
                      ? 'text-white shadow-md'
                      : 'border border-outline-variant hover:border-primary text-on-surface',
                  )}
                  style={active ? { backgroundColor: c.color } : undefined}
                >
                  <span aria-hidden="true">{c.emoji}</span>
                  {t(`category.${c.id}`, {}, { defaultValue: c.label })}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('newHabit.frequencyLabel', {}, { defaultValue: 'Frequency' })}
          </label>
          <div className={cm.cn(cm.sp('mt', 3), cm.flex({ gap: 'sm' }), 'flex-wrap')}>
            {FREQUENCIES.map((f) => {
              const active = frequency === f
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFrequency(f)}
                  className={cm.cn(
                    'px-5 py-2 rounded-full text-sm font-bold transition-all capitalize',
                    active
                      ? 'text-on-primary shadow-md'
                      : 'border border-outline-variant hover:border-primary text-on-surface',
                  )}
                  style={
                    active
                      ? {
                          background:
                            'linear-gradient(90deg, var(--color-gradient-hero-start), var(--color-gradient-hero-end))',
                        }
                      : undefined
                  }
                >
                  {t(`newHabit.frequency.${f}`, {}, { defaultValue: f })}
                </button>
              )
            })}
          </div>
          {frequency === 'custom' ? (
            <div className={cm.cn(cm.sp('mt', 4), cm.flex({ gap: 'xs' }))}>
              {WEEKDAYS.map((d, i) => {
                const on = days[i]
                return (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => setDays((curr) => curr.map((v, j) => (j === i ? !v : v)))}
                    aria-pressed={on}
                    aria-label={t(
                      `newHabit.weekday.${d.key}`,
                      {},
                      { defaultValue: d.defaultLabel },
                    )}
                    className={cm.cn(
                      'w-10 h-10 rounded-full font-bold text-sm transition-all',
                      on
                        ? 'text-on-primary shadow-sm'
                        : 'border border-outline-variant text-on-surface-variant hover:border-primary',
                    )}
                    style={on ? { backgroundColor: 'var(--color-primary)' } : undefined}
                  >
                    {t(`newHabit.weekdayShort.${d.key}`, {}, { defaultValue: d.letter })}
                  </button>
                )
              })}
            </div>
          ) : null}
        </div>

        <div className={cm.flex({ align: 'center', justify: 'between' })}>
          <div>
            <label
              htmlFor="habit-time"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('newHabit.timeLabel', {}, { defaultValue: 'Reminder time' })}
            </label>
            <input
              type="time"
              id="habit-time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.sp('mt', 2),
                'text-base font-semibold text-on-surface bg-surface-container rounded-xl border-2 border-transparent focus:border-primary focus:outline-none transition-colors',
              )}
            />
          </div>
          <label className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'cursor-pointer')}>
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}>
              {t('newHabit.remindersLabel', {}, { defaultValue: 'Remind me' })}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={reminders}
              aria-label={t('newHabit.remindersLabel', {}, { defaultValue: 'Remind me' })}
              onClick={() => setReminders((r) => !r)}
              className={cm.cn(
                'relative w-14 h-8 rounded-full transition-colors',
                reminders ? '' : 'bg-surface-container border border-outline-variant',
              )}
              style={
                reminders
                  ? {
                      background:
                        'linear-gradient(90deg, var(--color-gradient-hero-start), var(--color-gradient-hero-end))',
                    }
                  : undefined
              }
            >
              <span
                className={cm.cn(
                  'absolute top-1 w-6 h-6 rounded-full bg-surface shadow-sm transition-all',
                )}
                style={{ left: reminders ? '1.75rem' : '0.25rem' }}
              />
            </button>
          </label>
        </div>

        <div>
          <label
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('newHabit.accentLabel', {}, { defaultValue: 'Accent color' })}
          </label>
          <div className={cm.cn(cm.sp('mt', 3), cm.flex({ gap: 'sm' }), 'flex-wrap')}>
            {ACCENT_SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setAccent(c)}
                aria-label={t(
                  'newHabit.accentSwatch',
                  { color: c },
                  { defaultValue: 'Use color {{color}}' },
                )}
                className={cm.cn('w-10 h-10 rounded-full transition-transform hover:scale-110')}
                style={{
                  backgroundColor: c,
                  boxShadow:
                    accent === c ? `0 0 0 3px var(--color-surface), 0 0 0 5px ${c}` : 'none',
                }}
              />
            ))}
          </div>
        </div>

        <div>
          <label
            htmlFor="habit-notes"
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('form.notes', {}, { defaultValue: 'Notes' })}
          </label>
          <textarea
            id="habit-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t(
              'newHabit.notesPlaceholder',
              {},
              { defaultValue: 'Why this habit? Two sentences.' },
            )}
            rows={3}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.sp('mt', 2),
              'w-full text-base text-on-surface bg-surface-container rounded-xl border-2 border-transparent focus:border-primary focus:outline-none transition-colors resize-none',
            )}
          />
        </div>

        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
            cm.sp('pt', 2),
          )}
        >
          <button
            type="button"
            onClick={() => navigate('/habits')}
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              'rounded-full border-2 border-outline-variant hover:border-primary text-on-surface',
            )}
          >
            {t('common.cancel', {}, { defaultValue: 'Cancel' })}
          </button>
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className={cm.cn(
              cm.sp('px', 8),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              'inline-flex items-center gap-2 rounded-full text-on-primary shadow-md hover:shadow-lg transition-shadow disabled:opacity-50',
            )}
            style={{
              background:
                'linear-gradient(90deg, var(--color-gradient-hero-start), var(--color-gradient-hero-end))',
            }}
          >
            {submitting
              ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
              : t('newHabit.createButton', {}, { defaultValue: 'Create habit' })}
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
        {error ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-error', cm.sp('mt', 2))}>{error}</p>
        ) : null}
      </form>
    </div>
  )
}
