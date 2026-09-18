import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function TicketCustomerInfoCard({
  ticket,
}: {
  ticket: {
    requester_name?: string
    customer_company?: string
    customer_plan?: string
    customer_ticket_count?: number
    customer_satisfaction?: number
  }
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const initials =
    (ticket.requester_name ?? '')
      .split(' ')
      .map((n) => n[0] ?? '')
      .join('')
      .toUpperCase()
      .slice(0, 2) || t('ticketCustomerInfoCard.unknownInitials', {}, { defaultValue: '?' })
  return (
    <div
      className={cm.cn(
        cm.sp('p', 8),
        cm.stack(6),
        'bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/10',
      )}
    >
      <h3
        className={cm.cn(
          cm.textSize('xl'),
          cm.fontWeight('bold'),
          cm.flex({ align: 'center', gap: 2 }),
          'text-on-surface',
        )}
      >
        <span
          className={cm.cn(cm.textPrimary, cm.textSize('sm'), 'material-symbols-outlined')}
          data-icon="person"
        >
          person
        </span>
        {t('ticketCustomerInfoCard.title', {}, { defaultValue: 'Customer Information' })}
      </h3>
      <div className={cm.flex({ align: 'center', gap: 4 })}>
        <div
          className={cm.cn(
            cm.w(12),
            cm.h(12),
            cm.flex({ align: 'center', justify: 'center' }),
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            'rounded-xl bg-surface-secondary text-foreground-tertiary',
          )}
        >
          {initials}
        </div>
        <div>
          <div className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}>
            {ticket.customer_company ?? t('settings.unknown', {}, { defaultValue: 'Unknown' })}
          </div>
          <div
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textPrimary,
              'text-[10px] uppercase tracking-wider',
            )}
          >
            {ticket.customer_plan ?? ''}
          </div>
        </div>
      </div>
      <div className={cm.cn(cm.grid({ cols: 2, gap: 'md' }))}>
        <div
          className={cm.cn(cm.sp('p', 3), cm.textCenter, 'bg-surface-container-low rounded-2xl')}
        >
          <div className={cm.cn(cm.textSize('lg'), 'font-extrabold text-on-surface')}>
            {ticket.customer_ticket_count ?? 0}
          </div>
          <div className={cm.cn(cm.fontWeight('medium'), 'text-[10px] text-outline')}>
            {t('ticketCustomerInfoCard.previousTickets', {}, { defaultValue: 'Previous Tickets' })}
          </div>
        </div>
        <div
          className={cm.cn(cm.sp('p', 3), cm.textCenter, 'bg-surface-container-low rounded-2xl')}
        >
          <div className={cm.cn(cm.textSize('lg'), 'font-extrabold text-on-surface')}>
            {ticket.customer_satisfaction != null
              ? t(
                  'ticketCustomerInfoCard.satisfactionValue',
                  { value: ticket.customer_satisfaction },
                  { defaultValue: '{{value}}%' },
                )
              : t('common.notAvailable', {}, { defaultValue: '—' })}
          </div>
          <div className={cm.cn(cm.fontWeight('medium'), 'text-[10px] text-outline')}>
            {t('ticketCustomerInfoCard.satisfaction', {}, { defaultValue: 'Satisfaction' })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TicketCustomerInfoCard
export { TicketCustomerInfoCard }
