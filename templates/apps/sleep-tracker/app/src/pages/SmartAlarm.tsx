import { useEffect, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { SmartAlarmCard } from '../components/SmartAlarmCard.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Alarm {
  id: string
  alarm_time: string
  label: string
  days_of_week: number[] | string
  window_minutes: number
  smart_window_minutes?: number
  sound: string
  enabled: boolean
}

const SOUND_OPTIONS = ['sunrise', 'gentle', 'birdsong', 'tide', 'chimes']
const DAYS_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function parseDays(raw: number[] | string | null | undefined): number[] {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch (_error) {
      // non-JSON days_of_week string — fall back to empty array
      return []
    }
  }
  return []
}

export function SmartAlarm() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [alarms, setAlarms] = useState<Alarm[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [draftLabel, setDraftLabel] = useState('Weekday wake')
  const [draftTime, setDraftTime] = useState('06:30')
  const [draftWindow, setDraftWindow] = useState(30)
  const [draftDays, setDraftDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [draftSound, setDraftSound] = useState('sunrise')

  async function refresh() {
    const res = await http.get('/api/alarms').catch(() => null)
    const list = unwrapList<Alarm>(res)
    setAlarms(list)
    setLoading(false)
  }

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/alarms')
      .then((res) => {
        if (cancelled) return
        const list = unwrapList<Alarm>(res)
        setAlarms(list)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const toggle = async (id: string, enabled: boolean) => {
    setAlarms((prev) => prev.map((a) => (a.id === id ? { ...a, enabled } : a)))
    track({ name: 'alarm.toggled', properties: { alarm_id: id, enabled } })
    await http.patch(`/api/alarms/${id}`, { enabled }).catch(() => refresh())
  }

  const remove = async (id: string) => {
    setAlarms((prev) => prev.filter((a) => a.id !== id))
    track({ name: 'alarm.deleted', properties: { alarm_id: id } })
    await http.delete(`/api/alarms/${id}`).catch(() => refresh())
  }

  const create = async () => {
    setBusy(true)
    setFormError(null)
    try {
      const res = await http.post('/api/alarms', {
        label: draftLabel,
        alarm_time: draftTime,
        window_minutes: draftWindow,
        days_of_week: draftDays,
        sound: draftSound,
        enabled: true,
      })
      const created = unwrapSingle<Alarm>(res)
      if (created) {
        setAlarms((prev) => [...prev, created])
      } else {
        await refresh()
      }
      track({
        name: 'alarm.created',
        properties: { alarm_id: created?.id, alarm_time: draftTime, sound: draftSound },
      })
      setShowNew(false)
      setDraftLabel('Weekday wake')
      setDraftTime('06:30')
      setDraftWindow(30)
      setDraftDays([1, 2, 3, 4, 5])
      setDraftSound('sunrise')
    } catch (_error) {
      setFormError(
        t(
          'smartAlarm.errors.saveFailed',
          {},
          {
            defaultValue: 'Saving the alarm failed — please try again.',
          },
        ),
      )
    } finally {
      setBusy(false)
    }
  }

  const enabled = alarms.filter((a) => a.enabled)
  const nextId = enabled[0]?.id

  return (
    <div className={cm.cn(cm.sp('p', 8), 'space-y-8')}>
      <header
        className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'flex-wrap gap-4')}
      >
        <div>
          <p
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('smartAlarm.eyebrow', {}, { defaultValue: 'Smart wake' })}
          </p>
          <h1
            className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight', cm.sp('mt', 1))}
          >
            {t('smartAlarm.heading', {}, { defaultValue: 'Wake at the right moment' })}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'inline-flex items-center gap-2 rounded-full bg-primary text-on-primary shadow-md hover:shadow-lg transition-shadow',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')}>add</span>
          {t('smartAlarm.addAlarm', {}, { defaultValue: 'New alarm' })}
        </button>
      </header>

      {showNew ? (
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'bg-surface-container-lowest rounded-2xl shadow-md space-y-4',
          )}
          aria-label={t('smartAlarm.newDialog', {}, { defaultValue: 'New alarm' })}
        >
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
            {t('smartAlarm.newDialog', {}, { defaultValue: 'New alarm' })}
          </h2>
          {formError ? (
            <p
              role="alert"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-xl',
              )}
              style={{
                backgroundColor: 'var(--color-badge-red-bg)',
                color: 'var(--color-badge-red-fg)',
              }}
            >
              {formError}
            </p>
          ) : null}
          <label className={cm.cn('block space-y-1')}>
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
              {t('smartAlarm.labelField', {}, { defaultValue: 'Label' })}
            </span>
            <input
              type="text"
              value={draftLabel}
              onChange={(e) => setDraftLabel(e.target.value)}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                'w-full rounded-xl border-2 border-outline-variant',
              )}
            />
          </label>
          <label className={cm.cn('block space-y-1')}>
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
              {t('smartAlarm.timeField', {}, { defaultValue: 'Time' })}
            </span>
            <input
              type="time"
              value={draftTime}
              onChange={(e) => setDraftTime(e.target.value)}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                'w-full rounded-xl border-2 border-outline-variant',
              )}
            />
          </label>
          <label className={cm.cn('block space-y-1')}>
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
              {t('smartAlarm.windowField', {}, { defaultValue: 'Wake window (minutes)' })}
            </span>
            <input
              type="number"
              min={0}
              max={120}
              value={draftWindow}
              onChange={(e) => setDraftWindow(Number(e.target.value))}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                'w-full rounded-xl border-2 border-outline-variant',
              )}
            />
          </label>
          <fieldset>
            <legend className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
              {t('smartAlarm.daysField', {}, { defaultValue: 'Days' })}
            </legend>
            <div className={cm.cn(cm.flex({ gap: 'xs' }), cm.sp('mt', 2))}>
              {DAYS_LABELS.map((label, idx) => {
                const active = draftDays.includes(idx)
                return (
                  <button
                    key={`day-${idx}`}
                    type="button"
                    onClick={() =>
                      setDraftDays((prev) =>
                        prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx].sort(),
                      )
                    }
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      'h-8 w-8 rounded-full text-xs font-bold transition-colors',
                      active
                        ? 'bg-primary text-on-primary'
                        : 'border-2 border-outline-variant text-on-surface-variant',
                    )}
                    aria-pressed={active}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </fieldset>
          <label className={cm.cn('block space-y-1')}>
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
              {t('smartAlarm.soundField', {}, { defaultValue: 'Sound' })}
            </span>
            <select
              value={draftSound}
              onChange={(e) => setDraftSound(e.target.value)}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                'w-full rounded-xl border-2 border-outline-variant',
              )}
            >
              {SOUND_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <div className={cm.cn(cm.flex({ gap: 'sm', justify: 'end' }))}>
            <button
              type="button"
              onClick={() => setShowNew(false)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'rounded-full border-2 border-outline-variant',
              )}
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </button>
            <button
              type="button"
              onClick={create}
              disabled={busy}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'rounded-full bg-primary text-on-primary shadow-md disabled:opacity-60',
              )}
            >
              {busy
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('smartAlarm.save', {}, { defaultValue: 'Save alarm' })}
            </button>
          </div>
        </section>
      ) : null}

      <div
        className={cm.cn(cm.sp('p', 8), 'rounded-[2rem] text-white relative overflow-hidden')}
        style={{
          background:
            'linear-gradient(135deg, var(--color-hero-gradient-start) 0%, var(--color-primary) 50%, var(--color-border-focus) 100%)',
        }}
      >
        <div
          className={cm.cn(
            'absolute -right-16 -bottom-16 w-56 h-56 rounded-full bg-surface/15 blur-3xl',
          )}
        />
        <div
          className={cm.cn('absolute -left-16 -top-16 w-40 h-40 rounded-full blur-3xl')}
          style={{ background: 'rgba(167, 139, 250, 0.4)' }}
        />
        <p
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-widest text-white/75 relative z-10',
          )}
        >
          {t('status.upNext', {}, { defaultValue: 'Up next' })}
        </p>
        <p
          className={cm.cn(
            'text-6xl font-extrabold tracking-tighter relative z-10',
            cm.sp('mt', 2),
          )}
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {enabled[0]?.alarm_time ?? '—'}
        </p>
        <p className={cm.cn(cm.textSize('lg'), cm.sp('mt', 2), 'text-white/85 relative z-10')}>
          {enabled[0]
            ? t(
                'smartAlarm.upNextSubtitle',
                { window: enabled[0].window_minutes ?? enabled[0].smart_window_minutes ?? 30 },
                {
                  defaultValue:
                    'Wakes you within {{window}} minutes of light sleep before alarm time.',
                },
              )
            : t(
                'smartAlarm.noAlarmsSubtitle',
                {},
                { defaultValue: 'Add an alarm to get a smart wake window.' },
              )}
        </p>
      </div>

      {loading && alarms.length === 0 ? (
        <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
          {t('smartAlarm.loading', {}, { defaultValue: 'Loading alarms…' })}
        </p>
      ) : alarms.length === 0 ? (
        <div
          className={cm.cn(
            cm.sp('p', 8),
            'rounded-2xl bg-surface-container-lowest border-2 border-dashed border-outline-variant text-center space-y-3',
          )}
        >
          <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
            {t('smartAlarm.emptyHeading', {}, { defaultValue: 'No alarms yet' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'smartAlarm.emptyBody',
              {},
              { defaultValue: 'Add a wake-up time to start syncing with your sleep cycles.' },
            )}
          </p>
        </div>
      ) : (
        <div className={cm.cn('space-y-4')}>
          {alarms.map((a) => {
            const days = parseDays(a.days_of_week)
            return (
              <div key={a.id} className={cm.cn('relative')}>
                <SmartAlarmCard
                  id={a.id}
                  alarmTime={a.alarm_time}
                  label={a.label}
                  daysOfWeek={days}
                  smartWindowMinutes={a.window_minutes ?? a.smart_window_minutes ?? 30}
                  sound={a.sound}
                  enabled={a.enabled}
                  isNext={a.id === nextId}
                  onToggle={toggle}
                />
                <button
                  type="button"
                  onClick={() => remove(a.id)}
                  aria-label={t(
                    'smartAlarm.deleteAria',
                    { label: a.label },
                    { defaultValue: 'Delete alarm {{label}}' },
                  )}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'absolute top-3 right-16 h-8 w-8 rounded-full text-on-surface-variant hover:text-error transition-colors',
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-lg')} aria-hidden="true">
                    delete
                  </span>
                </button>
              </div>
            )
          })}
        </div>
      )}

      <section
        className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl shadow-sm')}
      >
        <h3
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('smartAlarm.soundsTitle', {}, { defaultValue: 'Sound library' })}
        </h3>
        <p
          className={cm.cn(
            cm.textSize('lg'),
            cm.fontWeight('bold'),
            cm.sp('mt', 1),
            cm.sp('mb', 4),
          )}
        >
          {t(
            'smartAlarm.soundsCaption',
            {},
            { defaultValue: 'Pick a wake-up tone for new alarms' },
          )}
        </p>
        <div className={cm.cn(cm.flex({ gap: 'sm' }), 'flex-wrap')}>
          {SOUND_OPTIONS.map((sound) => (
            <span
              key={sound}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'rounded-full bg-surface-container text-on-surface',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                music_note
              </span>
              {t(`smartAlarm.sound.${sound}`, {}, { defaultValue: sound })}
            </span>
          ))}
        </div>
      </section>
    </div>
  )
}
