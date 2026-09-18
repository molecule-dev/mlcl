import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const STATUS_OPTIONS = ['open', 'pending', 'on_hold', 'resolved', 'closed'] as const

function TicketInfoBar({
  ticket,
  onStatusChange,
  statusUpdating,
}: {
  ticket: { priority: string; status: string; sla_due_at?: string }
  onStatusChange?: (status: string) => void | Promise<void>
  statusUpdating?: boolean
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const slaMs = ticket.sla_due_at ? new Date(ticket.sla_due_at).getTime() - Date.now() : null
  const slaText =
    slaMs === null
      ? t('common.notAvailable', {}, { defaultValue: '—' })
      : slaMs <= 0
        ? t('status.overdue', {}, { defaultValue: 'Overdue' })
        : t(
            'ticketInfoBar.slaRemaining',
            { time: `${Math.floor(slaMs / 3600000)}h ${Math.floor((slaMs % 3600000) / 60000)}m` },
            { defaultValue: '{{time}} remaining' },
          )
  const windowMs = 4 * 3600000
  const barPct =
    slaMs === null
      ? 40
      : slaMs <= 0
        ? 100
        : Math.min(96, Math.max(14, Math.round(100 * (1 - Math.min(1, slaMs / windowMs)))))
  return (
    <div
      className={cm.cn(
        cm.flex({ wrap: 'wrap', align: 'center', justify: 'between', gap: 4 }),
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-2xl shadow-sm dark:shadow-none',
      )}
    >
      <div className={cm.flex({ align: 'center', wrap: 'wrap', gap: 4 })}>
        <span
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.roundedFull,
            cm.fontWeight('bold'),
            'text-[11px] uppercase tracking-wider bg-error-container text-on-error-container',
          )}
          data-mol-id="badge-priority"
        >
          {ticket.priority}
        </span>
        <span
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.roundedFull,
            cm.fontWeight('bold'),
            'text-[11px] uppercase tracking-wider bg-secondary-container text-on-secondary-container',
          )}
          data-mol-id="badge-status"
        >
          {ticket.status}
        </span>
        {onStatusChange ? (
          <select
            data-mol-id="status-select"
            value={ticket.status}
            disabled={statusUpdating}
            onChange={(e) => void onStatusChange(e.target.value)}
            aria-label={t(
              'ticketInfoBar.changeStatus',
              {},
              { defaultValue: 'Change ticket status' },
            )}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.textSize('xs'),
              cm.fontWeight('medium'),
              'rounded-lg border border-outline-variant bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50',
            )}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        ) : null}
      </div>
      <div className={cm.cn(cm.flex({ direction: 'col', align: 'end', gap: 2 }), 'min-w-[200px]')}>
        <div
          className={cm.cn(
            cm.flex({ justify: 'between', align: 'center', gap: 3 }),
            cm.w('full'),
            cm.fontWeight('semibold'),
            'text-[11px] text-on-surface-variant',
          )}
        >
          <span>{t('ticketInfoBar.slaLabel', {}, { defaultValue: 'SLA Response' })}</span>
          <span className={cm.textPrimary}>{slaText}</span>
        </div>
        <div
          className={cm.cn(
            cm.w('full'),
            cm.roundedFull,
            'h-1.5 bg-surface-container-high overflow-hidden',
          )}
        >
          <div
            className={cm.cn(
              cm.h('full'),
              cm.roundedFull,
              'bg-primary-container transition-all duration-500',
            )}
            style={{ width: `${barPct}%` }}
          />
        </div>
      </div>
    </div>
  )
}

export default TicketInfoBar
export { TicketInfoBar }
