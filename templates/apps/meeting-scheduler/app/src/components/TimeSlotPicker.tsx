import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

interface TimeSlot {
  /** ISO string (e.g. 2026-04-30T14:00:00Z). */
  start: string
  /** ISO string. */
  end: string
  /** True if the slot is unavailable (rendered greyed-out). */
  unavailable?: boolean
}

interface TimeSlotPickerProps {
  /** Slots for the currently-selected day. */
  slots: ReadonlyArray<TimeSlot>
  /** ISO string of the currently-selected slot, if any. */
  selectedStart?: string | null
  /** Click handler — receives the slot ISO start. */
  onSelect: (start: string) => void
}

function formatTime(iso: string) {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  } catch (_error) {
    // time formatting is best-effort; fall back to the raw ISO string if the locale API throws
    return iso
  }
}

/**
 * Public-facing time-slot picker — vertical stack of pill buttons in the
 * Time font, primary border on hover, primary fill when selected, muted
 * surface-secondary for unavailable. Drives the /book/:slug screen.
 *
 * Built to DESIGN.md "Time Slot Picker (public booking page)" spec:
 * 8px gap, 44px height, primary border on hover, primary bg on select.
 */
export function TimeSlotPicker({ slots, selectedStart, onSelect }: TimeSlotPickerProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  if (slots.length === 0) {
    return (
      <div
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
          cm.sp('p', 8),
          cm.textCenter,
          'gap-3 bg-surface-container-low rounded-2xl border border-dashed border-outline-variant',
        )}
      >
        <span
          className={cm.cn('material-symbols-outlined text-3xl text-primary/60')}
          aria-hidden="true"
        >
          event_busy
        </span>
        <p className={cm.cn(cm.textSize('sm'), 'font-bold text-on-surface')}>
          {t('timeSlotPicker.empty.title', {}, { defaultValue: 'No times available' })}
        </p>
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant max-w-[280px]')}>
          {t(
            'timeSlotPicker.empty.subtitle',
            { app: APP_NAME },
            { defaultValue: 'Try a different day — {{app}} opens new slots every morning.' },
          )}
        </p>
      </div>
    )
  }

  return (
    <div
      role="listbox"
      aria-label={t('timeSlotPicker.label', {}, { defaultValue: 'Available times' })}
      className={cm.cn(cm.stack(2))}
    >
      {slots.map((slot) => {
        const isSelected = slot.start === selectedStart
        const isUnavailable = !!slot.unavailable
        return (
          <button
            key={slot.start}
            type="button"
            role="option"
            aria-selected={isSelected}
            disabled={isUnavailable}
            onClick={() => !isUnavailable && onSelect(slot.start)}
            className={cm.cn(
              cm.w('full'),
              cm.flex({ align: 'center', justify: 'between' }),
              cm.sp('px', 4),
              cm.fontWeight('semibold'),
              'h-11 font-mono tabular-nums text-sm rounded-xl border transition-colors',
              isUnavailable
                ? 'bg-surface-container text-on-surface-variant/50 border-outline-variant/40 cursor-not-allowed'
                : isSelected
                  ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                  : 'bg-surface text-on-surface border-outline-variant hover:bg-primary/5 hover:border-primary',
            )}
          >
            <span>{formatTime(slot.start)}</span>
            {isSelected ? (
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                check_circle
              </span>
            ) : isUnavailable ? (
              <span className={cm.cn(cm.textSize('xs'), 'uppercase tracking-widest font-bold')}>
                {t('timeSlotPicker.unavailable', {}, { defaultValue: 'Booked' })}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

export default TimeSlotPicker
