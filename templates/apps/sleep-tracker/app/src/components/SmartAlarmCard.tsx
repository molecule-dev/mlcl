import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Smart-alarm card — large tabular alarm time, wake-window subtitle,
 * day-of-week selector pills, sound chip, and an active toggle on the
 * right. When the alarm is the next-firing one, a left accent stripe in
 * the alarm-active orange marks it.
 *
 * Translated from habit-tracker/HabitChecklistRow.tsx (toggle + status
 * pattern) and personal-finance/AccountRecentTransactions row layout.
 * Spec from DESIGN.md "Smart Alarm Card".
 */

interface SmartAlarmCardProps {
  id: string
  alarmTime: string // 'HH:MM'
  label: string
  daysOfWeek: number[] // 0 = Sun .. 6 = Sat
  smartWindowMinutes: number
  sound: string
  enabled: boolean
  isNext?: boolean
  onToggle: (id: string, enabled: boolean) => void
}

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const

function formatTime12(time: string): { hourMin: string; ampm: string } {
  const [hStr, mStr] = time.split(':')
  const h = Number(hStr)
  const m = Number(mStr ?? '00')
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour12 = ((h + 11) % 12) + 1
  return { hourMin: `${hour12}:${m.toString().padStart(2, '0')}`, ampm }
}

function formatWindow(start: string, windowMinutes: number): string {
  const [hStr, mStr] = start.split(':')
  const startMs = new Date()
  startMs.setHours(Number(hStr), Number(mStr ?? '00'), 0, 0)
  const before = new Date(startMs.getTime() - windowMinutes * 60_000)
  return `${before.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} – ${startMs.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
}

export function SmartAlarmCard({
  id,
  alarmTime,
  label,
  daysOfWeek,
  smartWindowMinutes,
  sound,
  enabled,
  isNext = false,
  onToggle,
}: SmartAlarmCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { hourMin, ampm } = formatTime12(alarmTime)
  const window = formatWindow(alarmTime, smartWindowMinutes)
  const accent = isNext ? 'var(--color-accent-amber)' : 'var(--color-border-focus)'

  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-2xl shadow-sm hover:shadow-md transition-all',
        cm.accentCard({ tone: 'custom' }),
      )}
      style={{ ['--mol-accent' as string]: accent, opacity: enabled ? 1 : 0.7 }}
    >
      <div
        className={cm.cn(cm.flex({ align: 'start', justify: 'between', gap: 'md' }), 'flex-wrap')}
      >
        <div className={cm.flex1}>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 1))}>
            {isNext ? (
              <span
                className={cm.cn(
                  cm.sp('px', 2),
                  cm.fontWeight('bold'),
                  'text-[10px] py-0.5 rounded-full uppercase tracking-widest',
                )}
                style={{
                  backgroundColor: 'var(--color-accent-amber-pill)',
                  color: 'var(--color-accent-amber-text)',
                }}
              >
                {t('smartAlarmCard.nextBadge', {}, { defaultValue: 'Next' })}
              </span>
            ) : null}
            <span
              className={cm.cn(
                'text-[10px] uppercase tracking-widest font-bold',
                cm.accentCardLabel({ tone: 'custom' }),
              )}
            >
              {label || t('smartAlarmCard.defaultLabel', {}, { defaultValue: 'Wake-up' })}
            </span>
          </div>
          <div className={cm.cn(cm.flex({ align: 'baseline', gap: 'xs' }))}>
            <span
              className={cm.cn('text-5xl font-extrabold tracking-tighter text-on-surface')}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {hourMin}
            </span>
            <span
              className={cm.cn(
                cm.textSize('lg'),
                cm.fontWeight('semibold'),
                'text-on-surface-variant',
              )}
            >
              {ampm}
            </span>
          </div>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t('smartAlarmCard.window', { window }, { defaultValue: 'Wake window: {{window}}' })}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onToggle(id, !enabled)}
          aria-pressed={enabled}
          aria-label={t(
            'smartAlarmCard.toggleAria',
            { label },
            { defaultValue: 'Toggle alarm {{label}}' },
          )}
          className={cm.cn(
            'relative shrink-0 transition-all',
            'h-7 w-12 rounded-full',
            enabled ? 'bg-gradient-to-r from-primary to-secondary' : 'bg-surface-container',
          )}
        >
          <span
            className={cm.cn(
              'absolute top-1 h-5 w-5 rounded-full bg-surface shadow-md transition-transform',
              enabled ? 'translate-x-6' : 'translate-x-1',
            )}
          />
        </button>
      </div>

      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mt', 4), 'flex-wrap')}>
        {DAYS.map((label, idx) => {
          const active = daysOfWeek.includes(idx)
          return (
            <span
              key={`${id}-day-${idx}`}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                'h-8 w-8 rounded-full text-xs font-bold transition-colors',
                active
                  ? 'bg-primary text-on-primary'
                  : 'border-2 border-outline-variant text-on-surface-variant',
              )}
              aria-label={t(`smartAlarmCard.day.${DAY_KEYS[idx]}`, {}, { defaultValue: label })}
            >
              {label}
            </span>
          )
        })}
        <span
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.fontWeight('semibold'),
            cm.textSize('xs'),
            'rounded-full bg-surface-container text-on-surface-variant ml-auto',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            music_note
          </span>
          {t(`smartAlarmCard.sound.${sound}`, {}, { defaultValue: sound })}
        </span>
      </div>
    </div>
  )
}
