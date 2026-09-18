import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function TicketBreadcrumbHeader({ ticket }: { ticket: { id: string; subject: string } }) {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div className={cm.stack(3)}>
      <nav
        className={cm.cn(
          cm.flex({ align: 'center' }),
          cm.textSize('xs'),
          cm.fontWeight('medium'),
          'gap-2 text-outline',
        )}
      >
        <Link to="/tickets" className={cm.cn('hover:text-primary cursor-pointer')}>
          {t('ticketBreadcrumbHeader.tickets', {}, { defaultValue: 'Tickets' })}
        </Link>
        <span
          className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
          data-icon="chevron_right"
        >
          chevron_right
        </span>
        <span className={cm.cn('text-on-surface-variant')}>{ticket.id.toUpperCase()}</span>
      </nav>
      <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'text-on-surface')}>
        {t(
          'ticketBreadcrumbHeader.title',
          { id: ticket.id.toUpperCase(), subject: ticket.subject },
          { defaultValue: '{{id}}: {{subject}}' },
        )}
      </h1>
    </div>
  )
}
export default TicketBreadcrumbHeader
export { TicketBreadcrumbHeader }
