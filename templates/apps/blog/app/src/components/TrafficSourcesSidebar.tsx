import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
function TrafficSourcesSidebar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        'col-span-12 lg:col-span-4 bg-surface-container-lowest rounded-xl shadow-sm',
        cm.flex({ direction: 'col' }),
        cm.sp('p', 8),
      )}
    >
      <h4
        className={cm.cn(
          "font-['Newsreader']",
          cm.textSize('xl'),
          cm.fontWeight('bold'),
          cm.sp('mb', 8),
        )}
      >
        {t('trafficSourcesSidebar.trafficSources', {}, { defaultValue: 'Traffic Sources' })}
      </h4>
      <div className={cm.stack(6)}>
        <div className={cm.stack(2)}>
          <div
            className={cm.cn(
              cm.flex({ justify: 'between' }),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            <span>{t('trafficSourcesSidebar.direct', {}, { defaultValue: 'Direct' })}</span>
            <span>
              {t(
                'trafficSourcesSidebar.percentageDisplay',
                { percent: 45 },
                { defaultValue: '{{percent}}%' },
              )}
            </span>
          </div>
          <div
            className={cm.cn(
              cm.h(2),
              cm.w('full'),
              cm.roundedFull,
              'bg-surface-container overflow-hidden',
            )}
          >
            <div className={cm.cn(cm.h('full'), 'bg-primary')} style={{ width: '45%' }}></div>
          </div>
        </div>
        <div className={cm.stack(2)}>
          <div
            className={cm.cn(
              cm.flex({ justify: 'between' }),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            <span>{t('common.search', {}, { defaultValue: 'Search' })}</span>
            <span>
              {t(
                'trafficSourcesSidebar.percentageDisplay',
                { percent: 30 },
                { defaultValue: '{{percent}}%' },
              )}
            </span>
          </div>
          <div
            className={cm.cn(
              cm.h(2),
              cm.w('full'),
              cm.roundedFull,
              'bg-surface-container overflow-hidden',
            )}
          >
            <div
              className={cm.cn(cm.h('full'), 'bg-primary opacity-70')}
              style={{ width: '30%' }}
            ></div>
          </div>
        </div>
        <div className={cm.stack(2)}>
          <div
            className={cm.cn(
              cm.flex({ justify: 'between' }),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            <span>{t('trafficSourcesSidebar.social', {}, { defaultValue: 'Social' })}</span>
            <span>
              {t(
                'trafficSourcesSidebar.percentageDisplay',
                { percent: 15 },
                { defaultValue: '{{percent}}%' },
              )}
            </span>
          </div>
          <div
            className={cm.cn(
              cm.h(2),
              cm.w('full'),
              cm.roundedFull,
              'bg-surface-container overflow-hidden',
            )}
          >
            <div
              className={cm.cn(cm.h('full'), 'bg-primary opacity-40')}
              style={{ width: '15%' }}
            ></div>
          </div>
        </div>
        <div className={cm.stack(2)}>
          <div
            className={cm.cn(
              cm.flex({ justify: 'between' }),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            <span>{t('trafficSourcesSidebar.referral', {}, { defaultValue: 'Referral' })}</span>
            <span>
              {t(
                'trafficSourcesSidebar.percentageDisplay',
                { percent: 10 },
                { defaultValue: '{{percent}}%' },
              )}
            </span>
          </div>
          <div
            className={cm.cn(
              cm.h(2),
              cm.w('full'),
              cm.roundedFull,
              'bg-surface-container overflow-hidden',
            )}
          >
            <div
              className={cm.cn(cm.h('full'), 'bg-primary opacity-20')}
              style={{ width: '10%' }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TrafficSourcesSidebar
export { TrafficSourcesSidebar }
