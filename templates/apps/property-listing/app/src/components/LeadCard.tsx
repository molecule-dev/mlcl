import React from 'react'
import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function LeadCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div
      className={cm.cn(
        cm.grid({ cols: 12 }),
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-xl shadow-sm border border-border hover:shadow-md transition-shadow items-center',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'col-span-3')}>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.h(10),
            cm.w(10),
            cm.roundedFull,
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'bg-primary-container text-on-primary-container',
          )}
        >
          {t('leadCard.initials', { initials: 'SW' }, { defaultValue: '{{initials}}' })}
        </div>
        <div>
          <h3 className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'), 'text-on-surface')}>
            {t('leadCard.contactName', { name: 'Susan Wright' }, { defaultValue: '{{name}}' })}
          </h3>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t(
              'leadCard.contactEmail',
              { email: 'susan.wright@mail.com' },
              { defaultValue: '{{email}}' },
            )}
          </p>
        </div>
      </div>
      <div className={cm.cn('col-span-3')}>
        <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-on-surface')}>
          {t(
            'leadCard.propertyName',
            { property: 'Suburban Ranch Home' },
            { defaultValue: '{{property}}' },
          )}
        </p>
        <p
          className={cm.cn(cm.fontWeight('semibold'), cm.textSize('xs'), 'text-on-surface-variant')}
        >
          {t(
            'leadCard.communityName',
            { community: 'Green Valley Estate' },
            { defaultValue: '{{community}}' },
          )}
        </p>
      </div>
      <div className={cm.cn('col-span-2')}>
        <span
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 1),
            'rounded-md',
            cm.fontWeight('bold'),
            'bg-secondary-container text-on-secondary-container',
            cm.textSize('xs'),
            'uppercase tracking-wider',
          )}
        >
          {t('leadCard.qualifiedStatus', {}, { defaultValue: 'Qualified' })}
        </span>
      </div>
      <div className={cm.cn(cm.textSize('sm'), 'col-span-2 text-on-surface-variant')}>
        {t('leadCard.lastContactDate', { date: 'Oct 19, 2023' }, { defaultValue: '{{date}}' })}
      </div>
      <div className={cm.cn(cm.flex({ justify: 'end', gap: 'sm' }), 'col-span-2')}>
        <button
          onClick={() => navigate('/leads/detail')}
          aria-label={t('leadCard.viewLead', {}, { defaultValue: 'View lead' })}
          className={cm.cn(
            cm.sp('p', 2),
            'bg-surface-container-low rounded-lg hover:bg-primary-fixed transition-colors text-primary',
          )}
        >
          <span
            className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}
            data-icon="visibility"
          >
            visibility
          </span>
        </button>
        <button
          onClick={() => navigate('/messages')}
          aria-label={t('leadCard.messageLead', {}, { defaultValue: 'Message lead' })}
          className={cm.cn(
            cm.sp('p', 2),
            'bg-surface-container-low rounded-lg hover:bg-primary-fixed transition-colors text-primary',
          )}
        >
          <span
            className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}
            data-icon="chat_bubble_outline"
          >
            chat_bubble_outline
          </span>
        </button>
      </div>
    </div>
  )
}

export default LeadCard
export { LeadCard }
