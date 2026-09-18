interface BotSettingsAppearanceSectionProps {
  welcomeMessage: string
  setWelcomeMessage: (v: string) => void
  position: string
  setPosition: (v: string) => void
  typingIndicator: boolean
  setTypingIndicator: (v: boolean) => void
}
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
function BotSettingsAppearanceSection({
  welcomeMessage,
  setWelcomeMessage,
  position,
  setPosition,
  typingIndicator,
  setTypingIndicator,
}: BotSettingsAppearanceSectionProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <section className={cm.stack(6)}>
      <h3
        className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'font-headline tracking-tight')}
      >
        {t('nav.appearance', {}, { defaultValue: 'Appearance' })}
      </h3>
      <div
        className={cm.cn(
          cm.sp('p', 8),
          cm.stack(10),
          'bg-surface-container-lowest rounded-3xl ambient-shadow',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'start' }), 'gap-12')}>
          <div className={cm.cn(cm.flex1, cm.stack(8))}>
            <div className={cm.grid({ cols: 2, gap: 'xl' })}>
              <div className={cm.cn('space-y-1.5')}>
                <label
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-wider text-on-surface-variant',
                  )}
                >
                  {t(
                    'botSettingsAppearance.widgetColorLabel',
                    {},
                    { defaultValue: 'Widget Color' },
                  )}
                </label>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center' }),
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    'gap-3 bg-surface-container-high rounded-2xl',
                  )}
                >
                  <div
                    className={cm.cn(
                      cm.w(8),
                      cm.h(8),
                      cm.roundedFull,
                      'bg-primary shadow-inner shadow-black/10',
                    )}
                  ></div>
                  <span className={cm.cn(cm.textSize('sm'), 'font-mono text-on-surface')}>
                    #4648D4
                  </span>
                </div>
              </div>
              <div className={cm.cn('space-y-1.5')}>
                <label
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-wider text-on-surface-variant',
                  )}
                >
                  {t('botSettingsAppearance.positionLabel', {}, { defaultValue: 'Position' })}
                </label>
                <div className={cm.cn(cm.flex(), 'gap-2')}>
                  {(
                    [
                      ['nw', 'north_west'],
                      ['ne', 'north_east'],
                      ['sw', 'south_west'],
                      ['se', 'south_east'],
                    ] as const
                  ).map(([pos, icon]) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => setPosition(pos)}
                      aria-pressed={position === pos}
                      aria-label={t(
                        `botSettingsAppearance.position_${pos}`,
                        {},
                        { defaultValue: pos },
                      )}
                      className={cm.cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
                        position === pos
                          ? 'bg-primary text-white'
                          : 'bg-surface-container-high text-on-surface-variant',
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
                      >
                        {icon}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className={cm.cn('space-y-1.5')}>
              <label
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-wider text-on-surface-variant',
                )}
              >
                {t(
                  'botSettingsAppearance.welcomeMessageLabel',
                  {},
                  { defaultValue: 'Welcome Message' },
                )}
              </label>
              <input
                className={cm.cn(
                  cm.input(),
                  cm.w('full'),
                  cm.sp('px', 5),
                  'bg-surface-container-high border-none rounded-2xl py-3.5 text-on-surface font-medium focus:ring-2 focus:ring-surface-tint/15 transition-shadow',
                )}
                type="text"
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
              />
            </div>
            <div
              className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('py', 2))}
            >
              <div>
                <p className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}>
                  {t(
                    'botSettingsAppearance.typingIndicatorLabel',
                    {},
                    { defaultValue: 'Typing Indicator' },
                  )}
                </p>
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {t(
                    'botSettingsAppearance.typingIndicatorDescription',
                    {},
                    { defaultValue: "Show 'Bot is typing...' animation" },
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTypingIndicator(!typingIndicator)}
                aria-pressed={typingIndicator}
                className={cm.cn(
                  'w-12 h-6 rounded-full relative cursor-pointer transition-colors',
                  typingIndicator ? 'bg-tertiary' : 'bg-surface-container-highest',
                )}
              >
                <div
                  className={cm.cn(
                    'absolute top-1 w-4 h-4 bg-surface rounded-full transition-all',
                    typingIndicator ? 'right-1' : 'left-1',
                  )}
                ></div>
              </button>
            </div>
          </div>
          {/* Preview Frame */}
          <div
            className={cm.cn(
              cm.w(72),
              cm.sp('p', 4),
              'bg-surface aspect-[3/4] rounded-3xl shadow-2xl relative border-8 border-surface-container-highest overflow-hidden',
            )}
          >
            <div
              className={cm.cn(
                cm.h(8),
                cm.flex({ align: 'center', justify: 'between' }),
                cm.sp('px', 4),
                'bg-primary rounded-t-xl -mx-4 -mt-4',
              )}
            >
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[10px] text-white uppercase tracking-widest',
                )}
              >
                {t('botSettingsAppearance.previewLabel', {}, { defaultValue: 'Preview' })}
              </span>
              <span
                aria-hidden="true"
                className={cm.cn(cm.textSize('xs'), 'material-symbols-outlined text-white')}
              >
                close
              </span>
            </div>
            <div className={cm.cn(cm.sp('mt', 4), cm.stack(3))}>
              <div
                className={cm.cn(
                  cm.w('3/4'),
                  'p-2.5 rounded-2xl bg-surface-container-high text-[11px] text-on-surface leading-snug',
                )}
              >
                {welcomeMessage ||
                  t(
                    'botSettingsAppearance.previewBotGreeting',
                    {},
                    { defaultValue: 'Hello! How can I help you?' },
                  )}
              </div>
              <div className={cm.flex({ justify: 'end' })}>
                <div
                  className={cm.cn(
                    cm.w('1/2'),
                    'p-2.5 rounded-2xl bg-primary text-white text-[11px] leading-snug',
                  )}
                >
                  {t(
                    'botSettingsAppearance.previewUserMessage',
                    {},
                    { defaultValue: 'I need help with billing' },
                  )}
                </div>
              </div>
              {typingIndicator && (
                <div
                  className={cm.cn(
                    cm.w('2/3'),
                    cm.flex({ align: 'center' }),
                    'p-2.5 rounded-2xl bg-surface-container-high gap-1',
                  )}
                >
                  <div
                    className={cm.cn(
                      cm.w(1),
                      cm.h(1),
                      cm.roundedFull,
                      'bg-on-surface-variant opacity-40',
                    )}
                  ></div>
                  <div
                    className={cm.cn(
                      cm.w(1),
                      cm.h(1),
                      cm.roundedFull,
                      'bg-on-surface-variant opacity-60',
                    )}
                  ></div>
                  <div
                    className={cm.cn(
                      cm.w(1),
                      cm.h(1),
                      cm.roundedFull,
                      'bg-on-surface-variant opacity-80',
                    )}
                  ></div>
                </div>
              )}
            </div>
            <div
              className={cm.cn(
                cm.flex({ align: 'center' }),
                'absolute bottom-4 left-4 right-4 gap-2',
              )}
            >
              <div
                className={cm.cn(cm.flex1, cm.h(8), 'bg-surface-container-highest rounded-full')}
              ></div>
              <div
                className={cm.cn(
                  cm.w(8),
                  cm.h(8),
                  cm.roundedFull,
                  cm.flex({ align: 'center', justify: 'center' }),
                  'bg-primary text-white',
                )}
              >
                <span
                  className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  send
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default BotSettingsAppearanceSection
export { BotSettingsAppearanceSection }
