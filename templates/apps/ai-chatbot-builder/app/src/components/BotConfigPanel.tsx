import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
interface BotConfigPanelProps {
  personas: string[]
  selectedPersona: string
  modelName: string
  latency: string
  temperature: number
  topP: number
  systemPrompt: string
  onEditSystemPrompt: () => void
  onPersonaChange: (persona: string) => void
}

export default function BotConfigPanel({
  personas,
  selectedPersona,
  modelName,
  latency,
  temperature,
  topP,
  systemPrompt,
  onEditSystemPrompt,
  onPersonaChange,
}: BotConfigPanelProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <aside
      className={cm.flex({ direction: 'col' })}
      style={{
        width: '340px',
        borderTopWidth: '1px',
        borderColor: 'var(--color-panel-border)',
        backgroundColor: 'var(--md-sys-color-surface-container-low)',
        padding: 'calc(6 * 0.25rem)',
        rowGap: '8*0.25rem',
      }}
      data-mol-id="bot-config-panel"
    >
      <div data-mol-id="bot-config-section">
        <h2
          className={cm.cn(cm.fontWeight('bold'), cm.sp('mb', 4))}
          style={{
            fontSize: '10px',
            color: 'var(--md-sys-color-outline)',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
          }}
        >
          {t('bot-config-panel.bot-configuration', {}, { defaultValue: 'Bot Configuration' })}
        </h2>
        <div style={{ rowGap: '4*0.25rem' }}>
          <div style={{ rowGap: '1.5*0.25rem' }} data-mol-id="persona-selector">
            <label
              className={cm.fontWeight('bold')}
              style={{
                fontSize: '11px',
                color: 'var(--md-sys-color-on-surface-variant)',
                paddingLeft: 'calc(1 * 0.25rem)',
                paddingRight: 'calc(1 * 0.25rem)',
              }}
            >
              {t('bot-config-panel.active-persona', {}, { defaultValue: 'Active Persona' })}
            </label>
            <div style={{ position: 'relative' }}>
              <select
                className={'focus:ring-2 focus:ring-primary/20'}
                style={{
                  width: '100%',
                  backgroundColor: 'var(--md-sys-color-surface-container-lowest)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: 'var(--color-panel-border-medium)',
                  borderRadius: '0.5rem',
                  paddingLeft: 'calc(3 * 0.25rem)',
                  paddingRight: 'calc(3 * 0.25rem)',
                  padding: 'calc(2.5 * 0.25rem)',
                  fontSize: '${textSizeToRem($1)}',
                  lineHeight: '${textSizeToLineHeight($1)}',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  outline: '2px solid transparent',
                  outlineOffset: '2px',
                }}
                value={selectedPersona}
                onChange={(e) => onPersonaChange(e.target.value)}
              >
                {personas.map((persona) => (
                  <option key={persona} value={persona}>
                    {persona}
                  </option>
                ))}
              </select>
              <span
                style={{
                  fontFamily: 'Material Symbols outlined',
                  position: 'absolute',
                  inset: 'calc(3 * 0.25rem)',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--md-sys-color-outline)',
                  pointerEvents: 'none',
                }}
                data-icon="expand_more"
              >
                expand_more
              </span>
            </div>
          </div>
          <div
            style={{
              backgroundColor:
                'color-mix(in srgb, var(--md-sys-color-surface-container-lowest) 50%, transparent)',
              padding: 'calc(3 * 0.25rem)',
              borderRadius: '0.5rem',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: 'var(--color-panel-border-faint)',
              rowGap: '2*0.25rem',
            }}
            data-mol-id="model-info"
          >
            <div className={cm.flex({ justify: 'between', align: 'center' })}>
              <span
                className={cm.fontWeight('medium')}
                style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-variant)' }}
              >
                {t('bot-config-panel.underlying-model', {}, { defaultValue: 'Underlying Model' })}
              </span>
              <span
                className={cm.fontWeight('bold')}
                style={{
                  paddingLeft: 'calc(1.5 * 0.25rem)',
                  paddingRight: 'calc(1.5 * 0.25rem)',
                  padding: 'calc(0.5 * 0.25rem)',
                  backgroundColor: 'var(--md-sys-color-tertiary-container)',
                  color: 'var(--md-sys-color-on-tertiary-container)',
                  fontSize: '9px',
                  borderRadius: '0.25rem',
                }}
              >
                {t('bot-config-panel.premium', {}, { defaultValue: 'PREMIUM' })}
              </span>
            </div>
            <p
              className={cm.fontWeight('semibold')}
              style={{
                fontSize: '${textSizeToRem($1)}',
                lineHeight: '${textSizeToLineHeight($1)}',
              }}
            >
              {modelName}
            </p>
            <div
              className={cm.cn(cm.flex({ align: 'center' }), cm.sp('mt', 2))}
              style={{ gap: 'calc(2 * 0.25rem)' }}
            >
              <span
                style={{
                  fontFamily: 'Material Symbols outlined',
                  color: 'var(--md-sys-color-primary)',
                  fontVariationSettings: "'FILL' 1",
                }}
                data-icon="check_circle"
              >
                check_circle
              </span>
              <span style={{ fontSize: '11px', color: 'var(--md-sys-color-outline)' }}>
                {t('bot-config-panel.latencies-label', {}, { defaultValue: 'Latencies:' })}{' '}
                {latency}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div data-mol-id="model-parameters">
        <div className={cm.cn(cm.flex({ justify: 'between', align: 'center' }), cm.sp('mb', 4))}>
          <h2
            className={cm.fontWeight('bold')}
            style={{
              fontSize: '10px',
              color: 'var(--md-sys-color-outline)',
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
            }}
          >
            {t('bot-config-panel.model-parameters', {}, { defaultValue: 'Model Parameters' })}
          </h2>
          <span
            style={{
              fontSize: '10px',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              backgroundColor: 'color-mix(in srgb, var(--md-sys-color-primary) 10%, transparent)',
              color: 'var(--md-sys-color-primary)',
              paddingLeft: 'calc(1.5 * 0.25rem)',
              paddingRight: 'calc(1.5 * 0.25rem)',
              borderRadius: '0.25rem',
            }}
          >
            {temperature}
          </span>
        </div>
        <div style={{ rowGap: '6*0.25rem' }}>
          <div style={{ rowGap: '3*0.25rem' }} data-mol-id="temperature-slider">
            <div className={cm.flex({ justify: 'between', align: 'end' })}>
              <label
                className={cm.fontWeight('bold')}
                style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-variant)' }}
              >
                {t('bot-config-panel.temperature', {}, { defaultValue: 'Temperature' })}
              </label>
              <span
                className={cm.fontWeight('medium')}
                style={{ fontSize: '9px', color: 'var(--md-sys-color-outline)' }}
              >
                {t(
                  'bot-config-panel.balanced-accurate',
                  {},
                  { defaultValue: 'Balanced & Accurate' },
                )}
              </span>
            </div>
            <input
              className={cm.cn(cm.roundedFull, cm.cursorPointer)}
              style={{
                width: '100%',
                height: '6px',
                backgroundColor:
                  'color-mix(in srgb, var(--md-sys-color-outline-variant) 30%, transparent)',
                appearance: 'none',
                WebkitAppearance: 'none',
                accentColor: 'var(--md-sys-color-primary)',
              }}
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={temperature}
              onChange={() => {}}
            />
          </div>
          <div style={{ rowGap: '3*0.25rem' }} data-mol-id="top-p-slider">
            <div className={cm.flex({ justify: 'between', align: 'end' })}>
              <label
                className={cm.fontWeight('bold')}
                style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-variant)' }}
              >
                {t('bot-config-panel.top-p', {}, { defaultValue: 'Top-P' })}
              </label>
              <span
                className={cm.fontWeight('medium')}
                style={{ fontSize: '9px', color: 'var(--md-sys-color-outline)' }}
              >
                {t('bot-config-panel.diversity-control', {}, { defaultValue: 'Diversity Control' })}
              </span>
            </div>
            <input
              className={cm.cn(cm.roundedFull, cm.cursorPointer)}
              style={{
                width: '100%',
                height: '6px',
                backgroundColor:
                  'color-mix(in srgb, var(--md-sys-color-outline-variant) 30%, transparent)',
                appearance: 'none',
                WebkitAppearance: 'none',
                accentColor: 'var(--md-sys-color-primary)',
              }}
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={topP}
              onChange={() => {}}
            />
          </div>
        </div>
      </div>
      <div
        className={cm.cn(cm.flex({ direction: 'col' }), cm.flex1)}
        style={{ minHeight: '0px' }}
        data-mol-id="system-prompt-section"
      >
        <h2
          className={cm.cn(cm.fontWeight('bold'), cm.sp('mb', 4))}
          style={{
            fontSize: '10px',
            color: 'var(--md-sys-color-outline)',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
          }}
        >
          {t(
            'bot-config-panel.system-prompt-preview',
            {},
            { defaultValue: 'System Prompt Preview' },
          )}
        </h2>
        <div
          className={cm.flex1}
          style={{
            backgroundColor: 'var(--md-sys-color-surface-container-lowest)',
            padding: 'calc(4 * 0.25rem)',
            borderRadius: '0.75rem',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--color-panel-border)',
            overflowY: 'auto',
          }}
          data-mol-id="system-prompt-preview"
        >
          <pre
            style={{
              fontSize: '11px',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              lineHeight: '1.625',
              color: 'var(--md-sys-color-on-surface-variant)',
              whiteSpace: 'pre-wrap',
            }}
          >
            {systemPrompt}
          </pre>
        </div>
        <button
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.sp('mt', 4),
            cm.fontWeight('bold'),
            'hover:bg-primary/5',
          )}
          style={{
            gap: 'calc(2 * 0.25rem)',
            padding: 'calc(2 * 0.25rem)',
            fontSize: '${textSizeToRem($1)}',
            lineHeight: '${textSizeToLineHeight($1)}',
            color: 'var(--md-sys-color-primary)',
            borderRadius: '0.5rem',
            transitionProperty:
              'color, background-color, border-color, text-decoration-color, fill, stroke',
            transitionDuration: '150ms',
            transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--color-panel-border)',
          }}
          onClick={onEditSystemPrompt}
          data-mol-id="edit-system-prompt-btn"
        >
          <span
            style={{
              fontFamily: 'Material Symbols outlined',
              fontSize: '${textSizeToRem($1)}',
              lineHeight: '${textSizeToLineHeight($1)}',
            }}
            data-icon="edit"
          >
            edit
          </span>
          {t('bot-config-panel.edit-system-prompt', {}, { defaultValue: 'Edit System Prompt' })}
        </button>
      </div>
      <div
        style={{
          padding: 'calc(4 * 0.25rem)',
          borderTopWidth: '1px',
          borderColor: 'var(--color-panel-border)',
        }}
        data-mol-id="token-efficiency"
      >
        <div
          className={cm.flex({ align: 'start' })}
          style={{
            padding: 'calc(3 * 0.25rem)',
            backgroundColor:
              'color-mix(in srgb, var(--md-sys-color-primary-container) 10%, transparent)',
            borderRadius: '0.5rem',
            gap: 'calc(3 * 0.25rem)',
          }}
        >
          <span
            style={{
              fontFamily: 'Material Symbols outlined',
              color: 'var(--md-sys-color-primary)',
              fontVariationSettings: "'FILL' 1",
            }}
            data-icon="info"
          >
            info
          </span>
          <div>
            <p
              className={cm.fontWeight('bold')}
              style={{ fontSize: '11px', color: 'var(--md-sys-color-on-primary-fixed-variant)' }}
            >
              {t('bot-config-panel.token-efficiency', {}, { defaultValue: 'Token Efficiency' })}
            </p>
            <p
              style={{
                fontSize: '10px',
                color:
                  'color-mix(in srgb, var(--md-sys-color-on-primary-fixed-variant) 70%, transparent)',
                lineHeight: '1.5',
              }}
            >
              {t(
                'bot-config-panel.token-efficiency-desc',
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
  )
}

export { BotConfigPanel }
