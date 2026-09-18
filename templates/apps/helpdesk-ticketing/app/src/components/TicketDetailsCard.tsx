import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface TicketDetailsCardProps {
  ticket: {
    requester_name?: string
    requester_email?: string
    assignee_name?: string
    team_name?: string
    channel?: string
    created_at: string
    tags?: string[]
  }
}

function TicketDetailsCard({ ticket }: TicketDetailsCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
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
          className={cm.cn(cm.textPrimary, cm.textSize('xl'), 'material-symbols-outlined')}
          data-icon="info"
        >
          info
        </span>

        {t('ticketDetailsCard.title', {}, { defaultValue: 'Ticket Details' })}
      </h3>
      <div className={cm.stack(4)}>
        <div className={cm.cn(cm.flex({ justify: 'between' }), cm.textSize('xs'))}>
          <span className={cm.cn('text-outline')}>
            {t('ticketDetailsCard.requesterLabel', {}, { defaultValue: 'Requester' })}
          </span>
          <span className={cm.cn(cm.fontWeight('semibold'), cm.textRight, 'text-on-surface')}>
            {ticket.requester_name ?? t('settings.unknown', {}, { defaultValue: 'Unknown' })}
            <br />
            <span className={cm.cn(cm.fontWeight('normal'), 'text-[10px] text-outline')}>
              {ticket.requester_email ?? ''}
            </span>
          </span>
        </div>
        <div className={cm.cn(cm.flex({ justify: 'between' }), cm.textSize('xs'))}>
          <span className={cm.cn('text-outline')}>
            {t('ticketDetailsCard.assigneeLabel', {}, { defaultValue: 'Assignee' })}
          </span>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
            <span className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
              {ticket.assignee_name ?? t('status.unassigned', {}, { defaultValue: 'Unassigned' })}
            </span>
            <div className={cm.cn(cm.w(5), cm.h(5), cm.roundedFull, 'bg-primary-fixed')}></div>
          </div>
        </div>
        <div className={cm.cn(cm.flex({ justify: 'between' }), cm.textSize('xs'))}>
          <span className={cm.cn('text-outline')}>
            {t('nav.team', {}, { defaultValue: 'Team' })}
          </span>
          <span className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
            {ticket.team_name ?? t('common.notAvailable', {}, { defaultValue: '—' })}
          </span>
        </div>
        <div className={cm.cn(cm.flex({ justify: 'between' }), cm.textSize('xs'))}>
          <span className={cm.cn('text-outline')}>
            {t('ticketDetailsCard.channelLabel', {}, { defaultValue: 'Channel' })}
          </span>
          <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-1.5')}>
            <span
              className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
              data-icon="mail"
            >
              mail
            </span>
            <span className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
              {ticket.channel ?? t('common.notAvailable', {}, { defaultValue: '—' })}
            </span>
          </div>
        </div>
        <div className={cm.cn(cm.flex({ justify: 'between' }), cm.textSize('xs'))}>
          <span className={cm.cn('text-outline')}>
            {t('ticketDetailsCard.createdLabel', {}, { defaultValue: 'Created' })}
          </span>
          <span className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
            {t(
              'ticketDetailsCard.createdValue',
              {
                date: new Date(ticket.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                }),
              },
              { defaultValue: '{{date}}' },
            )}
          </span>
        </div>
        <div className={cm.cn(cm.sp('pt', 2), cm.stack(2))}>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase text-outline tracking-wider',
            )}
          >
            {t('form.tags', {}, { defaultValue: 'Tags' })}
          </span>
          <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 2 }))}>
            {(ticket.tags ?? []).map((tag) => (
              <span
                key={tag}
                className={cm.cn(
                  cm.sp('px', 2),
                  cm.sp('py', 1),
                  cm.fontWeight('medium'),
                  'bg-surface-container rounded-lg text-[10px] text-on-surface-variant',
                )}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TicketDetailsCard
export { TicketDetailsCard }
