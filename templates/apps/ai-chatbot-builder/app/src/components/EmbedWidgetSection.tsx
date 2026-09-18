import { useCallback, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
interface EmbedWidgetSectionProps {
  botId: string
  snippetCode: string
  initialMessage: string
  themeColor: string
}

export default function EmbedWidgetSection({
  botId,
  snippetCode,
  initialMessage,
  themeColor,
}: EmbedWidgetSectionProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [position, setPosition] = useState<'bottom-right' | 'bottom-left'>('bottom-right')
  const [message, setMessage] = useState(initialMessage)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(snippetCode)
  }, [snippetCode])

  return (
    <section
      data-mol-id={`embed-widget-section-${botId}`}
      className={cm.flex({ direction: 'col' })}
      style={{
        backgroundColor: 'var(--md-sys-color-surface-container-lowest)',
        borderRadius: '2rem',
        padding: 'calc(8 * 0.25rem)',
        boxShadow: '0 2px 12px 0 rgb(0 0 0 / 0.08)',
        position: 'relative',
        overflow: 'hidden',
        gap: 'calc(8 * 0.25rem)',
      }}
    >
      <div className={cm.flex({ justify: 'between', align: 'start' })}>
        <div data-mol-id="embed-widget-header">
          <h2
            className={cm.cn(cm.fontWeight('bold'), cm.sp('mb', 2))}
            style={{
              fontSize: '${textSizeToRem($1)}',
              lineHeight: '${textSizeToLineHeight($1)}',
              fontFamily: 'var(--font-headline, sans-serif)',
            }}
          >
            {t('embed-widget.title', {}, { defaultValue: 'Embed Widget' })}
          </h2>
          <p
            style={{
              color: 'color-mix(in srgb, var(--md-sys-color-on-surface-variant) 60%, transparent)',
              fontSize: '${textSizeToRem($1)}',
              lineHeight: '${textSizeToLineHeight($1)}',
            }}
          >
            {t(
              'embed-widget.subtitle',
              {},
              { defaultValue: 'Add a floating chat bubble to your website.' },
            )}
          </p>
        </div>
        <div
          className={cm.flex({ align: 'center', justify: 'center' })}
          style={{
            width: '12rem-scaled',
            height: 'calc(12 * 0.25rem)',
            backgroundColor: 'var(--md-sys-color-surface-container-high)',
            borderRadius: '2rem',
            color: 'var(--md-sys-color-primary)',
          }}
        >
          <span
            style={{ fontFamily: 'Material Symbols outlined', fontVariationSettings: "'FILL' 1" }}
          >
            code
          </span>
        </div>
      </div>
      <div
        className={cm.cn(cm.grid({ cols: 1 }), 'md:grid-cols-2')}
        style={{ gap: 'calc(6 * 0.25rem)' }}
      >
        <div style={{ rowGap: '4*0.25rem' }} data-mol-id="embed-widget-controls">
          <label style={{ display: 'block' }}>
            <span
              className={cm.cn(cm.fontWeight('bold'), cm.sp('mb', 2))}
              style={{
                fontSize: '${textSizeToRem($1)}',
                lineHeight: '${textSizeToLineHeight($1)}',
                color:
                  'color-mix(in srgb, var(--md-sys-color-on-surface-variant) 70%, transparent)',
                textTransform: 'uppercase',
                letterSpacing: 'widest',
                display: 'block',
              }}
            >
              {t('embed-widget.position-label', {}, { defaultValue: 'Position' })}
            </span>
            <div
              className={cm.flex()}
              style={{
                gap: 'calc(2 * 0.25rem)',
                padding: 'calc(1 * 0.25rem)',
                backgroundColor: 'var(--md-sys-color-surface-container-high)',
                borderRadius: '0.75rem',
              }}
            >
              <button
                className={`flex-1 py-2 text-xs font-bold rounded-lg ${position === 'bottom-right' ? 'bg-white shadow-sm text-primary' : 'text-on-surface-variant/50 hover:text-on-surface transition-colors'}`}
                onClick={() => setPosition('bottom-right')}
              >
                {t('embed-widget.position-bottom-right', {}, { defaultValue: 'Bottom Right' })}
              </button>
              <button
                className={`flex-1 py-2 text-xs font-bold rounded-lg ${position === 'bottom-left' ? 'bg-white shadow-sm text-primary' : 'text-on-surface-variant/50 hover:text-on-surface transition-colors'}`}
                onClick={() => setPosition('bottom-left')}
              >
                {t('embed-widget.position-bottom-left', {}, { defaultValue: 'Bottom Left' })}
              </button>
            </div>
          </label>
          <label style={{ display: 'block' }}>
            <span
              className={cm.cn(cm.fontWeight('bold'), cm.sp('mb', 2))}
              style={{
                fontSize: '${textSizeToRem($1)}',
                lineHeight: '${textSizeToLineHeight($1)}',
                color:
                  'color-mix(in srgb, var(--md-sys-color-on-surface-variant) 70%, transparent)',
                textTransform: 'uppercase',
                letterSpacing: 'widest',
                display: 'block',
              }}
            >
              {t('embed-widget.theme-color-label', {}, { defaultValue: 'Theme Color' })}
            </span>
            <div
              className={cm.flex({ align: 'center' })}
              style={{
                gap: 'calc(3 * 0.25rem)',
                padding: 'calc(3 * 0.25rem)',
                backgroundColor: 'var(--md-sys-color-surface-container-high)',
                borderRadius: '0.75rem',
              }}
              data-mol-id="theme-color-picker"
            >
              <div
                className={cm.roundedFull}
                style={{
                  width: '6rem-scaled',
                  height: 'calc(6 * 0.25rem)',
                  boxShadow:
                    '0 0 0 3px color-mix(in srgb, var(--md-sys-color-primary) 10%, transparent)',
                  backgroundColor: themeColor,
                }}
              ></div>
              <span
                className={cm.fontWeight('medium')}
                style={{
                  fontSize: '${textSizeToRem($1)}',
                  lineHeight: '${textSizeToLineHeight($1)}',
                  color: 'var(--md-sys-color-on-surface)',
                }}
              >
                {themeColor}
              </span>
              <span
                style={{
                  fontFamily: 'Material Symbols outlined',
                  marginLeft: 'auto',
                  color:
                    'color-mix(in srgb, var(--md-sys-color-on-surface-variant) 40%, transparent)',
                }}
              >
                colorize
              </span>
            </div>
          </label>
          <label style={{ display: 'block' }}>
            <span
              className={cm.cn(cm.fontWeight('bold'), cm.sp('mb', 2))}
              style={{
                fontSize: '${textSizeToRem($1)}',
                lineHeight: '${textSizeToLineHeight($1)}',
                color:
                  'color-mix(in srgb, var(--md-sys-color-on-surface-variant) 70%, transparent)',
                textTransform: 'uppercase',
                letterSpacing: 'widest',
                display: 'block',
              }}
            >
              {t('embed-widget.initial-message-label', {}, { defaultValue: 'Initial Message' })}
            </span>
            <input
              className={'focus:ring-2 focus:ring-primary/20'}
              style={{
                width: '100%',
                backgroundColor: 'var(--md-sys-color-surface-container-high)',
                borderColor: 'var(--md-sys-color-none)',
                borderRadius: '0.75rem',
                padding: 'calc(3 * 0.25rem)',
                paddingLeft: 'calc(4 * 0.25rem)',
                paddingRight: 'calc(4 * 0.25rem)',
                fontSize: '${textSizeToRem($1)}',
                lineHeight: '${textSizeToLineHeight($1)}',
              }}
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </label>
        </div>
        <div style={{ position: 'relative' }} data-mol-id="embed-widget-preview">
          <img
            className={'group-hover:brightness-100'}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: '2rem',
              filter: 'brightness(90)',
              transitionProperty: 'all',
              transitionDuration: '500ms',
            }}
            alt={t(
              'embed-widget.preview-image-alt',
              {},
              {
                defaultValue:
                  'close up of lines of computer code on a dark monitor with purple and blue glowing highlights',
              },
            )}
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCSSyjQfzpLo_iajHXVDOEG_43iuHUlASfLkyRGQWJm4yvlcnziDd_BBmZ0CX2F-xAMlCdpaat2Djbn2AkEbwB0qwvnx1n9qxIjvu3Y0yk8PmrtyBxrDghtvK-_QJUa6tc48wYmlOThoB9F8095VS5yzckpEnVIp42qxRBA3UdDHjfEosL9ZACL_OI9lDQWvXQlSWagJ8tKNXXOkQu0E2Ae-MN7EwISlqzGLJIjWngC2QLS4HxStmtI4g8uIJb9FVxESE4kk1m9C2Q"
          />
          <div
            className={cm.flex({ align: 'end' })}
            style={{
              position: 'absolute',
              inset: 'calc(0 * 0.25rem)',
              backgroundImage: 'linear-gradient(to right, currentColor, transparent)',
              padding: 'calc(4 * 0.25rem)',
            }}
          >
            <div
              style={{
                backgroundColor: 'color-mix(in srgb, var(--md-sys-color-white) 10%, transparent)',
                backdropFilter: 'blur(var(--blur-md, 12px))',
                borderRadius: '0.5rem',
                padding: 'calc(3 * 0.25rem)',
                width: '100%',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: 'var(--color-panel-border-faint)',
              }}
            >
              <div
                className={cm.cn(cm.flex({ align: 'center' }), cm.sp('mb', 1))}
                style={{ gap: 'calc(2 * 0.25rem)' }}
              >
                <div
                  className={cm.roundedFull}
                  style={{
                    width: '2rem-scaled',
                    height: 'calc(2 * 0.25rem)',
                    backgroundColor: '${tailwindScaleToHex($1,$2)}',
                  }}
                ></div>
                <span
                  className={cm.fontWeight('bold')}
                  style={{
                    fontSize: '10px',
                    color: 'var(--color-on-error)',
                    textTransform: 'uppercase',
                  }}
                >
                  {t('embed-widget.preview-badge', {}, { defaultValue: 'Widget Preview' })}
                </span>
              </div>
              <p
                style={{
                  fontSize: '10px',
                  color: 'color-mix(in srgb, var(--md-sys-color-white) 70%, transparent)',
                  fontStyle: 'italic',
                }}
              >
                {t(
                  'embed-widget.preview-caption',
                  {},
                  { defaultValue: 'Showing "Deep Indigo" theme on dark site.' },
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div
        style={{
          backgroundColor: 'var(--md-sys-color-surface-container-highest)',
          borderRadius: '2rem',
          padding: 'calc(6 * 0.25rem)',
        }}
        data-mol-id="embed-widget-snippet"
      >
        <div className={cm.cn(cm.flex({ justify: 'between', align: 'center' }), cm.sp('mb', 4))}>
          <span
            className={cm.fontWeight('bold')}
            style={{
              fontSize: '${textSizeToRem($1)}',
              lineHeight: '${textSizeToLineHeight($1)}',
              color: 'var(--md-sys-color-primary)',
              letterSpacing: 'widest',
              textTransform: 'uppercase',
            }}
          >
            {t('embed-widget.html-snippet-label', {}, { defaultValue: 'HTML Snippet' })}
          </span>
          <button
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.fontWeight('bold'),
              cm.roundedFull,
              'hover:scale-105 active:scale-95',
            )}
            style={{
              gap: 'calc(2 * 0.25rem)',
              paddingLeft: 'calc(4 * 0.25rem)',
              paddingRight: 'calc(4 * 0.25rem)',
              padding: 'calc(2 * 0.25rem)',
              backgroundColor: 'var(--md-sys-color-primary)',
              color: 'var(--color-on-error)',
              fontSize: '${textSizeToRem($1)}',
              lineHeight: '${textSizeToLineHeight($1)}',
              transitionProperty: 'all',
              transitionDuration: '150ms',
            }}
            onClick={handleCopy}
          >
            <span
              style={{
                fontFamily: 'Material Symbols outlined',
                fontSize: '${textSizeToRem($1)}',
                lineHeight: '${textSizeToLineHeight($1)}',
              }}
            >
              content_copy
            </span>
            {t('embed-widget.copy-code', {}, { defaultValue: 'Copy Code' })}
          </button>
        </div>
        <pre
          style={{
            backgroundColor: 'var(--md-sys-color-on-surface)',
            color: 'color-mix(in srgb, var(--md-sys-color-cyan-100) 90%, transparent)',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: '${textSizeToRem($1)}',
            lineHeight: '1.625',
            padding: 'calc(5 * 0.25rem)',
            borderRadius: '0.75rem',
            borderColor: 'var(--md-sys-color-tertiary)',
            whiteSpace: 'pre-wrap',
          }}
        >
          {snippetCode}
        </pre>
      </div>
    </section>
  )
}

export { EmbedWidgetSection }
