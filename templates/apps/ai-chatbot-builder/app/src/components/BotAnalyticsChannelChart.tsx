import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function BotAnalyticsChannelChart() {
  const cm = getClassMap()
  const { t } = useTranslation()
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
        {t('botAnalyticsChannelChart.title', {}, { defaultValue: 'Traffic by Channel' })}
      </h4>
      <p className={cm.cn(cm.textSize('sm'), cm.sp('mb', 10), 'text-outline')}>
        {t(
          'botAnalyticsChannelChart.subtitle',
          {},
          { defaultValue: 'Usage distribution across platforms' },
        )}
      </p>
      <div className={cm.cn(cm.flex({ justify: 'center', align: 'center' }), cm.flex1, 'relative')}>
        {/* Doughnut Visual */}
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.roundedFull,
            cm.w(48),
            cm.h(48),
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
              {t('botAnalyticsChannelChart.totalPercent', {}, { defaultValue: '100%' })}
            </span>
            <p className={cm.cn(cm.fontWeight('bold'), 'text-[10px] uppercase text-outline')}>
              {t('botAnalyticsChannelChart.totalLabel', {}, { defaultValue: 'Total Active' })}
            </p>
          </div>
        </div>
      </div>
      <div className={cm.cn(cm.sp('mt', 10), cm.stack(3))}>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.textSize('sm'))}>
          <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-2')}>
            <span
              className={cm.cn(cm.w(3), cm.h(3), cm.roundedFull, 'bg-primary-container')}
            ></span>
            <span className={cm.cn(cm.fontWeight('medium'), 'text-on-surface')}>
              {t('botAnalyticsChannelChart.channelWeb', {}, { defaultValue: 'Web' })}
            </span>
          </div>
          <span className={cm.fontWeight('bold')}>
            {t(
              'botAnalyticsChannelChart.webShare',
              { percent: 45 },
              { defaultValue: '{{percent}}%' },
            )}
          </span>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.textSize('sm'))}>
          <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-2')}>
            <span
              className={cm.cn(cm.w(3), cm.h(3), cm.roundedFull, 'bg-tertiary-fixed-dim')}
            ></span>
            <span className={cm.cn(cm.fontWeight('medium'), 'text-on-surface')}>
              {t('botAnalyticsChannelChart.channelMobile', {}, { defaultValue: 'Mobile' })}
            </span>
          </div>
          <span className={cm.fontWeight('bold')}>
            {t(
              'botAnalyticsChannelChart.mobileShare',
              { percent: 35 },
              { defaultValue: '{{percent}}%' },
            )}
          </span>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.textSize('sm'))}>
          <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-2')}>
            <span
              className={cm.cn(cm.w(3), cm.h(3), cm.roundedFull, 'bg-secondary-container')}
            ></span>
            <span className={cm.cn(cm.fontWeight('medium'), 'text-on-surface')}>
              {t('botAnalyticsChannelChart.channelApi', {}, { defaultValue: 'API' })}
            </span>
          </div>
          <span className={cm.fontWeight('bold')}>
            {t(
              'botAnalyticsChannelChart.apiShare',
              { percent: 20 },
              { defaultValue: '{{percent}}%' },
            )}
          </span>
        </div>
      </div>
    </div>
  )
}
export default BotAnalyticsChannelChart
export { BotAnalyticsChannelChart }
