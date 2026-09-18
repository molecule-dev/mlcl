import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import IntegrationCard from './IntegrationCard.js'

// Channel connectors (Slack/WhatsApp/Telegram) need OAuth + webhook plumbing
// that is not yet wired up. Each card now ships as a clearly-marked
// "Coming soon" preview instead of firing requests that would 404.
function IntegrationsMessagingSection() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div data-mol-id="messaging-group">
      <div className={cm.cn(cm.flex({ align: 'center' }), cm.sp('mb', 6), 'gap-4')}>
        <h3
          className={cm.cn(
            cm.textSize('2xl'),
            cm.fontWeight('bold'),
            'font-headline tracking-tight',
          )}
        >
          {t('integrationsMessaging.sectionTitle', {}, { defaultValue: 'Messaging' })}
        </h3>
        <div className={cm.cn('h-px', cm.flex1, 'bg-outline-variant/20')}></div>
      </div>
      <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'sm:grid-cols-2 lg:grid-cols-4')}>
        {/* Slack (Connected) */}
        <article
          className={cm.cn(
            cm.sp('p', 6),
            'group bg-surface-container-lowest rounded-[1.5rem] transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5 relative border-t-2 border-tertiary-fixed',
          )}
          data-mol-id="card-slack"
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.roundedFull,
              cm.fontWeight('bold'),
              cm.sp('py', 1),
              'absolute top-4 right-4 gap-1.5 px-2.5 bg-surface-container-high text-on-surface-variant text-[10px] tracking-wider uppercase',
            )}
          >
            {t('common.comingSoon', {}, { defaultValue: 'Coming soon' })}
          </div>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(14),
              cm.h(14),
              cm.sp('mb', 5),
              'rounded-2xl bg-surface-container-high group-hover:scale-110 transition-transform',
            )}
          >
            <span className={cm.cn(cm.textSize('3xl'), 'material-symbols-outlined text-[#E01E5A]')}>
              tag
            </span>
          </div>
          <h4 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 2))}>
            {t('integrationsMessaging.slackTitle', {}, { defaultValue: 'Slack' })}
          </h4>
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('mb', 6),
              'text-on-surface-variant leading-relaxed',
            )}
          >
            {t(
              'integrationsMessaging.slackDescription',
              {},
              {
                defaultValue:
                  'Send real-time bot notifications and manage conversations directly in channels.',
              },
            )}
          </p>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'end' }),
              cm.sp('pt', 4),
              'border-t border-outline-variant/10',
            )}
          >
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('medium'),
                'text-on-surface-variant',
              )}
            >
              {t(
                'integrationsMessaging.slackComingSoonHint',
                {},
                { defaultValue: 'Backend connector in progress.' },
              )}
            </span>
          </div>
        </article>
        {/* Discord */}
        <IntegrationCard />
        {/* WhatsApp */}
        <article
          className={cm.cn(
            cm.sp('p', 6),
            'group bg-surface-container-lowest rounded-[1.5rem] transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5',
          )}
          data-mol-id="card-whatsapp"
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(14),
              cm.h(14),
              cm.sp('mb', 5),
              'rounded-2xl bg-surface-container-high group-hover:scale-110 transition-transform',
            )}
          >
            <span className={cm.cn(cm.textSize('3xl'), 'material-symbols-outlined text-[#25D366]')}>
              chat
            </span>
          </div>
          <h4 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 2))}>
            {t('integrationsMessaging.whatsAppTitle', {}, { defaultValue: 'WhatsApp' })}
          </h4>
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('mb', 6),
              'text-on-surface-variant leading-relaxed',
            )}
          >
            {t(
              'integrationsMessaging.whatsAppDescription',
              {},
              {
                defaultValue: "Reach customers globally on the world's most popular messaging app.",
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
        {/* Telegram */}
        <article
          className={cm.cn(
            cm.sp('p', 6),
            'group bg-surface-container-lowest rounded-[1.5rem] transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5',
          )}
          data-mol-id="card-telegram"
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(14),
              cm.h(14),
              cm.sp('mb', 5),
              'rounded-2xl bg-surface-container-high group-hover:scale-110 transition-transform',
            )}
          >
            <span className={cm.cn(cm.textSize('3xl'), 'material-symbols-outlined text-[#26A5E4]')}>
              send
            </span>
          </div>
          <h4 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 2))}>
            {t('integrationsMessaging.telegramTitle', {}, { defaultValue: 'Telegram' })}
          </h4>
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('mb', 6),
              'text-on-surface-variant leading-relaxed',
            )}
          >
            {t(
              'integrationsMessaging.telegramDescription',
              {},
              {
                defaultValue:
                  'High-speed, encrypted messaging integration for secure bot interactions.',
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
export default IntegrationsMessagingSection
export { IntegrationsMessagingSection }
