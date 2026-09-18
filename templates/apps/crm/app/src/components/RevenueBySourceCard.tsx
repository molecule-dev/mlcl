import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function RevenueBySourceCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <section
      className={cm.cn(
        cm.sp('p', 6),
        'col-span-12 lg:col-span-4 bg-surface-container-lowest rounded-3xl architectural-shadow',
      )}
    >
      <h3
        className={cm.cn(
          cm.textSize('sm'),
          cm.fontWeight('bold'),
          cm.sp('mb', 6),
          'tracking-wider text-on-surface uppercase',
        )}
      >
        {t('revenueBySourceCard.title', {}, { defaultValue: 'Revenue by Source' })}
      </h3>
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.sp('py', 4))}>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(36),
            cm.h(36),
            cm.roundedFull,
            'relative border-[12px] border-surface-container-low',
          )}
        >
          {/* Simulated donut segments using conic gradient logic if needed, but keeping it clean and structural */}
          <div
            className={cm.cn(
              cm.roundedFull,
              'absolute inset-0 border-[12px] border-primary border-r-transparent border-b-transparent -rotate-45',
            )}
          ></div>
          <div
            className={cm.cn(
              cm.roundedFull,
              'absolute inset-0 border-[12px] border-secondary border-l-transparent border-t-transparent rotate-12',
            )}
          ></div>
          <div className={cm.textCenter}>
            <p className={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'), 'text-outline')}>
              {t('revenueBySourceCard.directLabel', {}, { defaultValue: 'Inbound' })}
            </p>
            <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
              {t(
                'revenueBySourceCard.directPercentage',
                { percentage: '53%' },
                { defaultValue: '{{percentage}}' },
              )}
            </p>
          </div>
        </div>
      </div>
      <div className={cm.cn(cm.sp('mt', 6), cm.stack(3))}>
        <div className={cm.flex({ align: 'center', justify: 'between' })}>
          <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-2')}>
            <div className={cm.cn(cm.w(2.5), cm.h(2.5), cm.roundedFull, 'bg-primary')}></div>
            <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'))}>
              {t('revenueBySourceCard.inboundMarketing', {}, { defaultValue: 'Inbound Marketing' })}
            </span>
          </div>
          <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'))}>
            {t(
              'revenueBySourceCard.inboundRevenue',
              { amount: '$1.4M' },
              { defaultValue: '{{amount}}' },
            )}
          </span>
        </div>
        <div className={cm.flex({ align: 'center', justify: 'between' })}>
          <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-2')}>
            <div className={cm.cn(cm.w(2.5), cm.h(2.5), cm.roundedFull, 'bg-secondary')}></div>
            <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'))}>
              {t('revenueBySourceCard.outboundSales', {}, { defaultValue: 'Outbound Sales' })}
            </span>
          </div>
          <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'))}>
            {t(
              'revenueBySourceCard.outboundRevenue',
              { amount: '$840K' },
              { defaultValue: '{{amount}}' },
            )}
          </span>
        </div>
        <div className={cm.flex({ align: 'center', justify: 'between' })}>
          <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-2')}>
            <div
              className={cm.cn(cm.w(2.5), cm.h(2.5), cm.roundedFull, 'bg-primary-container')}
            ></div>
            <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'))}>
              {t('revenueBySourceCard.referrals', {}, { defaultValue: 'Referrals' })}
            </span>
          </div>
          <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'))}>
            {t(
              'revenueBySourceCard.referralsRevenue',
              { amount: '$410K' },
              { defaultValue: '{{amount}}' },
            )}
          </span>
        </div>
      </div>
    </section>
  )
}

export default RevenueBySourceCard
export { RevenueBySourceCard }
