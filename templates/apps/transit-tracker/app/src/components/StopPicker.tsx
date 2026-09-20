import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { StopSummary } from './StopListItem.js'

/**
 * Origin/destination select for the TripPlanner. A plain <select> over the
 * full stop list (a few dozen stops) with the code shown in the option
 * label — the most accessible control for the job, no combobox machinery.
 */
export function StopPicker({
  label,
  value,
  onChange,
  stops,
  dataMolId,
}: {
  label: string
  value: string
  onChange: (code: string) => void
  stops: StopSummary[]
  dataMolId: string
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <label className={cm.flex({ direction: 'col', gap: 'xs' })}>
      <span
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          'uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-mol-id={dataMolId}
        className={cm.cn(
          cm.sp('px', 4),
          cm.sp('py', 3),
          cm.fontWeight('semibold'),
          'bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors',
        )}
      >
        <option value="">
          {t('stopPicker.chooseStop', {}, { defaultValue: 'Choose a stop…' })}
        </option>
        {stops.map((stop) => (
          <option key={stop.code} value={stop.code}>
            {stop.name} ({stop.code})
          </option>
        ))}
      </select>
    </label>
  )
}
