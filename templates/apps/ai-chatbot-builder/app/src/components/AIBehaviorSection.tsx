import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
interface AIBehaviorSectionProps {
  model: string
  temperature: number
  systemPrompt: string
  maxTokens: number
  onChange: (field: string, value: string | number) => void
}

export default function AIBehaviorSection({
  model,
  temperature,
  systemPrompt,
  maxTokens,
  onChange,
}: AIBehaviorSectionProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <section style={{ rowGap: '6*0.25rem' }} data-mol-id="ai-behavior-section">
      <h3
        className={cm.fontWeight('bold')}
        style={{
          fontFamily: 'var(--font-headline, sans-serif)',
          fontSize: '${textSizeToRem($1)}',
          lineHeight: '${textSizeToLineHeight($1)}',
          letterSpacing: "${1 === 'tighter' ? '-0.05em' : '-0.025em'}",
        }}
      >
        {t('ai-behavior-heading', {}, { defaultValue: 'AI Behavior' })}
      </h3>
      <div
        style={{
          backgroundColor: 'var(--md-sys-color-surface-container-lowest)',
          borderRadius: '3rem',
          padding: 'calc(8 * 0.25rem)',
          boxShadow: '0 2px 12px 0 rgb(0 0 0 / 0.08)',
          rowGap: '10*0.25rem',
        }}
        data-mol-id="ai-behavior-card"
      >
        <div className={cm.grid({ cols: 2 })} style={{ gap: 'calc(10 * 0.25rem)' }}>
          <div style={{ rowGap: '1.5*0.25rem' }} data-mol-id="model-selection">
            <label
              className={cm.fontWeight('bold')}
              style={{
                fontSize: '${textSizeToRem($1)}',
                lineHeight: '${textSizeToLineHeight($1)}',
                textTransform: 'uppercase',
                letterSpacing: "${1 === 'wider' ? '0.05em' : '0.025em'}",
                color: 'var(--md-sys-color-on-surface-variant)',
              }}
            >
              {t('ai-behavior-model-selection-label', {}, { defaultValue: 'Model Selection' })}
            </label>
            <div style={{ position: 'relative' }}>
              <select
                className={cm.cn(
                  cm.fontWeight('medium'),
                  'focus:ring-2 focus:ring-surface-tint/15',
                )}
                style={{
                  width: '100%',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  backgroundColor: 'var(--md-sys-color-surface-container-high)',
                  borderColor: 'var(--md-sys-color-none)',
                  borderRadius: '2rem',
                  paddingLeft: 'calc(5 * 0.25rem)',
                  paddingRight: 'calc(5 * 0.25rem)',
                  padding: 'calc(3.5 * 0.25rem)',
                  color: 'var(--md-sys-color-on-surface)',
                  transitionProperty: 'all',
                  transitionDuration: '150ms',
                }}
                value={model}
                onChange={(e) => onChange('model', e.target.value)}
              >
                <option value="GPT-4 Turbo">
                  {t('ai-behavior-model-gpt4-turbo', {}, { defaultValue: 'GPT-4 Turbo' })}
                </option>
                <option value="GPT-3.5 Claude">
                  {t('ai-behavior-model-gpt35-claude', {}, { defaultValue: 'GPT-3.5 Claude' })}
                </option>
                <option value="Neural Engine v2">
                  {t(
                    'ai-behavior-model-neural-engine-v2',
                    {},
                    { defaultValue: 'Neural Engine v2' },
                  )}
                </option>
              </select>
              <span
                style={{
                  fontFamily: 'Material Symbols outlined',
                  position: 'absolute',
                  inset: 'calc(4 * 0.25rem)',
                  right: '3.5rem',
                  pointerEvents: 'none',
                  color: 'var(--md-sys-color-outline)',
                }}
              >
                expand_more
              </span>
            </div>
          </div>
          <div style={{ rowGap: '1.5*0.25rem' }} data-mol-id="temperature-control">
            <div
              className={cm.cn(cm.flex({ justify: 'between', align: 'center' }), cm.sp('mb', 1))}
            >
              <label
                className={cm.fontWeight('bold')}
                style={{
                  fontSize: '${textSizeToRem($1)}',
                  lineHeight: '${textSizeToLineHeight($1)}',
                  textTransform: 'uppercase',
                  letterSpacing: "${1 === 'wider' ? '0.05em' : '0.025em'}",
                  color: 'var(--md-sys-color-on-surface-variant)',
                }}
              >
                {t('ai-behavior-temperature-label', {}, { defaultValue: 'Temperature' })}
              </label>
              <span
                className={cm.fontWeight('bold')}
                style={{
                  fontSize: '${textSizeToRem($1)}',
                  lineHeight: '${textSizeToLineHeight($1)}',
                  color: 'var(--md-sys-color-tertiary)',
                }}
              >
                {temperature}
              </span>
            </div>
            <div
              style={{
                padding: 'calc(4 * 0.25rem)',
                paddingLeft: 'calc(1 * 0.25rem)',
                paddingRight: 'calc(1 * 0.25rem)',
              }}
            >
              <div
                className={cm.roundedFull}
                style={{
                  height: 'calc(2 * 0.25rem)',
                  backgroundColor: 'var(--md-sys-color-surface-container-high)',
                  position: 'relative',
                }}
              >
                <div
                  className={cm.cn(cm.roundedFull, 'to-tertiary')}
                  style={{
                    position: 'absolute',
                    inset: 'calc(0 * 0.25rem)',
                    height: '100%',
                    width: `${temperature * 100}%`,
                    backgroundImage:
                      'linear-gradient(to right, var(--md-sys-color-primary), var(--md-sys-color-tertiary))',
                  }}
                ></div>
                <div
                  className={cm.roundedFull}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    left: `${temperature * 100}%`,
                    width: '1.25rem',
                    height: 'calc(5 * 0.25rem)',
                    backgroundColor: 'var(--color-on-error)',
                    borderWidth: '2px',
                    borderStyle: 'solid',
                    borderColor: 'var(--md-sys-color-tertiary)',
                    boxShadow: 'var(--tw-shadow-md, revert)',
                  }}
                ></div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => onChange('temperature', parseFloat(e.target.value))}
                  className={cm.cursorPointer}
                  style={{
                    position: 'absolute',
                    inset: 'calc(0 * 0.25rem)',
                    width: '100%',
                    height: '100%',
                    opacity: 'calc(0 / 100)',
                  }}
                />
              </div>
              <div className={cm.cn(cm.flex({ justify: 'between' }), cm.sp('mt', 3))}>
                <span
                  className={cm.fontWeight('bold')}
                  style={{
                    fontSize: '10px',
                    color: '${tailwindScaleToHex($1,$2)}',
                    textTransform: 'uppercase',
                    letterSpacing: "${1 === 'tighter' ? '-0.05em' : '-0.025em'}",
                  }}
                >
                  {t('ai-behavior-temperature-precision', {}, { defaultValue: 'Precision' })}
                </span>
                <span
                  className={cm.fontWeight('bold')}
                  style={{
                    fontSize: '10px',
                    color: '${tailwindScaleToHex($1,$2)}',
                    textTransform: 'uppercase',
                    letterSpacing: "${1 === 'tighter' ? '-0.05em' : '-0.025em'}",
                  }}
                >
                  {t('ai-behavior-temperature-creativity', {}, { defaultValue: 'Creativity' })}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className={cm.grid({ cols: 1 })} style={{ gap: 'calc(8 * 0.25rem)' }}>
          <div style={{ rowGap: '1.5*0.25rem' }} data-mol-id="system-prompt">
            <label
              className={cm.fontWeight('bold')}
              style={{
                fontSize: '${textSizeToRem($1)}',
                lineHeight: '${textSizeToLineHeight($1)}',
                textTransform: 'uppercase',
                letterSpacing: "${1 === 'wider' ? '0.05em' : '0.025em'}",
                color: 'var(--md-sys-color-on-surface-variant)',
              }}
            >
              {t('ai-behavior-system-prompt-label', {}, { defaultValue: 'System Prompt' })}
            </label>
            <textarea
              className={'focus:ring-2 focus:ring-surface-tint/15'}
              style={{
                width: '100%',
                backgroundColor: 'var(--md-sys-color-surface-container-high)',
                borderColor: 'var(--md-sys-color-none)',
                borderRadius: '2rem',
                paddingLeft: 'calc(5 * 0.25rem)',
                paddingRight: 'calc(5 * 0.25rem)',
                padding: 'calc(4 * 0.25rem)',
                color: 'var(--md-sys-color-on-surface)',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                fontSize: '${textSizeToRem($1)}',
                lineHeight: '1.625',
                transitionProperty: 'all',
                transitionDuration: '150ms',
              }}
              rows={6}
              value={systemPrompt}
              onChange={(e) => onChange('systemPrompt', e.target.value)}
            />
          </div>
          <div style={{ rowGap: '1.5*0.25rem' }} data-mol-id="max-tokens">
            <label
              className={cm.fontWeight('bold')}
              style={{
                fontSize: '${textSizeToRem($1)}',
                lineHeight: '${textSizeToLineHeight($1)}',
                textTransform: 'uppercase',
                letterSpacing: "${1 === 'wider' ? '0.05em' : '0.025em'}",
                color: 'var(--md-sys-color-on-surface-variant)',
              }}
            >
              {t('ai-behavior-max-tokens-label', {}, { defaultValue: 'Max Tokens' })}
            </label>
            <input
              className={cm.cn(cm.fontWeight('medium'), 'focus:ring-2 focus:ring-surface-tint/15')}
              style={{
                width: 'calc(48 * 0.25rem)',
                backgroundColor: 'var(--md-sys-color-surface-container-high)',
                borderColor: 'var(--md-sys-color-none)',
                borderRadius: '2rem',
                paddingLeft: 'calc(5 * 0.25rem)',
                paddingRight: 'calc(5 * 0.25rem)',
                padding: 'calc(3.5 * 0.25rem)',
                color: 'var(--md-sys-color-on-surface)',
                transitionProperty: 'all',
                transitionDuration: '150ms',
              }}
              type="number"
              value={maxTokens}
              onChange={(e) => onChange('maxTokens', parseInt(e.target.value, 10))}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

export { AIBehaviorSection }
