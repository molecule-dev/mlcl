import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

type Status = 'planned' | 'booked' | 'delayed' | 'rebooked' | 'cancelled'

/** Colour-coded status of a booking or trip. */
export function BookingStatusPill({
  status,
  delayMinutes,
}: {
  status: Status
  delayMinutes?: number
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const label: Record<Status, string> = {
    planned: t('status.planned', {}, { defaultValue: 'Planned' }),
    booked: t('status.booked', {}, { defaultValue: 'Booked' }),
    delayed: t(
      'status.delayed',
      { minutes: delayMinutes ?? 0 },
      { defaultValue: 'Delayed {{minutes}} min' },
    ),
    rebooked: t('status.rebooked', {}, { defaultValue: 'Rebooked' }),
    cancelled: t('status.cancelled', {}, { defaultValue: 'Cancelled' }),
  }
  const tone: Record<Status, string> = {
    planned: 'bg-surface-secondary text-foreground border-border',
    booked: 'bg-success/15 text-success border-success/30',
    delayed: 'bg-warning/15 text-warning border-warning/30',
    rebooked: 'bg-primary/15 text-primary border-primary/30',
    cancelled: 'bg-error/15 text-error border-error/30',
  }
  return (
    <span
      data-mol-id={`status-${status}`}
      className={cm.cn(
        cm.roundedFull,
        cm.textSize('xs'),
        cm.fontWeight('bold'),
        cm.sp('px', 3),
        cm.sp('py', 1),
        'uppercase tracking-widest border',
        tone[status],
      )}
    >
      {label[status]}
    </span>
  )
}
