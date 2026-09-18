import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

// Custom webhook + API connectors are not implemented yet. Buttons are
// disabled so users see the catalogue without firing fake requests.
function IntegrationsCustomSection() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div data-mol-id="custom-group">
      <div className={cm.cn(cm.flex({ align: 'center' }), cm.sp('mb', 6), 'gap-4')}>
        <h3
          className={cm.cn(
            cm.textSize('2xl'),
            cm.fontWeight('bold'),
            'font-headline tracking-tight',
          )}
        >
          {t('integrationsCustom.sectionTitle', {}, { defaultValue: 'Custom & Webhooks' })}
        </h3>
        <div className={cm.cn(cm.flex1, 'h-px bg-outline-variant/20')}></div>
      </div>
      <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}>
        {/* Webhook */}
        <article
          className={cm.cn(
            cm.sp('p', 6),
            'group bg-surface-container-lowest rounded-[1.5rem] transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5',
          )}
          data-mol-id="card-webhook"
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
            <span
              className={cm.cn(cm.textSize('3xl'), cm.textPrimary, 'material-symbols-outlined')}
            >
              webhook
            </span>
          </div>
          <h4 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 2))}>
            {t('integrationsCustom.webhookTitle', {}, { defaultValue: 'Webhooks' })}
          </h4>
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('mb', 6),
              'text-on-surface-variant leading-relaxed',
            )}
          >
            {t(
              'integrationsCustom.webhookDescription',
              {},
              {
                defaultValue:
                  'Trigger custom HTTP requests to any external service on specific chat events.',
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
        {/* API */}
        <article
          className={cm.cn(
            cm.sp('p', 6),
            'group bg-surface-container-lowest rounded-[1.5rem] transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5',
          )}
          data-mol-id="card-api"
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
            <span
              className={cm.cn(cm.textSize('3xl'), cm.textPrimary, 'material-symbols-outlined')}
            >
              api
            </span>
          </div>
          <h4 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 2))}>
            {t('integrationsCustom.apiTitle', {}, { defaultValue: 'Custom API' })}
          </h4>
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('mb', 6),
              'text-on-surface-variant leading-relaxed',
            )}
          >
            {t(
              'integrationsCustom.apiDescription',
              {},
              {
                defaultValue:
                  'Full access to our REST API for bespoke enterprise integrations and data flow.',
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

export default IntegrationsCustomSection
export { IntegrationsCustomSection }
