import { useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

/**
 * Log-a-night form — the app's primary create action, previously only
 * reachable via the API. Fields map 1:1 onto POST /api/sleep
 * (bedtime + wake_time required, duration computed server-side, quality /
 * interruptions / notes / factors optional). Fires the `sleep.logged`
 * domain event on success.
 */

interface LogNightFormProps {
  /** YYYY-MM-DD the form starts from (e.g. the /night/:date param). */
  defaultDate?: string
  onCreated: (log: { id: string; sleep_date: string }) => void
  onCancel?: () => void
}

const FACTOR_OPTIONS = [
  { value: 'caffeine', defaultLabel: 'Caffeine' },
  { value: 'alcohol', defaultLabel: 'Alcohol' },
  { value: 'screen', defaultLabel: 'Screen-free hour' },
  { value: 'exercise', defaultLabel: 'Exercise' },
  { value: 'meal_late', defaultLabel: 'Late dinner' },
  { value: 'temperature', defaultLabel: 'Cool room' },
  { value: 'stress', defaultLabel: 'Stress' },
]

function todayIso(): string {
  const now = new Date()
  const offsetMs = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10)
}

/** Local wall-clock fields → ISO instant. Wake before bed wraps to the
 *  next morning (a 22:30 → 06:30 night is 8h, not -16h). */
function toIso(date: string, time: string, dayOffset = 0): string {
  const d = new Date(`${date}T${time}`)
  d.setDate(d.getDate() + dayOffset)
  return d.toISOString()
}

export function LogNightForm({ defaultDate, onCreated, onCancel }: LogNightFormProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [date, setDate] = useState(defaultDate ?? todayIso())
  const [bedtime, setBedtime] = useState('22:30')
  const [wakeTime, setWakeTime] = useState('06:30')
  const [quality, setQuality] = useState(75)
  const [interruptions, setInterruptions] = useState(0)
  const [notes, setNotes] = useState('')
  const [factors, setFactors] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<string | null>(null)

  const toggleFactor = (value: string) =>
    setFactors((prev) =>
      prev.includes(value) ? prev.filter((f) => f !== value) : [...prev, value],
    )

  const submit = async () => {
    setError(null)
    setFieldError(null)
    if (!date || !bedtime || !wakeTime) {
      setFieldError(
        t(
          'logNight.errors.missingFields',
          {},
          {
            defaultValue: 'Date, bedtime and wake time are all required.',
          },
        ),
      )
      return
    }
    // Same wall-clock instant expressed both ways means zero-length sleep.
    if (toIso(date, bedtime) === toIso(date, wakeTime)) {
      setFieldError(
        t(
          'logNight.errors.zeroLength',
          {},
          {
            defaultValue: 'Wake time must be different from bedtime.',
          },
        ),
      )
      return
    }
    const wakesNextDay = wakeTime < bedtime
    const payload = {
      sleep_date: date,
      bedtime: toIso(date, bedtime),
      wake_time: toIso(date, wakeTime, wakesNextDay ? 1 : 0),
      quality_score: quality,
      interruptions,
      notes: notes.trim() || undefined,
      factors: factors.length > 0 ? factors : undefined,
      source: 'manual' as const,
    }
    setBusy(true)
    try {
      const res = await http.post('/api/sleep', payload)
      const created = unwrapSingle<{ id: string; sleep_date: string }>(res)
      if (!created) {
        setError(
          t(
            'logNight.errors.noRecord',
            {},
            {
              defaultValue: 'The night was saved but the server returned no record.',
            },
          ),
        )
        return
      }
      track({
        name: 'sleep.logged',
        properties: {
          sleep_log_id: created.id,
          sleep_date: created.sleep_date,
          quality_score: quality,
        },
      })
      onCreated(created)
    } catch (_error) {
      setError(
        t(
          'logNight.errors.saveFailed',
          {},
          {
            defaultValue: 'Saving the night failed — please try again.',
          },
        ),
      )
    } finally {
      setBusy(false)
    }
  }

  const inputCls = cm.cn(
    cm.sp('px', 3),
    cm.sp('py', 2),
    'w-full rounded-xl border-2 border-outline-variant',
  )

  return (
    <section
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-2xl shadow-md space-y-4',
      )}
      aria-label={t('logNight.title', {}, { defaultValue: 'Log a night' })}
      data-testid="log-night-form"
    >
      <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
        {t('logNight.title', {}, { defaultValue: 'Log a night' })}
      </h2>

      {error ? (
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
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className={cm.cn('block space-y-1')}>
          <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
            {t('logNight.dateField', {}, { defaultValue: 'Night of' })}
          </span>
          <input
            type="date"
            data-mol-id="log-night-date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className={cm.cn('block space-y-1')}>
          <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
            {t('logNight.interruptionsField', {}, { defaultValue: 'Wakings during the night' })}
          </span>
          <input
            type="number"
            min={0}
            max={99}
            data-mol-id="log-night-interruptions"
            value={interruptions}
            onChange={(e) => setInterruptions(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
            className={inputCls}
          />
        </label>
        <label className={cm.cn('block space-y-1')}>
          <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
            {t('logNight.bedtimeField', {}, { defaultValue: 'Bedtime' })}
          </span>
          <input
            type="time"
            data-mol-id="log-night-bedtime"
            value={bedtime}
            onChange={(e) => setBedtime(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className={cm.cn('block space-y-1')}>
          <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
            {t('logNight.wakeField', {}, { defaultValue: 'Wake time' })}
          </span>
          <input
            type="time"
            data-mol-id="log-night-wake"
            value={wakeTime}
            onChange={(e) => setWakeTime(e.target.value)}
            className={inputCls}
          />
        </label>
      </div>
      {fieldError ? (
        <p
          role="alert"
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}
          style={{ color: 'var(--color-error)' }}
        >
          {fieldError}
        </p>
      ) : null}

      <label className={cm.cn('block space-y-1')}>
        <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
          {t(
            'logNight.qualityField',
            { score: quality },
            { defaultValue: 'How restful did it feel? ({{score}}/100)' },
          )}
        </span>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          data-mol-id="log-night-quality"
          value={quality}
          onChange={(e) => setQuality(Number(e.target.value))}
          aria-valuetext={`${quality}/100`}
          className="w-full"
        />
      </label>

      <fieldset>
        <legend className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
          {t('logNight.factorsField', {}, { defaultValue: 'Factors' })}
        </legend>
        <div className={cm.cn(cm.flex({ gap: 'xs' }), cm.sp('mt', 2), 'flex-wrap')}>
          {FACTOR_OPTIONS.map((f) => {
            const active = factors.includes(f.value)
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => toggleFactor(f.value)}
                aria-pressed={active}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'rounded-full min-h-10 transition-colors',
                  active
                    ? 'bg-primary text-on-primary'
                    : 'border-2 border-outline-variant text-on-surface-variant',
                )}
              >
                {t(`logNight.factor.${f.value}`, {}, { defaultValue: f.defaultLabel })}
              </button>
            )
          })}
        </div>
      </fieldset>

      <label className={cm.cn('block space-y-1')}>
        <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
          {t('logNight.notesField', {}, { defaultValue: 'Notes (optional)' })}
        </span>
        <textarea
          rows={3}
          data-mol-id="log-night-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={inputCls}
        />
      </label>

      <div className={cm.cn(cm.flex({ gap: 'sm', justify: 'end' }))}>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            data-mol-id="log-night-cancel"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'rounded-full border-2 border-outline-variant min-h-10',
            )}
          >
            {t('common.cancel', {}, { defaultValue: 'Cancel' })}
          </button>
        ) : null}
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          data-mol-id="log-night-submit"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'rounded-full bg-primary text-on-primary shadow-md disabled:opacity-60 min-h-10',
          )}
        >
          {busy
            ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
            : t('logNight.save', {}, { defaultValue: 'Save night' })}
        </button>
      </div>
    </section>
  )
}
