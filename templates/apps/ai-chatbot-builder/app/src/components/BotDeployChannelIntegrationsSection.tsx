import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export default function BotDeployChannelIntegrationsSection() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [slackConnected, setSlackConnected] = useState(true)
  const [discordConnected, setDiscordConnected] = useState(false)
  const [whatsappConnected, setWhatsappConnected] = useState(false)
  const [telegramConnected, setTelegramConnected] = useState(false)
  return (
    <>
      {/* Section 4: Channel Integrations */}
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
              {t('channelIntegrations.title', {}, { defaultValue: 'Channel Integrations' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant/60')}>
              {t(
                'channelIntegrations.description',
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
          {/* Slack */}
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.sp('p', 4),
              `group rounded-2xl ${slackConnected ? 'bg-tertiary/5' : 'bg-surface-container-high transition-all hover:bg-surface-container-highest'}`,
              slackConnected && cm.accentCard({ tone: 'custom' }),
            )}
            style={{ ['--mol-accent' as string]: 'var(--color-tertiary)' }}
          >
            <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-4')}>
              <div
                className={cm.cn(
                  cm.w(10),
                  cm.h(10),
                  cm.flex({ align: 'center', justify: 'center' }),
                  `rounded-xl bg-surface shadow-sm${slackConnected ? '' : ' opacity-60'}`,
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[#4A154B]')}>forum</span>
              </div>
              <div>
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('bold'),
                    slackConnected ? 'text-on-surface' : 'text-on-surface/60',
                  )}
                >
                  {t('channelIntegrations.slack', {}, { defaultValue: 'Slack' })}
                </p>
                {slackConnected ? (
                  <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-1.5')}>
                    <div
                      className={cm.cn(cm.roundedFull, cm.w(1.5), cm.h(1.5), 'bg-tertiary')}
                    ></div>
                    <span
                      className={cm.cn(
                        cm.fontWeight('bold'),
                        'text-[10px] text-tertiary uppercase tracking-tighter',
                      )}
                    >
                      {t('status.connected', {}, { defaultValue: 'Connected' })}
                    </span>
                  </div>
                ) : (
                  <span
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      'text-[10px] text-on-surface-variant/40 uppercase tracking-tighter',
                    )}
                  >
                    {t('common.inactive', {}, { defaultValue: 'Inactive' })}
                  </span>
                )}
              </div>
            </div>
            <button
              className={cm.cn(
                cm.w(12),
                cm.h(6),
                cm.roundedFull,
                cm.sp('p', 1),
                `relative transition-colors ${slackConnected ? 'bg-tertiary' : 'bg-outline-variant/30'}`,
              )}
              onClick={() => setSlackConnected((v) => !v)}
            >
              <div
                className={cm.cn(
                  cm.w(4),
                  cm.h(4),
                  cm.roundedFull,
                  `bg-surface shadow-sm${slackConnected ? ' ml-auto' : ''}`,
                )}
              ></div>
            </button>
          </div>
          {/* Discord */}
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.sp('p', 4),
              `group rounded-2xl ${discordConnected ? 'bg-tertiary/5' : 'bg-surface-container-high transition-all hover:bg-surface-container-highest'}`,
              discordConnected && cm.accentCard({ tone: 'custom' }),
            )}
            style={{ ['--mol-accent' as string]: 'var(--color-tertiary)' }}
          >
            <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-4')}>
              <div
                className={cm.cn(
                  cm.w(10),
                  cm.h(10),
                  cm.flex({ align: 'center', justify: 'center' }),
                  `rounded-xl bg-surface shadow-sm${discordConnected ? '' : ' opacity-60'}`,
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-primary-container')}>
                  sports_esports
                </span>
              </div>
              <div>
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('bold'),
                    discordConnected ? 'text-on-surface' : 'text-on-surface/60',
                  )}
                >
                  {t('channelIntegrations.discord', {}, { defaultValue: 'Discord' })}
                </p>
                {discordConnected ? (
                  <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-1.5')}>
                    <div
                      className={cm.cn(cm.roundedFull, cm.w(1.5), cm.h(1.5), 'bg-tertiary')}
                    ></div>
                    <span
                      className={cm.cn(
                        cm.fontWeight('bold'),
                        'text-[10px] text-tertiary uppercase tracking-tighter',
                      )}
                    >
                      {t('status.connected', {}, { defaultValue: 'Connected' })}
                    </span>
                  </div>
                ) : (
                  <span
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      'text-[10px] text-on-surface-variant/40 uppercase tracking-tighter',
                    )}
                  >
                    {t('common.inactive', {}, { defaultValue: 'Inactive' })}
                  </span>
                )}
              </div>
            </div>
            <button
              className={cm.cn(
                cm.w(12),
                cm.h(6),
                cm.roundedFull,
                cm.sp('p', 1),
                `relative transition-colors ${discordConnected ? 'bg-tertiary' : 'bg-outline-variant/30'}`,
              )}
              onClick={() => setDiscordConnected((v) => !v)}
            >
              <div
                className={cm.cn(
                  cm.w(4),
                  cm.h(4),
                  cm.roundedFull,
                  `bg-surface shadow-sm${discordConnected ? ' ml-auto' : ''}`,
                )}
              ></div>
            </button>
          </div>
          {/* WhatsApp */}
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.sp('p', 4),
              `group rounded-2xl ${whatsappConnected ? 'bg-tertiary/5' : 'bg-surface-container-high transition-all hover:bg-surface-container-highest'}`,
              whatsappConnected && cm.accentCard({ tone: 'custom' }),
            )}
            style={{ ['--mol-accent' as string]: 'var(--color-tertiary)' }}
          >
            <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-4')}>
              <div
                className={cm.cn(
                  cm.w(10),
                  cm.h(10),
                  cm.flex({ align: 'center', justify: 'center' }),
                  `rounded-xl bg-surface shadow-sm${whatsappConnected ? '' : ' opacity-60'}`,
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[#25D366]')}>chat</span>
              </div>
              <div>
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('bold'),
                    whatsappConnected ? 'text-on-surface' : 'text-on-surface/60',
                  )}
                >
                  {t('channelIntegrations.whatsApp', {}, { defaultValue: 'WhatsApp' })}
                </p>
                {whatsappConnected ? (
                  <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-1.5')}>
                    <div
                      className={cm.cn(cm.roundedFull, cm.w(1.5), cm.h(1.5), 'bg-tertiary')}
                    ></div>
                    <span
                      className={cm.cn(
                        cm.fontWeight('bold'),
                        'text-[10px] text-tertiary uppercase tracking-tighter',
                      )}
                    >
                      {t('status.connected', {}, { defaultValue: 'Connected' })}
                    </span>
                  </div>
                ) : (
                  <span
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      'text-[10px] text-on-surface-variant/40 uppercase tracking-tighter',
                    )}
                  >
                    {t('common.inactive', {}, { defaultValue: 'Inactive' })}
                  </span>
                )}
              </div>
            </div>
            <button
              className={cm.cn(
                cm.w(12),
                cm.h(6),
                cm.roundedFull,
                cm.sp('p', 1),
                `relative transition-colors ${whatsappConnected ? 'bg-tertiary' : 'bg-outline-variant/30'}`,
              )}
              onClick={() => setWhatsappConnected((v) => !v)}
            >
              <div
                className={cm.cn(
                  cm.w(4),
                  cm.h(4),
                  cm.roundedFull,
                  `bg-surface shadow-sm${whatsappConnected ? ' ml-auto' : ''}`,
                )}
              ></div>
            </button>
          </div>
          {/* Telegram */}
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.sp('p', 4),
              `group rounded-2xl ${telegramConnected ? 'bg-tertiary/5' : 'bg-surface-container-high transition-all hover:bg-surface-container-highest'}`,
              telegramConnected && cm.accentCard({ tone: 'custom' }),
            )}
            style={{ ['--mol-accent' as string]: 'var(--color-tertiary)' }}
          >
            <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-4')}>
              <div
                className={cm.cn(
                  cm.w(10),
                  cm.h(10),
                  cm.flex({ align: 'center', justify: 'center' }),
                  `rounded-xl bg-surface shadow-sm${telegramConnected ? '' : ' opacity-60'}`,
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[#0088cc]')}>send</span>
              </div>
              <div>
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('bold'),
                    telegramConnected ? 'text-on-surface' : 'text-on-surface/60',
                  )}
                >
                  {t('channelIntegrations.telegram', {}, { defaultValue: 'Telegram' })}
                </p>
                {telegramConnected ? (
                  <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-1.5')}>
                    <div
                      className={cm.cn(cm.roundedFull, cm.w(1.5), cm.h(1.5), 'bg-tertiary')}
                    ></div>
                    <span
                      className={cm.cn(
                        cm.fontWeight('bold'),
                        'text-[10px] text-tertiary uppercase tracking-tighter',
                      )}
                    >
                      {t('status.connected', {}, { defaultValue: 'Connected' })}
                    </span>
                  </div>
                ) : (
                  <span
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      'text-[10px] text-on-surface-variant/40 uppercase tracking-tighter',
                    )}
                  >
                    {t('common.inactive', {}, { defaultValue: 'Inactive' })}
                  </span>
                )}
              </div>
            </div>
            <button
              className={cm.cn(
                cm.w(12),
                cm.h(6),
                cm.roundedFull,
                cm.sp('p', 1),
                `relative transition-colors ${telegramConnected ? 'bg-tertiary' : 'bg-outline-variant/30'}`,
              )}
              onClick={() => setTelegramConnected((v) => !v)}
            >
              <div
                className={cm.cn(
                  cm.w(4),
                  cm.h(4),
                  cm.roundedFull,
                  `bg-surface shadow-sm${telegramConnected ? ' ml-auto' : ''}`,
                )}
              ></div>
            </button>
          </div>
        </div>
      </section>
    </>
  )
}
export { BotDeployChannelIntegrationsSection }
