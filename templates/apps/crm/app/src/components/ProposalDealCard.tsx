import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function ProposalDealCard() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        cm.accentCard({ tone: 'custom' }),
        'bg-surface-container-lowest rounded-3xl shadow-sm border border-border hover:shadow-md transition-shadow group',
      )}
      style={{
        ['--mol-accent' as string]: 'color-mix(in srgb, var(--color-secondary) 30%, transparent)',
      }}
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 2))}>
        <span
          className={cm.cn(
            cm.sp('px', 2),
            cm.fontWeight('bold'),
            cm.textPrimary,
            'text-[11px] bg-primary/5 py-0.5 rounded',
          )}
        >
          {t('proposalDealCard.clientName', { name: 'NexGen AI' }, { defaultValue: '{{name}}' })}
        </span>
        <span className={cm.cn(cm.textSize('xs'), 'font-black text-on-surface')}>
          {t('proposalDealCard.dealValue', { amount: '$280,000' }, { defaultValue: '{{amount}}' })}
        </span>
      </div>
      <h4
        className={cm.cn(
          cm.textSize('sm'),
          cm.fontWeight('bold'),
          'text-on-surface group-hover:text-primary',
        )}
      >
        {t('proposalDealCard.title', {}, { defaultValue: 'Custom AI Implementation' })}
      </h4>
      <div className={cm.cn(cm.sp('mt', 4), cm.flex({ justify: 'between', align: 'center' }))}>
        <div className={cm.cn(cm.flex(), '-space-x-2')}>
          <img
            className={cm.cn(cm.w(6), cm.h(6), cm.roundedFull, 'border-2 border-surface')}
            alt=""
            data-alt="closeup of a tech professional man with glasses, bright creative office background"
            src="https://picsum.photos/seed/ProposalDealCard-1/1200/800"
          />
        </div>
        <span className={cm.cn(cm.fontWeight('medium'), 'text-[10px] text-on-surface-variant')}>
          {t(
            'proposalDealCard.daysInStage',
            { count: 1 },
            { defaultValue: '{{count}} day in stage' },
          )}
        </span>
      </div>
    </div>
  )
}

export default ProposalDealCard
export { ProposalDealCard }
