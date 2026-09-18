import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
interface AccessSecuritySectionProps {
  allowedDomains: string
  rateLimitPerMinute: number
  requireAuth: boolean
  onRegenerateApiKey: () => void
  onChange: (field: string, value: string | number | boolean) => void
}

export default function AccessSecuritySection({
  allowedDomains,
  rateLimitPerMinute,
  requireAuth,
  onRegenerateApiKey,
  onChange,
}: AccessSecuritySectionProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <section style={{ rowGap: '6*0.25rem' }} data-mol-id="access-security-section">
      <h3
        className={cm.fontWeight('bold')}
        style={{
          fontFamily: 'var(--font-headline, sans-serif)',
          fontSize: '${textSizeToRem($1)}',
          lineHeight: '${textSizeToLineHeight($1)}',
          letterSpacing: "${1 === 'tighter' ? '-0.05em' : '-0.025em'}",
        }}
      >
        {t('access-security.heading', {}, { defaultValue: 'Access & Security' })}
      </h3>
      <div
        style={{
          backgroundColor: 'var(--md-sys-color-surface-container-lowest)',
          borderRadius: '3rem',
          padding: 'calc(8 * 0.25rem)',
          boxShadow: '0 2px 12px 0 rgb(0 0 0 / 0.08)',
          rowGap: '10*0.25rem',
        }}
        data-mol-id="access-security-card"
      >
        <div className={cm.grid({ cols: 2 })} style={{ gap: 'calc(10 * 0.25rem)' }}>
          <div style={{ rowGap: '1.5*0.25rem' }} data-mol-id="allowed-domains-field">
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
              {t('access-security.allowed-domains-label', {}, { defaultValue: 'Allowed Domains' })}
            </label>
            <input
              className={cm.cn(cm.fontWeight('medium'), 'focus:ring-2 focus:ring-surface-tint/15')}
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
              placeholder={t(
                'access-security.allowed-domains-placeholder',
                {},
                { defaultValue: 'example.com, app.example.com' },
              )}
              type="text"
              value={allowedDomains}
              onChange={(e) => onChange('allowedDomains', e.target.value)}
            />
          </div>
          <div style={{ rowGap: '1.5*0.25rem' }} data-mol-id="rate-limit-field">
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
                'access-security.rate-limit-label',
                {},
                { defaultValue: 'Rate Limiting (msgs/min)' },
              )}
            </label>
            <input
              className={cm.cn(cm.fontWeight('medium'), 'focus:ring-2 focus:ring-surface-tint/15')}
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
              type="number"
              value={rateLimitPerMinute}
              onChange={(e) => onChange('rateLimitPerMinute', Number(e.target.value))}
            />
          </div>
        </div>
        <div
          className={cm.flex({ align: 'center', justify: 'between' })}
          style={{
            padding: 'calc(8 * 0.25rem)',
            borderTopWidth: '1px',
            borderColor: 'var(--md-sys-color-surface-container-high)',
          }}
          data-mol-id="require-auth-toggle"
        >
          <div>
            <p
              className={cm.fontWeight('bold')}
              style={{ color: 'var(--md-sys-color-on-surface)' }}
            >
              {t(
                'access-security.require-auth-title',
                {},
                { defaultValue: 'Require Authentication' },
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
                'access-security.require-auth-description',
                {},
                { defaultValue: 'Users must be logged in to chat' },
              )}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={requireAuth}
            aria-label={t(
              'access-security.require-auth-title',
              {},
              { defaultValue: 'Require Authentication' },
            )}
            className={`w-12 h-6 ${requireAuth ? 'bg-tertiary' : 'bg-surface-container-highest'} rounded-full relative cursor-pointer`}
            onClick={() => onChange('requireAuth', !requireAuth)}
          >
            <span
              className={`absolute ${requireAuth ? 'right-1' : 'left-1'} top-1 w-4 h-4 bg-surface rounded-full`}
            ></span>
          </button>
        </div>
        <div style={{ rowGap: '3*0.25rem' }} data-mol-id="api-key-field">
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
            {t('access-security.api-key-label', {}, { defaultValue: 'API Key' })}
          </label>
          <div
            className={cm.flex({ align: 'center' })}
            style={{
              gap: 'calc(4 * 0.25rem)',
              backgroundColor: 'var(--md-sys-color-surface-container-high)',
              borderRadius: '2rem',
              padding: 'calc(5 * 0.25rem)',
            }}
          >
            <span
              className={cm.flex1}
              style={{
                color: 'var(--md-sys-color-on-surface-variant)',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                letterSpacing: 'widest',
              }}
            >
              {'••••••••••••••••••••••••••••'}
            </span>
            <button
              className={cm.cn(cm.fontWeight('bold'), 'hover:bg-surface-container-highest')}
              style={{
                paddingLeft: 'calc(5 * 0.25rem)',
                paddingRight: 'calc(5 * 0.25rem)',
                padding: 'calc(2 * 0.25rem)',
                color: 'var(--md-sys-color-primary)',
                fontSize: '${textSizeToRem($1)}',
                lineHeight: '${textSizeToLineHeight($1)}',
                borderRadius: '0.75rem',
                transitionProperty:
                  'color, background-color, border-color, text-decoration-color, fill, stroke',
                transitionDuration: '150ms',
                transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              onClick={onRegenerateApiKey}
            >
              {t('access-security.regenerate-button', {}, { defaultValue: 'Regenerate' })}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

export { AccessSecuritySection }
