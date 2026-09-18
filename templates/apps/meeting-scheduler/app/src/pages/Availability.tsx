/**
 * Availability — weekly recurring open windows that drive the public
 * /book/:slug picker. Loads from /api/availability, persists changes via
 * PUT /api/availability/bulk (replace-all). UI lets the host toggle days
 * on/off and edit start/end for the (single) window per day; the
 * underlying API supports multiple windows per day for power users via
 * the JSON shape — this UI just exposes the common 1-window-per-day case.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { unwrapList } from '../lib/unwrap.js'

interface ApiRule {
  id: string
  user_id: string
  day_of_week: number
  start_minute: number
  end_minute: number
  timezone: string
}

const DAYS = [
  { dow: 1, key: 'Mon', defaultLabel: 'Monday' },
  { dow: 2, key: 'Tue', defaultLabel: 'Tuesday' },
  { dow: 3, key: 'Wed', defaultLabel: 'Wednesday' },
  { dow: 4, key: 'Thu', defaultLabel: 'Thursday' },
  { dow: 5, key: 'Fri', defaultLabel: 'Friday' },
  { dow: 6, key: 'Sat', defaultLabel: 'Saturday' },
  { dow: 0, key: 'Sun', defaultLabel: 'Sunday' },
] as const

type DayKey = (typeof DAYS)[number]['key']

interface DayState {
  enabled: boolean
  start: string
  end: string
}

const DEFAULT_STATE: Record<DayKey, DayState> = {
  Mon: { enabled: true, start: '09:00', end: '17:00' },
  Tue: { enabled: true, start: '09:00', end: '17:00' },
  Wed: { enabled: true, start: '09:00', end: '17:00' },
  Thu: { enabled: true, start: '09:00', end: '17:00' },
  Fri: { enabled: true, start: '09:00', end: '17:00' },
  Sat: { enabled: false, start: '09:00', end: '17:00' },
  Sun: { enabled: false, start: '09:00', end: '17:00' },
}

function minutesToLabel(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function labelToMinutes(label: string): number {
  const [h, m] = label.split(':').map((n) => Number(n) || 0)
  return Math.max(0, Math.min(1439, (h ?? 0) * 60 + (m ?? 0)))
}

function rulesToState(rules: ApiRule[]): Record<DayKey, DayState> {
  // No rules yet (fresh account) → seed with the recommended Mon-Fri 9-5
  // default so the user can save without first toggling each day on.
  if (rules.length === 0) {
    return JSON.parse(JSON.stringify(DEFAULT_STATE)) as Record<DayKey, DayState>
  }
  const next: Record<DayKey, DayState> = JSON.parse(JSON.stringify(DEFAULT_STATE))
  for (const day of DAYS) {
    next[day.key] = { enabled: false, start: '09:00', end: '17:00' }
  }
  for (const r of rules) {
    const day = DAYS.find((d) => d.dow === r.day_of_week)
    if (!day) continue
    next[day.key] = {
      enabled: true,
      start: minutesToLabel(r.start_minute),
      end: minutesToLabel(r.end_minute),
    }
  }
  return next
}

function stateToRules(
  state: Record<DayKey, DayState>,
  tz: string,
): Array<{ day_of_week: number; start_minute: number; end_minute: number; timezone: string }> {
  return DAYS.filter((d) => state[d.key].enabled)
    .map((d) => ({
      day_of_week: d.dow,
      start_minute: labelToMinutes(state[d.key].start),
      end_minute: labelToMinutes(state[d.key].end),
      timezone: tz,
    }))
    .filter((r) => r.end_minute > r.start_minute)
}

export function Availability() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [state, setState] = useState<Record<DayKey, DayState>>(DEFAULT_STATE)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [dirty, setDirty] = useState(false)

  const tz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/availability')
      .then((res) => {
        if (cancelled) return
        const rules = unwrapList<ApiRule>(res)
        setState(rulesToState(rules))
        setDirty(false)
      })
      .catch(() => {
        if (cancelled) return
        setError(
          t('availability.loadError', {}, { defaultValue: 'Could not load availability rules.' }),
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const updateDay = useCallback((key: DayKey, patch: Partial<DayState>) => {
    setDirty(true)
    setState((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }))
  }, [])

  const handleSave = useCallback(async () => {
    if (saving) return
    setSaving(true)
    setSaveError(null)
    try {
      const rules = stateToRules(state, tz)
      const res = await http.put<ApiRule[]>('/api/availability/bulk', { rules })
      const next = unwrapList<ApiRule>(res)
      setState(rulesToState(next))
      setSavedAt(new Date())
      setDirty(false)
    } catch (err) {
      const status = (err as { response?: { data?: { error?: string } } })?.response
      setSaveError(
        status?.data?.error ??
          t('availability.saveError', {}, { defaultValue: 'Could not save availability.' }),
      )
    } finally {
      setSaving(false)
    }
  }, [http, state, tz, t, saving])

  return (
    <div className={cm.cn(cm.stack(8), cm.sp('p', 8), 'max-w-[1200px] mx-auto')}>
      <header
        className={cm.cn(cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' }))}
      >
        <div className={cm.stack(2)}>
          <p
            className={cm.cn(cm.textSize('xs'), 'font-bold uppercase tracking-widest text-primary')}
          >
            {t('availability.eyebrow', {}, { defaultValue: 'Hours' })}
          </p>
          <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
            {t('availability.title', {}, { defaultValue: 'Availability' })}
          </h1>
          <p
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('medium'),
              'text-on-surface-variant/80 max-w-2xl',
            )}
          >
            {t(
              'availability.subtitle',
              { tz, app: APP_NAME },
              {
                defaultValue:
                  'Set the windows when invitees can book. All windows in {{tz}} — {{app}} translates for the invitee.',
              },
            )}
          </p>
        </div>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          {savedAt && !dirty ? (
            <span
              data-testid="availability-saved-at"
              className={cm.cn(
                cm.textSize('xs'),
                'text-success font-bold uppercase tracking-widest',
              )}
            >
              {t(
                'common.savedAt',
                { time: savedAt.toLocaleTimeString() },
                {
                  defaultValue: 'Saved at {{time}}',
                },
              )}
            </span>
          ) : null}
          <button
            type="button"
            data-testid="availability-save"
            disabled={!dirty || saving}
            onClick={handleSave}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-full disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {saving
              ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
              : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
          </button>
        </div>
      </header>

      {error ? (
        <p
          role="alert"
          data-testid="availability-error"
          className={cm.cn(cm.textSize('sm'), 'text-error font-semibold')}
        >
          {error}
        </p>
      ) : null}
      {saveError ? (
        <p
          role="alert"
          data-testid="availability-save-error"
          className={cm.cn(cm.textSize('sm'), 'text-error font-semibold')}
        >
          {saveError}
        </p>
      ) : null}

      <section
        className={cm.cn(
          cm.sp('p', 6),
          cm.stack(3),
          'bg-surface-container-lowest rounded-3xl shadow-sm',
        )}
      >
        {loading ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : null}
        {DAYS.map((day) => {
          const dayState = state[day.key]
          return (
            <div
              key={day.key}
              data-testid={`availability-row-${day.key}`}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
                cm.sp('p', 4),
                'bg-surface rounded-xl border-l-4',
                dayState.enabled ? 'border-emerald-500' : 'border-outline-variant',
              )}
            >
              <div className={cm.flex({ align: 'center', gap: 'md' })}>
                <button
                  type="button"
                  data-testid={`availability-toggle-${day.key}`}
                  onClick={() => updateDay(day.key, { enabled: !dayState.enabled })}
                  aria-pressed={dayState.enabled}
                  className={cm.cn(
                    cm.w(10),
                    'h-6 rounded-full relative transition-colors',
                    dayState.enabled ? 'bg-primary' : 'bg-outline-variant',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.w(5),
                      cm.h(5),
                      cm.roundedFull,
                      'absolute top-0.5 bg-surface shadow-sm transition-transform',
                      dayState.enabled ? 'translate-x-4' : 'translate-x-0.5',
                    )}
                  />
                </button>
                <div>
                  <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'))}>
                    {t(
                      `availability.day.${day.key.toLowerCase()}`,
                      {},
                      {
                        defaultValue: day.defaultLabel,
                      },
                    )}
                  </p>
                  <p
                    className={cm.cn(
                      'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {dayState.enabled
                      ? t('availability.openHours', {}, { defaultValue: 'Open for bookings' })
                      : t('availability.closed', {}, { defaultValue: 'Closed' })}
                  </p>
                </div>
              </div>
              {dayState.enabled ? (
                <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                  <input
                    type="time"
                    data-testid={`availability-start-${day.key}`}
                    value={dayState.start}
                    onChange={(e) => updateDay(day.key, { start: e.target.value })}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      'bg-surface-container-low rounded-lg border border-outline-variant focus:border-primary outline-none font-mono tabular-nums text-sm',
                    )}
                  />
                  <span className={'text-on-surface-variant text-sm'}>—</span>
                  <input
                    type="time"
                    data-testid={`availability-end-${day.key}`}
                    value={dayState.end}
                    onChange={(e) => updateDay(day.key, { end: e.target.value })}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      'bg-surface-container-low rounded-lg border border-outline-variant focus:border-primary outline-none font-mono tabular-nums text-sm',
                    )}
                  />
                </div>
              ) : (
                <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant italic')}>
                  {t(
                    'availability.noWindows',
                    {},
                    { defaultValue: 'No availability — toggle to open.' },
                  )}
                </span>
              )}
            </div>
          )
        })}
      </section>
    </div>
  )
}

export default Availability
