import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { formatScheduledTime, type TimeFormat } from '../lib/scheduleFormat.js'

/**
 * Editorial dose row — pill-coloured circular medication chip, name + dose,
 * scheduled time, status pill (uppercase tracking-widest), and an optional
 * pill-shaped Take action.
 *
 * Translated from personal-finance's ActivityRow.tsx — same chip + content
 * + trailing-meta layout, restyled with the health palette and a status
 * pill instead of a transaction amount.
 *
 * The dose time is rendered from the wall-clock `scheduledTime` ("HH:MM")
 * the user originally scheduled, NOT from `scheduledAt` (UTC ISO). Doing
 * the latter shifts the label off the user's intended hour in any non-UTC
 * timezone (a 08:00 reminder shows as 11:00 for UTC+3 users).
 */
export type DoseStatus = 'taken' | 'missed' | 'upcoming' | 'skipped'
export type PillColor = 'blue' | 'green' | 'orange' | 'purple' | 'pink' | 'yellow'

export interface DoseRowProps {
  medicationName: string
  doseAmount: string
  pillColor: PillColor
  status: DoseStatus
  /** "HH:MM" 24h string the user scheduled (preferred). */
  scheduledTime?: string
  /** UTC ISO fallback when `scheduledTime` isn't available. */
  scheduledAt?: string
  onMarkTaken?: () => void
}

interface UserWithSettings {
  oauthData?: { settings?: { appearance?: { timeFormat?: TimeFormat } } }
}

const PILL_BG: Record<PillColor, string> = {
  blue: 'var(--color-pill-blue)',
  green: 'var(--color-pill-green)',
  orange: 'var(--color-pill-orange)',
  purple: 'var(--color-pill-purple)',
  pink: 'var(--color-pill-pink)',
  yellow: 'var(--color-pill-yellow)',
}

const STATUS_BG: Record<DoseStatus, string> = {
  taken: 'var(--color-dose-taken)',
  missed: 'var(--color-dose-missed)',
  upcoming: 'var(--color-dose-upcoming)',
  skipped: 'var(--color-dose-skipped)',
}

export function DoseRow({
  medicationName,
  doseAmount,
  pillColor,
  status,
  scheduledTime,
  scheduledAt,
  onMarkTaken,
}: DoseRowProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const auth = useAuth<UserWithSettings>()
  const fmt: TimeFormat =
    auth.user?.oauthData?.settings?.appearance?.timeFormat === '24h' ? '24h' : '12h'
  // Prefer the wall-clock string; fall back to deriving from the UTC ISO so
  // we never crash if the API stops returning `scheduled_time`. The fallback
  // does NOT honor timezone — it grabs the UTC HH:MM, which still avoids the
  // local-shift surprise even if it shows the wrong nominal hour.
  const hhmm = scheduledTime ?? (scheduledAt ? scheduledAt.slice(11, 16) : '')
  const time = hhmm ? formatScheduledTime(hhmm, fmt) : ''

  return (
    <article
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'md' }),
        cm.sp('p', 5),
        // Wrap (not cram) when a long medication name meets the status pill +
        // Take button at phone width.
        'bg-surface/60 hover:bg-surface-container-lowest rounded-2xl transition-all group flex-wrap',
      )}
    >
      <div
        className={cm.cn(
          cm.shrink0,
          cm.flex({ align: 'center', justify: 'center' }),
          cm.h(12),
          cm.w(12),
          cm.roundedFull,
          'shadow-sm group-hover:scale-105 transition-transform',
        )}
        style={{ backgroundColor: PILL_BG[pillColor], color: 'white' }}
        aria-hidden="true"
      >
        <span className="material-symbols-outlined">medication</span>
      </div>

      <div className={cm.cn(cm.flex1, 'min-w-[160px]')}>
        <p className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'), 'truncate')}>
          {medicationName}
        </p>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant truncate')}>
          {t(
            'doseRow.subline',
            { dose: doseAmount, time },
            { defaultValue: '{{dose}} · {{time}}' },
          )}
        </p>
      </div>

      <span
        className={cm.cn(
          cm.shrink0,
          cm.fontWeight('bold'),
          'px-3 py-1 text-[10px] uppercase tracking-widest rounded-full text-on-surface',
        )}
        style={{ backgroundColor: STATUS_BG[status] }}
      >
        {t(`doseRow.status.${status}`, {}, { defaultValue: status })}
      </span>

      {status === 'upcoming' && onMarkTaken && (
        <button
          type="button"
          onClick={onMarkTaken}
          className={cm.cn(
            cm.shrink0,
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            // 44px floor: dose logging is THE core action and this app's
            // users are frequently older adults on phones.
            'rounded-full bg-primary text-on-primary hover:opacity-90 transition-opacity min-h-[44px] min-w-[64px]',
          )}
        >
          {t('doseRow.markTaken', {}, { defaultValue: 'Take' })}
        </button>
      )}
    </article>
  )
}

export default DoseRow
