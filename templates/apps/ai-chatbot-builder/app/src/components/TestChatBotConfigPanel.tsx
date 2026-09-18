import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function TestChatBotConfigPanel() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [persona, setPersona] = useState('Support Architect v2.4')
  const [temperature, setTemperature] = useState(0.72)
  const [topP, setTopP] = useState(0.9)
  const [editingPrompt, setEditingPrompt] = useState(false)
  const [promptText, setPromptText] = useState(
    'You are a highly efficient customer support architect.\nYour primary goal is to provide clear, actionable, and professional guidance.\n\n- Use structured lists for multi-step tasks.\n- Maintain a technical but accessible tone.\n- If a security risk is detected (password reset, etc.), reference the Security_Reset_Workflow.\n- Log all major intents as technical metadata.',
  )
  return (
    <>
      {/* Bot Config Panel (Right) */}
      <aside
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.sp('p', 6),
          cm.stack(8),
          'w-[340px] border-l border-outline-variant/20 bg-surface-container-low',
        )}
      >
        <div>
          <h2
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.sp('mb', 4),
              'text-[10px] text-outline uppercase tracking-[0.15em]',
            )}
          >
            {t('botConfig.heading', {}, { defaultValue: 'Bot Configuration' })}
          </h2>
          <div className={cm.stack(4)}>
            <div className={cm.cn('space-y-1.5')}>
              <label
                htmlFor="persona-select"
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.sp('px', 1),
                  'text-[11px] text-on-surface-variant',
                )}
              >
                {t('botConfig.activePersona', {}, { defaultValue: 'Active Persona' })}
              </label>
              <div className={cm.cn('relative')}>
                <select
                  id="persona-select"
                  className={cm.cn(
                    cm.w('full'),
                    cm.textSize('sm'),
                    cm.sp('px', 3),
                    'bg-surface-container-lowest border border-outline-variant/30 rounded-lg py-2.5 appearance-none focus:ring-2 focus:ring-primary/20 outline-none',
                  )}
                  value={persona}
                  onChange={(e) => setPersona(e.target.value)}
                >
                  <option>
                    {t(
                      'botConfig.persona.supportArchitect',
                      { version: 'v2.4' },
                      { defaultValue: 'Support Architect {{version}}' },
                    )}
                  </option>
                  <option>
                    {t(
                      'botConfig.persona.marketingSpecialist',
                      {},
                      { defaultValue: 'Marketing Specialist' },
                    )}
                  </option>
                  <option>
                    {t('botConfig.persona.debugAssistant', {}, { defaultValue: 'Debug Assistant' })}
                  </option>
                </select>
                <span
                  className={cm.cn(
                    'material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none',
                  )}
                  data-icon="expand_more"
                >
                  expand_more
                </span>
              </div>
            </div>
            <div
              className={cm.cn(
                cm.sp('p', 3),
                cm.stack(2),
                'bg-surface-container-lowest/50 rounded-lg border border-outline-variant/10',
              )}
            >
              <div className={cm.flex({ justify: 'between', align: 'center' })}>
                <span
                  className={cm.cn(cm.fontWeight('medium'), 'text-[11px] text-on-surface-variant')}
                >
                  {t('botConfig.underlyingModel', {}, { defaultValue: 'Underlying Model' })}
                </span>
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'px-1.5 py-0.5 bg-tertiary-container text-on-tertiary-container text-[9px] rounded',
                  )}
                >
                  {t('botConfig.premiumBadge', {}, { defaultValue: 'PREMIUM' })}
                </span>
              </div>
              <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                {t('botConfig.modelName', {}, { defaultValue: 'GPT-4 Turbo (Neural Optimized)' })}
              </p>
              <div className={cm.cn(cm.flex({ align: 'center' }), cm.sp('mt', 2), 'gap-2')}>
                <span
                  className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined text-success')}
                  data-icon="check_circle"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
                <span className={cm.cn('text-[11px] text-outline')}>
                  {t(
                    'botConfig.latency',
                    { value: '~840ms' },
                    { defaultValue: 'Latency: {{value}}' },
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div>
          <div className={cm.cn(cm.flex({ justify: 'between', align: 'center' }), cm.sp('mb', 4))}>
            <h2
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] text-outline uppercase tracking-[0.15em]',
              )}
            >
              {t('botConfig.modelParametersHeading', {}, { defaultValue: 'Model Parameters' })}
            </h2>
          </div>
          <div className={cm.stack(6)}>
            <div className={cm.stack(3)}>
              <div className={cm.flex({ justify: 'between', align: 'end' })}>
                <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-2')}>
                  <label
                    htmlFor="temperature-slider"
                    className={cm.cn(cm.fontWeight('bold'), 'text-[11px] text-on-surface-variant')}
                  >
                    {t('botConfig.temperatureLabel', {}, { defaultValue: 'Temperature' })}
                  </label>
                  <span
                    className={cm.cn(
                      cm.textPrimary,
                      'text-[10px] font-mono bg-primary/10 px-1.5 rounded',
                    )}
                  >
                    {temperature.toFixed(2)}
                  </span>
                </div>
                <span className={cm.cn(cm.fontWeight('medium'), 'text-[9px] text-outline')}>
                  {t(
                    'botConfig.temperatureDescription',
                    {},
                    { defaultValue: 'Balanced & Accurate' },
                  )}
                </span>
              </div>
              <input
                id="temperature-slider"
                className={cm.cn(
                  cm.w('full'),
                  cm.roundedFull,
                  cm.cursorPointer,
                  'h-1.5 bg-outline-variant/30 appearance-none accent-primary',
                )}
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
              />
            </div>
            <div className={cm.stack(3)}>
              <div className={cm.flex({ justify: 'between', align: 'end' })}>
                <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-2')}>
                  <label
                    htmlFor="top-p-slider"
                    className={cm.cn(cm.fontWeight('bold'), 'text-[11px] text-on-surface-variant')}
                  >
                    {t('botConfig.topPLabel', {}, { defaultValue: 'Top-P' })}
                  </label>
                  <span
                    className={cm.cn(
                      cm.textPrimary,
                      'text-[10px] font-mono bg-primary/10 px-1.5 rounded',
                    )}
                  >
                    {topP.toFixed(2)}
                  </span>
                </div>
                <span className={cm.cn(cm.fontWeight('medium'), 'text-[9px] text-outline')}>
                  {t('botConfig.topPDescription', {}, { defaultValue: 'Diversity Control' })}
                </span>
              </div>
              <input
                id="top-p-slider"
                className={cm.cn(
                  cm.w('full'),
                  cm.roundedFull,
                  cm.cursorPointer,
                  'h-1.5 bg-outline-variant/30 appearance-none accent-primary',
                )}
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={topP}
                onChange={(e) => setTopP(parseFloat(e.target.value))}
              />
            </div>
          </div>
        </div>
        <div className={cm.cn(cm.flex1, cm.flex({ direction: 'col' }), 'min-h-0')}>
          <h2
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.sp('mb', 4),
              'text-[10px] text-outline uppercase tracking-[0.15em]',
            )}
          >
            {t('botConfig.systemPromptHeading', {}, { defaultValue: 'System Prompt Preview' })}
          </h2>
          <div
            className={cm.cn(
              cm.flex1,
              cm.sp('p', 4),
              'bg-surface-container-lowest rounded-xl border border-outline-variant/20 overflow-y-auto',
            )}
          >
            {editingPrompt ? (
              <textarea
                className={cm.cn(
                  cm.w('full'),
                  cm.h('full'),
                  'text-[11px] font-mono leading-relaxed text-on-surface-variant whitespace-pre-wrap resize-none bg-transparent outline-none',
                )}
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
              />
            ) : (
              <pre
                className={cm.cn(
                  'text-[11px] font-mono leading-relaxed text-on-surface-variant whitespace-pre-wrap',
                )}
              >
                {promptText}
              </pre>
            )}
          </div>
          <button
            className={cm.cn(
              cm.sp('mt', 4),
              cm.flex({ align: 'center', justify: 'center' }),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.textPrimary,
              cm.sp('py', 2),
              'gap-2 hover:bg-primary/5 rounded-lg transition-colors border border-primary/20',
            )}
            onClick={() => setEditingPrompt((v) => !v)}
          >
            <span
              className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
              data-icon="edit"
            >
              edit
            </span>
            {editingPrompt
              ? t('botConfig.savePrompt', {}, { defaultValue: 'Save Prompt' })
              : t('botConfig.editSystemPrompt', {}, { defaultValue: 'Edit System Prompt' })}
          </button>
        </div>
        <div className={cm.cn(cm.sp('pt', 4), 'border-t border-outline-variant/20')}>
          <div
            className={cm.cn(
              cm.sp('p', 3),
              cm.flex({ align: 'start' }),
              'bg-primary-container/10 rounded-lg gap-3',
            )}
          >
            <span
              className={cm.cn(cm.textPrimary, 'material-symbols-outlined')}
              data-icon="info"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              info
            </span>
            <div>
              <p
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[11px] text-on-primary-fixed-variant',
                )}
              >
                {t('botConfig.tokenEfficiencyTitle', {}, { defaultValue: 'Token Efficiency' })}
              </p>
              <p className={cm.cn('text-[10px] text-on-primary-fixed-variant/70 leading-normal')}>
                {t(
                  'botConfig.tokenEfficiencyDescription',
                  {},
                  {
                    defaultValue:
                      'This bot is currently optimized for low-latency responses using our proprietary pruning algorithm.',
                  },
                )}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

export default TestChatBotConfigPanel
export { TestChatBotConfigPanel }
