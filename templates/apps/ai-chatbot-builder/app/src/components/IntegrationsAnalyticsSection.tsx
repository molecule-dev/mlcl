import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

// Analytics connectors are not implemented yet — buttons are disabled.
function IntegrationsAnalyticsSection() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div data-mol-id="analytics-group">
      <div className={cm.cn(cm.flex({ align: 'center' }), cm.sp('mb', 6), 'gap-4')}>
        <h3
          className={cm.cn(
            cm.textSize('2xl'),
            cm.fontWeight('bold'),
            'font-headline tracking-tight',
          )}
        >
          {t('nav.analytics', {}, { defaultValue: 'Analytics' })}
        </h3>
        <div className={cm.cn(cm.flex1, 'h-px bg-outline-variant/20')}></div>
      </div>
      <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'sm:grid-cols-2 lg:grid-cols-4')}>
        {/* Google Analytics */}
        <article
          className={cm.cn(
            cm.sp('p', 6),
            'group bg-surface-container-lowest rounded-[1.5rem] transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5',
          )}
          data-mol-id="card-google-analytics"
        >
          <div
            className={cm.cn(
              cm.w(14),
              cm.h(14),
              cm.flex({ align: 'center', justify: 'center' }),
              cm.sp('mb', 5),
              'rounded-2xl bg-surface-container-high group-hover:scale-110 transition-transform',
            )}
          >
            <span className={cm.cn(cm.textSize('3xl'), 'material-symbols-outlined text-[#F4B400]')}>
              analytics
            </span>
          </div>
          <h4 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 2))}>
            {t(
              'integrationsAnalytics.googleAnalyticsTitle',
              {},
              { defaultValue: 'Google Analytics' },
            )}
          </h4>
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('mb', 6),
              'text-on-surface-variant leading-relaxed',
            )}
          >
            {t(
              'integrationsAnalytics.googleAnalyticsDescription',
              {},
              {
                defaultValue:
                  'Track conversion events and user behavior flow within your bot interface.',
              },
            )}
          </p>
          <button
            type="button"
            disabled
            title={t(
              'common.comingSoonHint',
              {},
              { defaultValue: 'This integration is not available yet.' },
            )}
            className={cm.cn(
              cm.w('full'),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'rounded-xl bg-surface-container-high text-on-surface-variant cursor-not-allowed',
            )}
          >
            {t('common.comingSoon', {}, { defaultValue: 'Coming soon' })}
          </button>
        </article>
        {/* Mixpanel */}
        <article
          className={cm.cn(
            cm.sp('p', 6),
            'group bg-surface-container-lowest rounded-[1.5rem] transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5',
          )}
          data-mol-id="card-mixpanel"
        >
          <div
            className={cm.cn(
              cm.w(14),
              cm.h(14),
              cm.flex({ align: 'center', justify: 'center' }),
              cm.sp('mb', 5),
              'rounded-2xl bg-surface-container-high group-hover:scale-110 transition-transform',
            )}
          >
            <span className={cm.cn(cm.textSize('3xl'), 'material-symbols-outlined text-[#A133FF]')}>
              bar_chart_4_bars
            </span>
          </div>
          <h4 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 2))}>
            {t('integrationsAnalytics.mixpanelTitle', {}, { defaultValue: 'Mixpanel' })}
          </h4>
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('mb', 6),
              'text-on-surface-variant leading-relaxed',
            )}
          >
            {t(
              'integrationsAnalytics.mixpanelDescription',
              {},
              {
                defaultValue:
                  "Deep-dive into event-based analytics to optimize your bot's performance.",
              },
            )}
          </p>
          <button
            type="button"
            disabled
            title={t(
              'common.comingSoonHint',
              {},
              { defaultValue: 'This integration is not available yet.' },
            )}
            className={cm.cn(
              cm.w('full'),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'rounded-xl bg-surface-container-high text-on-surface-variant cursor-not-allowed',
            )}
          >
            {t('common.comingSoon', {}, { defaultValue: 'Coming soon' })}
          </button>
        </article>
      </div>
    </div>
  )
}

export default IntegrationsAnalyticsSection
export { IntegrationsAnalyticsSection }
