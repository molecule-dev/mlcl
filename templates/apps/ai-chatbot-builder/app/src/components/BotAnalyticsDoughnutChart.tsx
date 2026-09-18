import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export default function BotAnalyticsDoughnutChart() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.sp('p', 8),
        'glass-card rounded-[2rem] border border-surface shadow-sm',
      )}
      data-mol-id="doughnut-chart"
    >
      <h4
        className={cm.cn(
          cm.textSize('lg'),
          cm.fontWeight('bold'),
          cm.sp('mb', 2),
          'text-on-surface',
        )}
      >
        {t('botAnalyticsDoughnutChart.title', {}, { defaultValue: 'Resolution by Channel' })}
      </h4>
      <p className={cm.cn(cm.textSize('sm'), cm.sp('mb', 10), 'text-outline')}>
        {t(
          'botAnalyticsDoughnutChart.subtitle',
          {},
          { defaultValue: 'Usage distribution across platforms' },
        )}
      </p>
      <div className={cm.cn(cm.flex({ justify: 'center', align: 'center' }), cm.flex1, 'relative')}>
        {/* Doughnut Visual */}
        <div
          className={cm.cn(
            cm.w(48),
            cm.h(48),
            cm.roundedFull,
            cm.flex({ align: 'center', justify: 'center' }),
            'border-[20px] border-primary-container relative',
          )}
        >
          <div
            className={cm.cn(
              cm.roundedFull,
              'absolute inset-[-20px] border-[20px] border-tertiary-fixed-dim border-l-transparent border-b-transparent rotate-[20deg]',
            )}
          ></div>
          <div
            className={cm.cn(
              cm.roundedFull,
              'absolute inset-[-20px] border-[20px] border-secondary-container border-t-transparent border-l-transparent border-r-transparent -rotate-[60deg]',
            )}
          ></div>
          <div className={cm.textCenter}>
            <span className={cm.cn(cm.textSize('3xl'), 'font-extrabold text-on-surface')}>
              {t('common.percentage', { percent: 100 }, { defaultValue: '{{percent}}%' })}
            </span>
            <p className={cm.cn(cm.fontWeight('bold'), 'text-[10px] uppercase text-outline')}>
              {t(
                'botAnalyticsDoughnutChart.totalActiveLabel',
                {},
                { defaultValue: 'Total Active' },
              )}
            </p>
          </div>
        </div>
      </div>
      <div className={cm.cn(cm.sp('mt', 10), cm.stack(3))}>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.textSize('sm'))}>
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <span
              className={cm.cn(cm.w(3), cm.h(3), cm.roundedFull, 'bg-primary-container')}
            ></span>
            <span className={cm.cn(cm.fontWeight('medium'), 'text-on-surface')}>
              {t('botAnalyticsDoughnutChart.channelWeb', {}, { defaultValue: 'Web' })}
            </span>
          </div>
          <span className={cm.fontWeight('bold')}>
            {t('common.percentage', { percent: 45 }, { defaultValue: '{{percent}}%' })}
          </span>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.textSize('sm'))}>
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <span
              className={cm.cn(cm.w(3), cm.h(3), cm.roundedFull, 'bg-tertiary-fixed-dim')}
            ></span>
            <span className={cm.cn(cm.fontWeight('medium'), 'text-on-surface')}>
              {t('botAnalyticsDoughnutChart.channelMobile', {}, { defaultValue: 'Mobile' })}
            </span>
          </div>
          <span className={cm.fontWeight('bold')}>
            {t('common.percentage', { percent: 35 }, { defaultValue: '{{percent}}%' })}
          </span>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.textSize('sm'))}>
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <span
              className={cm.cn(cm.w(3), cm.h(3), cm.roundedFull, 'bg-secondary-container')}
            ></span>
            <span className={cm.cn(cm.fontWeight('medium'), 'text-on-surface')}>
              {t('botAnalyticsDoughnutChart.channelApi', {}, { defaultValue: 'API' })}
            </span>
          </div>
          <span className={cm.fontWeight('bold')}>
            {t('common.percentage', { percent: 20 }, { defaultValue: '{{percent}}%' })}
          </span>
        </div>
      </div>
    </div>
  )
}
export { BotAnalyticsDoughnutChart }
