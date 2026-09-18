import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export default function TicketsFab() {
  const navigate = useNavigate()
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn('fixed bottom-8 right-8 md:hidden')}>
      <button
        className={cm.cn(
          cm.w(14),
          cm.h(14),
          cm.roundedFull,
          cm.flex({ align: 'center', justify: 'center' }),
          'bg-primary text-on-primary shadow-2xl hover:scale-105 transition-transform active:scale-95',
        )}
        onClick={() => navigate('/tickets/new')}
        aria-label={t('ticketsFab.newTicket', {}, { defaultValue: 'New ticket' })}
      >
        <span className={cm.cn(cm.textSize('3xl'), 'material-symbols-outlined')}>add</span>
      </button>
    </div>
  )
}

export { TicketsFab }
