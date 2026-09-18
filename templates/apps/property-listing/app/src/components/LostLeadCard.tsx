import React from 'react'
import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function LostLeadCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        cm.grid({ cols: 12 }),
        'bg-surface-container-lowest rounded-xl shadow-sm border border-border hover:shadow-md transition-shadow items-center opacity-70 grayscale-[0.5]',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'col-span-3')}>
        <div
          className={cm.cn(
            cm.h(10),
            cm.w(10),
            cm.roundedFull,
            cm.flex({ align: 'center', justify: 'center' }),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'bg-surface-variant text-on-surface-variant',
          )}
        >
          {t('lostLeadCard.initials', { initials: 'JM' }, { defaultValue: '{{initials}}' })}
        </div>
        <div>
          <h3 className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'), 'text-on-surface')}>
            {t('lostLeadCard.name', { name: 'James Miller' }, { defaultValue: '{{name}}' })}
          </h3>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t('lostLeadCard.email', { email: 'james@miller.net' }, { defaultValue: '{{email}}' })}
          </p>
        </div>
      </div>
      <div className={cm.cn('col-span-3')}>
        <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-on-surface')}>
          {t(
            'lostLeadCard.property',
            { property: 'Mountain View Estate' },
            { defaultValue: '{{property}}' },
          )}
        </p>
        <p
          className={cm.cn(cm.fontWeight('semibold'), cm.textSize('xs'), 'text-on-surface-variant')}
        >
          {t(
            'lostLeadCard.location',
            { location: 'Alpine Peaks' },
            { defaultValue: '{{location}}' },
          )}
        </p>
      </div>
      <div className={cm.cn('col-span-2')}>
        <span
          className={cm.cn(
            cm.sp('px', 2),
            cm.sp('py', 1),
            'rounded-md',
            cm.fontWeight('bold'),
            cm.textSize('xs'),
            'bg-surface-container-high text-on-surface-variant uppercase tracking-wider',
          )}
        >
          {t('lostLeadCard.status', {}, { defaultValue: 'Lost' })}
        </span>
      </div>
      <div className={cm.cn(cm.textSize('sm'), 'col-span-2 text-on-surface-variant')}>
        {t('lostLeadCard.date', { date: 'Oct 12, 2023' }, { defaultValue: '{{date}}' })}
      </div>
      <div className={cm.cn(cm.flex({ justify: 'end', gap: 'sm' }), 'col-span-2')}>
        <button
          type="button"
          onClick={() => navigate('/admin/leads')}
          aria-label={t('lostLeadCard.viewLead', {}, { defaultValue: 'View lead' })}
          className={cm.cn(
            cm.sp('p', 2),
            cm.textPrimary,
            'bg-surface-container-low rounded-lg hover:bg-primary-fixed transition-colors',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-[20px]')} data-icon="visibility">
            visibility
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            window.location.href = 'mailto:james@miller.net?subject=Property%20inquiry'
          }}
          aria-label={t('lostLeadCard.messageLead', {}, { defaultValue: 'Message lead' })}
          className={cm.cn(
            cm.sp('p', 2),
            cm.textPrimary,
            'bg-surface-container-low rounded-lg hover:bg-primary-fixed transition-colors',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined text-[20px]')}
            data-icon="chat_bubble_outline"
          >
            chat_bubble_outline
          </span>
        </button>
      </div>
    </div>
  )
}

export default LostLeadCard
export { LostLeadCard }
