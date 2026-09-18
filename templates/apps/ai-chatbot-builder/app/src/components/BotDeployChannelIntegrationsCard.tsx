import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
function BotDeployChannelIntegrationsCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [channels, setChannels] = useState({
    slack: true,
    discord: false,
    whatsapp: false,
    telegram: false,
  })
  function toggle(ch: keyof typeof channels) {
    setChannels((prev) => ({ ...prev, [ch]: !prev[ch] }))
  }
  return (
    <section
      className={cm.cn(
        cm.sp('p', 8),
        'bg-surface-container-lowest rounded-[2rem] ambient-shadow lg:col-span-1',
      )}
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 8))}>
        <div>
          <h2
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('bold'),
              cm.sp('mb', 2),
              'font-headline',
            )}
          >
            {t(
              'botDeployChannelIntegrationsCard.title',
              {},
              { defaultValue: 'Channel Integrations' },
            )}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant/60')}>
            {t(
              'botDeployChannelIntegrationsCard.subtitle',
              {},
              { defaultValue: 'Connect to external messaging platforms.' },
            )}
          </p>
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(12),
            cm.h(12),
            cm.textPrimary,
            'bg-surface-container-high rounded-2xl',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined')}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            cable
          </span>
        </div>
      </div>
      <div className={cm.stack(4)}>
        {/* Slack Connected */}
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('p', 4),
            'group bg-tertiary/5 rounded-2xl border-l-4 border-tertiary',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.w(10),
                cm.h(10),
                'rounded-xl bg-surface shadow-sm',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[#4A154B]')}>forum</span>
            </div>
            <div>
              <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}>
                {t('botDeployChannelIntegrationsCard.slack', {}, { defaultValue: 'Slack' })}
              </p>
              <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-1.5')}>
                <div className={cm.cn(cm.roundedFull, cm.w(1.5), cm.h(1.5), 'bg-tertiary')}></div>
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'text-[10px] text-tertiary uppercase tracking-tighter',
                  )}
                >
                  {t('status.connected', {}, { defaultValue: 'Connected' })}
                </span>
              </div>
            </div>
          </div>
          <button
            className={cm.cn(
              'w-12 h-6 rounded-full relative p-1 transition-colors',
              channels.slack ? 'bg-tertiary' : 'bg-outline-variant/30',
            )}
            onClick={() => toggle('slack')}
            aria-pressed={channels.slack}
          >
            <div
              className={cm.cn(
                'w-4 h-4 bg-surface rounded-full shadow-sm transition-transform',
                channels.slack && 'ml-auto',
              )}
            ></div>
          </button>
        </div>
        {/* Discord Not Connected */}
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('p', 4),
            'group bg-surface-container-high rounded-2xl transition-all hover:bg-surface-container-highest',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.w(10),
                cm.h(10),
                'rounded-xl bg-surface shadow-sm opacity-60',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-primary-container')}>
                forum
              </span>
            </div>
            <div>
              <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface/60')}>
                {t('botDeployChannelIntegrationsCard.discord', {}, { defaultValue: 'Discord' })}
              </p>
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[10px] text-on-surface-variant/40 uppercase tracking-tighter',
                )}
              >
                {t('common.inactive', {}, { defaultValue: 'Inactive' })}
              </span>
            </div>
          </div>
          <button
            className={cm.cn(
              'w-12 h-6 rounded-full relative p-1 transition-colors',
              channels.discord ? 'bg-tertiary' : 'bg-outline-variant/30',
            )}
            onClick={() => toggle('discord')}
            aria-pressed={channels.discord}
          >
            <div
              className={cm.cn(
                'w-4 h-4 bg-surface rounded-full shadow-sm transition-transform',
                channels.discord && 'ml-auto',
              )}
            ></div>
          </button>
        </div>
        {/* WhatsApp Not Connected */}
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('p', 4),
            'group bg-surface-container-high rounded-2xl transition-all hover:bg-surface-container-highest',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.w(10),
                cm.h(10),
                'rounded-xl bg-surface shadow-sm opacity-60',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[#25D366]')}>chat</span>
            </div>
            <div>
              <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface/60')}>
                {t('botDeployChannelIntegrationsCard.whatsapp', {}, { defaultValue: 'WhatsApp' })}
              </p>
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[10px] text-on-surface-variant/40 uppercase tracking-tighter',
                )}
              >
                {t('common.inactive', {}, { defaultValue: 'Inactive' })}
              </span>
            </div>
          </div>
          <button
            className={cm.cn(
              'w-12 h-6 rounded-full relative p-1 transition-colors',
              channels.whatsapp ? 'bg-tertiary' : 'bg-outline-variant/30',
            )}
            onClick={() => toggle('whatsapp')}
            aria-pressed={channels.whatsapp}
          >
            <div
              className={cm.cn(
                'w-4 h-4 bg-surface rounded-full shadow-sm transition-transform',
                channels.whatsapp && 'ml-auto',
              )}
            ></div>
          </button>
        </div>
        {/* Telegram Not Connected */}
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('p', 4),
            'group bg-surface-container-high rounded-2xl transition-all hover:bg-surface-container-highest',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.w(10),
                cm.h(10),
                'rounded-xl bg-surface shadow-sm opacity-60',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[#0088cc]')}>send</span>
            </div>
            <div>
              <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface/60')}>
                {t('botDeployChannelIntegrationsCard.telegram', {}, { defaultValue: 'Telegram' })}
              </p>
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[10px] text-on-surface-variant/40 uppercase tracking-tighter',
                )}
              >
                {t('common.inactive', {}, { defaultValue: 'Inactive' })}
              </span>
            </div>
          </div>
          <button
            className={cm.cn(
              'w-12 h-6 rounded-full relative p-1 transition-colors',
              channels.telegram ? 'bg-tertiary' : 'bg-outline-variant/30',
            )}
            onClick={() => toggle('telegram')}
            aria-pressed={channels.telegram}
          >
            <div
              className={cm.cn(
                'w-4 h-4 bg-surface rounded-full shadow-sm transition-transform',
                channels.telegram && 'ml-auto',
              )}
            ></div>
          </button>
        </div>
      </div>
    </section>
  )
}

export default BotDeployChannelIntegrationsCard
export { BotDeployChannelIntegrationsCard }
