import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface BotSettingsAiBehaviorSectionProps {
  model: string
  setModel: (v: string) => void
  temperature: number
  setTemperature: (v: number) => void
  systemPrompt: string
  setSystemPrompt: (v: string) => void
  maxTokens: number
  setMaxTokens: (v: number) => void
}
function BotSettingsAiBehaviorSection({
  model,
  setModel,
  temperature,
  setTemperature,
  systemPrompt,
  setSystemPrompt,
  maxTokens,
  setMaxTokens,
}: BotSettingsAiBehaviorSectionProps) {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <>
      {/* Section 2: AI Behavior */}
      <section className={cm.stack(6)}>
        <h3
          className={cm.cn(
            cm.textSize('2xl'),
            cm.fontWeight('bold'),
            'font-headline tracking-tight',
          )}
        >
          {t('botSettingsAiBehavior.sectionTitle', {}, { defaultValue: 'AI Behavior' })}
        </h3>
        <div
          className={cm.cn(
            cm.sp('p', 8),
            cm.stack(10),
            'bg-surface-container-lowest rounded-3xl ambient-shadow',
          )}
        >
          <div className={cm.grid({ cols: 2, gap: 'xl' })}>
            <div className={cm.cn('space-y-1.5')}>
              <label
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-wider text-on-surface-variant',
                )}
              >
                {t('botSettingsAiBehavior.modelSelection', {}, { defaultValue: 'Model Selection' })}
              </label>
              <div className={cm.cn('relative')}>
                <select
                  className={cm.cn(
                    cm.w('full'),
                    cm.fontWeight('medium'),
                    'appearance-none bg-surface-container-high border-none rounded-2xl px-5 py-3.5 text-on-surface focus:ring-2 focus:ring-surface-tint/15 transition-shadow',
                  )}
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                >
                  <option value="claude-sonnet-4-6">
                    {t(
                      'botSettingsAiBehavior.modelClaudeSonnet4',
                      {},
                      { defaultValue: 'Claude Sonnet 4 (Anthropic)' },
                    )}
                  </option>
                  <option value="claude-3-5-sonnet-20241022">
                    {t(
                      'botSettingsAiBehavior.modelClaude35Sonnet',
                      {},
                      { defaultValue: 'Claude 3.5 Sonnet (Anthropic)' },
                    )}
                  </option>
                  <option value="claude-3-5-haiku-20241022">
                    {t(
                      'botSettingsAiBehavior.modelClaude35Haiku',
                      {},
                      { defaultValue: 'Claude 3.5 Haiku (Anthropic)' },
                    )}
                  </option>
                </select>
                <span
                  aria-hidden="true"
                  className={cm.cn(
                    'material-symbols-outlined absolute right-4 top-3.5 pointer-events-none text-on-surface-variant',
                  )}
                >
                  expand_more
                </span>
              </div>
            </div>
            <div className={cm.cn('space-y-1.5')}>
              <div
                className={cm.cn(cm.flex({ justify: 'between', align: 'center' }), cm.sp('mb', 1))}
              >
                <label
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-wider text-on-surface-variant',
                  )}
                >
                  {t('botSettingsAiBehavior.temperature', {}, { defaultValue: 'Temperature' })}
                </label>
                <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), 'text-tertiary')}>
                  {temperature.toFixed(2)}
                </span>
              </div>
              <div className={cm.cn(cm.sp('pt', 4), cm.sp('px', 1))}>
                <div
                  className={cm.cn(cm.h(2), cm.roundedFull, 'bg-surface-container-high relative')}
                >
                  <div
                    className={cm.cn(
                      cm.roundedFull,
                      'absolute left-0 top-0 h-full bg-gradient-to-r from-primary to-tertiary',
                    )}
                    style={{ width: `${temperature * 100}%` }}
                  ></div>
                  <div
                    className={cm.cn(
                      cm.w(5),
                      cm.h(5),
                      cm.roundedFull,
                      'absolute top-1/2 -translate-y-1/2 bg-surface border-2 border-tertiary shadow-md',
                    )}
                    style={{ left: `${temperature * 100}%` }}
                  ></div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={temperature}
                    onChange={(e) => setTemperature(Number(e.target.value))}
                    className={cm.cn(
                      cm.w('full'),
                      cm.h('full'),
                      cm.cursorPointer,
                      'absolute inset-0 opacity-0',
                    )}
                  />
                </div>
                <div className={cm.cn(cm.flex({ justify: 'between' }), cm.sp('mt', 3))}>
                  <span
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      'text-[10px] text-on-surface-variant uppercase tracking-tighter',
                    )}
                  >
                    {t(
                      'botSettingsAiBehavior.temperaturePrecision',
                      {},
                      { defaultValue: 'Precision' },
                    )}
                  </span>
                  <span
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      'text-[10px] text-on-surface-variant uppercase tracking-tighter',
                    )}
                  >
                    {t(
                      'botSettingsAiBehavior.temperatureCreativity',
                      {},
                      { defaultValue: 'Creativity' },
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className={cm.grid({ cols: 1, gap: 'xl' })}>
            <div className={cm.cn('space-y-1.5')}>
              <label
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-wider text-on-surface-variant',
                )}
              >
                {t('botSettingsAiBehavior.systemPrompt', {}, { defaultValue: 'System Prompt' })}
              </label>
              <textarea
                className={cm.cn(
                  cm.w('full'),
                  cm.textSize('sm'),
                  'bg-surface-container-high border-none rounded-2xl px-5 py-4 text-on-surface font-mono leading-relaxed focus:ring-2 focus:ring-surface-tint/15 transition-shadow',
                )}
                rows={6}
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
              />
            </div>
            <div className={cm.cn('space-y-1.5')}>
              <label
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-wider text-on-surface-variant',
                )}
              >
                {t('botSettingsAiBehavior.maxTokens', {}, { defaultValue: 'Max Tokens' })}
              </label>
              <input
                className={cm.cn(
                  cm.w('full'),
                  cm.fontWeight('medium'),
                  'bg-surface-container-high border-none rounded-2xl px-5 py-3.5 text-on-surface max-w-xs focus:ring-2 focus:ring-surface-tint/15 transition-shadow',
                )}
                type="number"
                value={maxTokens}
                onChange={(e) => setMaxTokens(Number(e.target.value))}
              />
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export default BotSettingsAiBehaviorSection
export { BotSettingsAiBehaviorSection }
