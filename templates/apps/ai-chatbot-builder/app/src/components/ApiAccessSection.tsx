import { useCallback, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
interface ApiAccessSectionProps {
  endpointUrl: string
  apiKey: string
  rateLimitUsed: number
  rateLimitTotal: number
  docsUrl: string
}

export default function ApiAccessSection({
  endpointUrl,
  apiKey,
  rateLimitUsed,
  rateLimitTotal,
  docsUrl,
}: ApiAccessSectionProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [showKey, setShowKey] = useState(false)

  const rateLimitPercent = Math.round((rateLimitUsed / rateLimitTotal) * 100)

  const handleCopyKey = useCallback(() => {
    navigator.clipboard.writeText(apiKey)
  }, [apiKey])

  return (
    <section
      className={'lg:col-span-1'}
      style={{
        backgroundColor: 'var(--md-sys-color-surface-container-lowest)',
        borderRadius: '2rem',
        padding: 'calc(8 * 0.25rem)',
        boxShadow: '0 2px 12px 0 rgb(0 0 0 / 0.08)',
      }}
      data-mol-id="api-access-section"
    >
      <div
        className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 8))}
        data-mol-id="api-access-header"
      >
        <div>
          <h2
            className={cm.cn(cm.fontWeight('bold'), cm.sp('mb', 2))}
            style={{
              fontSize: '${textSizeToRem($1)}',
              lineHeight: '${textSizeToLineHeight($1)}',
              fontFamily: 'var(--font-headline, sans-serif)',
            }}
          >
            {t('api-access.title', {}, { defaultValue: 'API Access' })}
          </h2>
          <p
            style={{
              color: 'color-mix(in srgb, var(--md-sys-color-on-surface-variant) 60%, transparent)',
              fontSize: '${textSizeToRem($1)}',
              lineHeight: '${textSizeToLineHeight($1)}',
            }}
          >
            {t(
              'api-access.subtitle',
              {},
              { defaultValue: 'Build custom integrations with our REST API.' },
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
            api
          </span>
        </div>
      </div>
      <div style={{ rowGap: '6*0.25rem' }}>
        <div data-mol-id="api-access-endpoint">
          <span
            className={cm.cn(cm.fontWeight('bold'), cm.sp('mb', 3))}
            style={{
              fontSize: '10px',
              color: 'color-mix(in srgb, var(--md-sys-color-on-surface-variant) 70%, transparent)',
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              display: 'block',
            }}
          >
            {t('api-access.endpoint-url-label', {}, { defaultValue: 'Endpoint URL' })}
          </span>
          <div
            className={cm.flex({ align: 'center' })}
            style={{
              padding: 'calc(4 * 0.25rem)',
              backgroundColor: 'color-mix(in srgb, var(--md-sys-color-on-surface) 5%, transparent)',
              borderRadius: '0.75rem',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontSize: '${textSizeToRem($1)}',
              lineHeight: '${textSizeToLineHeight($1)}',
              color: 'var(--md-sys-color-on-surface-variant)',
              gap: 'calc(2 * 0.25rem)',
            }}
          >
            <span
              className={cm.fontWeight('bold')}
              style={{ color: 'var(--md-sys-color-primary)' }}
            >
              {t('api-access.post-method', {}, { defaultValue: 'POST' })}
            </span>
            <span>{endpointUrl}</span>
          </div>
        </div>
        <div data-mol-id="api-access-key">
          <span
            className={cm.cn(cm.fontWeight('bold'), cm.sp('mb', 3))}
            style={{
              fontSize: '10px',
              color: 'color-mix(in srgb, var(--md-sys-color-on-surface-variant) 70%, transparent)',
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              display: 'block',
            }}
          >
            {t('api-access.secret-api-key-label', {}, { defaultValue: 'Secret API Key' })}
          </span>
          <div className={cm.flex()} style={{ gap: 'calc(2 * 0.25rem)' }}>
            <div
              className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.flex1)}
              style={{
                padding: 'calc(4 * 0.25rem)',
                backgroundColor:
                  'color-mix(in srgb, var(--md-sys-color-on-surface) 5%, transparent)',
                borderRadius: '0.75rem',
              }}
            >
              <span
                style={{
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  fontSize: '${textSizeToRem($1)}',
                  lineHeight: '${textSizeToLineHeight($1)}',
                  color: 'var(--md-sys-color-on-surface-variant)',
                  letterSpacing: 'widest',
                }}
              >
                {showKey ? apiKey : '••••••••••••••••••••••••'}
              </span>
              <button
                className={'hover:text-tertiary'}
                style={{
                  color: 'var(--md-sys-color-primary)',
                  transitionProperty:
                    'color, background-color, border-color, text-decoration-color, fill, stroke',
                  transitionDuration: '150ms',
                  transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                onClick={() => setShowKey((v) => !v)}
              >
                <span
                  style={{
                    fontFamily: 'Material Symbols outlined',
                    fontSize: '${textSizeToRem($1)}',
                    lineHeight: '${textSizeToLineHeight($1)}',
                  }}
                >
                  {showKey ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            <button
              className={'hover:bg-primary hover:text-white'}
              style={{
                padding: 'calc(4 * 0.25rem)',
                backgroundColor: 'var(--md-sys-color-surface-container-high)',
                borderRadius: '0.75rem',
                color: 'var(--md-sys-color-primary)',
                transitionProperty: 'all',
                transitionDuration: '150ms',
              }}
              onClick={handleCopyKey}
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
            </button>
          </div>
        </div>
        <div
          className={cm.sp('mt', 4)}
          style={{
            padding: 'calc(4 * 0.25rem)',
            borderTopWidth: '1px',
            borderColor: 'var(--md-sys-color-surface-container-high)',
          }}
          data-mol-id="api-access-rate-limit"
        >
          <div className={cm.cn(cm.flex({ justify: 'between', align: 'center' }), cm.sp('mb', 2))}>
            <span
              className={cm.fontWeight('bold')}
              style={{
                fontSize: '${textSizeToRem($1)}',
                lineHeight: '${textSizeToLineHeight($1)}',
                color: 'var(--md-sys-color-on-surface-variant)',
              }}
            >
              {t('api-access.rate-limit-label', {}, { defaultValue: 'Rate Limit' })}
            </span>
            <span
              className={cm.fontWeight('bold')}
              style={{
                fontSize: '${textSizeToRem($1)}',
                lineHeight: '${textSizeToLineHeight($1)}',
                color: 'var(--md-sys-color-on-surface)',
              }}
            >
              {t(
                'api-access.rate-limit-value',
                { used: rateLimitUsed.toLocaleString(), total: rateLimitTotal.toLocaleString() },
                { defaultValue: '{{used}} / {{total}} req/min' },
              )}
            </span>
          </div>
          <div
            className={cm.roundedFull}
            style={{
              width: '100%',
              height: 'calc(2 * 0.25rem)',
              backgroundColor: 'var(--md-sys-color-surface-container-high)',
              overflow: 'hidden',
            }}
          >
            <div
              className={'to-primary'}
              style={{
                height: '100%',
                width: `${rateLimitPercent}%`,
                backgroundImage:
                  'linear-gradient(to right, var(--md-sys-color-tertiary), var(--md-sys-color-primary))',
              }}
            ></div>
          </div>
          <a
            className={cm.cn(cm.flex({ align: 'center' }), cm.sp('mt', 6), cm.fontWeight('bold'))}
            style={{
              display: 'inline-flex',
              gap: 'calc(2 * 0.25rem)',
              fontSize: '${textSizeToRem($1)}',
              lineHeight: '${textSizeToLineHeight($1)}',
              color: 'var(--md-sys-color-primary)',
            }}
            href={docsUrl}
            data-mol-id="api-access-docs-link"
          >
            {t('api-access.read-documentation', {}, { defaultValue: 'Read Documentation' })}
            <span
              className={'group-hover:translate-x-1'}
              style={{
                fontFamily: 'Material Symbols outlined',
                fontSize: '${textSizeToRem($1)}',
                lineHeight: '${textSizeToLineHeight($1)}',
                transitionProperty: 'all',
                transitionDuration: '150ms',
              }}
            >
              arrow_forward
            </span>
          </a>
        </div>
      </div>
    </section>
  )
}

export { ApiAccessSection }
