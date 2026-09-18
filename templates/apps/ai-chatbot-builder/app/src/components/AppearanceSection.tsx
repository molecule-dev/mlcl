import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
interface AppearanceSectionProps {
  widgetColor: string
  position: string
  welcomeMessage: string
  typingIndicatorEnabled: boolean
  onChange: (field: string, value: string | boolean) => void
}

export default function AppearanceSection({
  widgetColor,
  position,
  welcomeMessage,
  typingIndicatorEnabled,
  onChange,
}: AppearanceSectionProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const positionOptions = [
    { value: 'north_west', icon: 'north_west' },
    { value: 'north_east', icon: 'north_east' },
    { value: 'south_west', icon: 'south_west' },
    { value: 'south_east', icon: 'south_east' },
  ]

  return (
    <section style={{ rowGap: '6*0.25rem' }} data-mol-id="appearance-section">
      <h3
        className={cm.fontWeight('bold')}
        style={{
          fontFamily: 'var(--font-headline, sans-serif)',
          fontSize: '${textSizeToRem($1)}',
          lineHeight: '${textSizeToLineHeight($1)}',
          letterSpacing: "${1 === 'tighter' ? '-0.05em' : '-0.025em'}",
        }}
      >
        {t('nav.appearance', {}, { defaultValue: 'Appearance' })}
      </h3>
      <div
        style={{
          backgroundColor: 'var(--md-sys-color-surface-container-lowest)',
          borderRadius: '3rem',
          padding: 'calc(8 * 0.25rem)',
          boxShadow: '0 2px 12px 0 rgb(0 0 0 / 0.08)',
          rowGap: '10*0.25rem',
        }}
        data-mol-id="appearance-card"
      >
        <div className={cm.flex({ align: 'start' })} style={{ gap: 'calc(12 * 0.25rem)' }}>
          <div
            className={cm.flex1}
            style={{ rowGap: '8*0.25rem' }}
            data-mol-id="appearance-controls"
          >
            <div className={cm.grid({ cols: 2 })} style={{ gap: 'calc(8 * 0.25rem)' }}>
              <div style={{ rowGap: '1.5*0.25rem' }} data-mol-id="widget-color-field">
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
                  {t('appearance-section.widget-color-label', {}, { defaultValue: 'Widget Color' })}
                </label>
                <div
                  className={cm.flex({ align: 'center' })}
                  style={{
                    gap: 'calc(3 * 0.25rem)',
                    backgroundColor: 'var(--md-sys-color-surface-container-high)',
                    borderRadius: '2rem',
                    paddingLeft: 'calc(4 * 0.25rem)',
                    paddingRight: 'calc(4 * 0.25rem)',
                    padding: 'calc(2 * 0.25rem)',
                  }}
                >
                  <div
                    className={cm.roundedFull}
                    style={{
                      width: '8rem-scaled',
                      height: 'calc(8 * 0.25rem)',
                      boxShadow:
                        '0 4px 6px -1px color-mix(in srgb, var(--md-sys-color-black) 10%, transparent)',
                      backgroundColor: widgetColor,
                    }}
                  ></div>
                  <span
                    style={{
                      fontFamily:
                        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      fontSize: '${textSizeToRem($1)}',
                      lineHeight: '${textSizeToLineHeight($1)}',
                      color: 'var(--md-sys-color-on-surface)',
                    }}
                  >
                    {widgetColor}
                  </span>
                </div>
              </div>
              <div style={{ rowGap: '1.5*0.25rem' }} data-mol-id="position-field">
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
                  {t('appearance-section.position-label', {}, { defaultValue: 'Position' })}
                </label>
                <div className={cm.flex()} style={{ gap: 'calc(2 * 0.25rem)' }}>
                  {positionOptions.map(({ value, icon }) => (
                    <button
                      key={value}
                      data-mol-id={`position-btn-${value}`}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${position === value ? 'bg-primary text-white' : 'bg-surface-container-high text-slate-300'}`}
                      onClick={() => onChange('position', value)}
                    >
                      <span
                        style={{
                          fontFamily: 'Material Symbols outlined',
                          fontSize: '${textSizeToRem($1)}',
                          lineHeight: '${textSizeToLineHeight($1)}',
                        }}
                      >
                        {icon}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ rowGap: '1.5*0.25rem' }} data-mol-id="welcome-message-field">
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
                {t(
                  'appearance-section.welcome-message-label',
                  {},
                  { defaultValue: 'Welcome Message' },
                )}
              </label>
              <input
                className={cm.cn(
                  cm.fontWeight('medium'),
                  'focus:ring-2 focus:ring-surface-tint/15',
                )}
                style={{
                  width: '100%',
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
                type="text"
                value={welcomeMessage}
                onChange={(e) => onChange('welcomeMessage', e.target.value)}
              />
            </div>
            <div
              className={cm.flex({ align: 'center', justify: 'between' })}
              style={{ padding: 'calc(2 * 0.25rem)' }}
              data-mol-id="typing-indicator-field"
            >
              <div>
                <p
                  className={cm.fontWeight('bold')}
                  style={{ color: 'var(--md-sys-color-on-surface)' }}
                >
                  {t(
                    'appearance-section.typing-indicator-title',
                    {},
                    { defaultValue: 'Typing Indicator' },
                  )}
                </p>
                <p
                  style={{
                    fontSize: '${textSizeToRem($1)}',
                    lineHeight: '${textSizeToLineHeight($1)}',
                    color: 'var(--md-sys-color-on-surface-variant)',
                  }}
                >
                  {t(
                    'appearance-section.typing-indicator-desc',
                    {},
                    { defaultValue: "Show 'Bot is typing...' animation" },
                  )}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={typingIndicatorEnabled}
                aria-label={t(
                  'appearance-section.typing-indicator-title',
                  {},
                  { defaultValue: 'Typing Indicator' },
                )}
                className={`w-12 h-6 rounded-full relative cursor-pointer ${typingIndicatorEnabled ? 'bg-tertiary' : 'bg-surface-container-highest'}`}
                onClick={() => onChange('typingIndicatorEnabled', !typingIndicatorEnabled)}
                data-mol-id="typing-indicator-toggle"
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-surface rounded-full transition-all ${typingIndicatorEnabled ? 'right-1' : 'left-1'}`}
                ></span>
              </button>
            </div>
          </div>
          <div
            style={{
              width: '72rem-scaled',
              aspectRatio: '',
              backgroundColor: 'var(--md-sys-color-surface)',
              borderRadius: '3rem',
              padding: 'calc(4 * 0.25rem)',
              boxShadow: 'var(--tw-shadow-2xl, revert)',
              position: 'relative',
              borderWidth: '8px',
              borderStyle: 'solid',
              borderColor: 'var(--md-sys-color-surface-container-highest)',
              overflow: 'hidden',
            }}
            data-mol-id="chat-preview"
          >
            <div
              className={cm.flex({ align: 'center', justify: 'between' })}
              style={{
                height: 'calc(8 * 0.25rem)',
                backgroundColor: 'var(--md-sys-color-primary)',
                borderTopLeftRadius: 'var(--radius-xl)',
                borderTopRightRadius: 'var(--radius-xl)',
                marginLeft: '-16px',
                marginRight: '-16px',
                marginTop: '-16px',
                paddingLeft: 'calc(4 * 0.25rem)',
                paddingRight: 'calc(4 * 0.25rem)',
              }}
            >
              <span
                className={cm.fontWeight('bold')}
                style={{
                  fontSize: '10px',
                  color: 'var(--color-on-error)',
                  textTransform: 'uppercase',
                  letterSpacing: 'widest',
                }}
              >
                {t('appearance-section.preview-label', {}, { defaultValue: 'Preview' })}
              </span>
              <span
                style={{
                  fontFamily: 'Material Symbols outlined',
                  color: 'var(--color-on-error)',
                  fontSize: '${textSizeToRem($1)}',
                  lineHeight: '${textSizeToLineHeight($1)}',
                }}
              >
                close
              </span>
            </div>
            <div className={cm.sp('mt', 4)} style={{ rowGap: '3*0.25rem' }}>
              <div
                style={{
                  width: '75.00%',
                  padding: 'calc(2.5 * 0.25rem)',
                  borderRadius: '2rem',
                  backgroundColor: 'var(--md-sys-color-surface-container-high)',
                  fontSize: '11px',
                  color: 'var(--md-sys-color-on-surface)',
                  lineHeight: '1.375',
                }}
                data-mol-id="preview-bot-message"
              >
                {welcomeMessage}
              </div>
              <div className={cm.flex({ justify: 'end' })}>
                <div
                  style={{
                    width: '50.00%',
                    padding: 'calc(2.5 * 0.25rem)',
                    borderRadius: '2rem',
                    backgroundColor: 'var(--md-sys-color-primary)',
                    color: 'var(--color-on-error)',
                    fontSize: '11px',
                    lineHeight: '1.375',
                  }}
                  data-mol-id="preview-user-message"
                >
                  {t(
                    'appearance-section.preview-user-msg',
                    {},
                    { defaultValue: 'I need help with billing' },
                  )}
                </div>
              </div>
              <div
                className={cm.flex({ align: 'center' })}
                style={{
                  width: '66.67%',
                  padding: 'calc(2.5 * 0.25rem)',
                  borderRadius: '2rem',
                  backgroundColor: 'var(--md-sys-color-surface-container-high)',
                  gap: 'calc(1 * 0.25rem)',
                }}
                data-mol-id="preview-typing-dots"
              >
                <div
                  className={cm.roundedFull}
                  style={{
                    width: '1rem-scaled',
                    height: 'calc(1 * 0.25rem)',
                    backgroundColor: 'var(--md-sys-color-on-surface-variant)',
                    opacity: 'calc(40 / 100)',
                  }}
                ></div>
                <div
                  className={cm.roundedFull}
                  style={{
                    width: '1rem-scaled',
                    height: 'calc(1 * 0.25rem)',
                    backgroundColor: 'var(--md-sys-color-on-surface-variant)',
                    opacity: 'calc(60 / 100)',
                  }}
                ></div>
                <div
                  className={cm.roundedFull}
                  style={{
                    width: '1rem-scaled',
                    height: 'calc(1 * 0.25rem)',
                    backgroundColor: 'var(--md-sys-color-on-surface-variant)',
                    opacity: 'calc(80 / 100)',
                  }}
                ></div>
              </div>
            </div>
            <div
              className={cm.flex({ align: 'center' })}
              style={{ position: 'absolute', inset: 'calc(4 * 0.25rem)', gap: 'calc(2 * 0.25rem)' }}
              data-mol-id="preview-input-bar"
            >
              <div
                className={cm.cn(cm.flex1, cm.roundedFull)}
                style={{
                  height: 'calc(8 * 0.25rem)',
                  backgroundColor: 'var(--md-sys-color-surface-container-highest)',
                }}
              ></div>
              <div
                className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.roundedFull)}
                style={{
                  width: '8rem-scaled',
                  height: 'calc(8 * 0.25rem)',
                  backgroundColor: 'var(--md-sys-color-primary)',
                  color: 'var(--color-on-error)',
                }}
              >
                <span
                  style={{
                    fontFamily: 'Material Symbols outlined',
                    fontVariationSettings: "'FILL' 1",
                  }}
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

export { AppearanceSection }
