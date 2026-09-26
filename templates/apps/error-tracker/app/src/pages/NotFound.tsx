import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, BRAND_COLOR } from '../branding.js'

/**
 * Dark monospace 404 — DESIGN.md spec: "Same dark centered card as Login.
 * Heading mono '404' large with subtle hairline crack accent on the '0',
 * subtext 'This route did not throw — it never existed.'"
 *
 * Translated from api-documentation's Prism mono-JSON 404, recoloured to
 * Faultline emerald + a hairline crack pseudo-accent inside the zero.
 */
export function NotFound() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.sp('px', 6),
        'relative font-body overflow-hidden',
      )}
      style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }}
    >
      <div
        className={cm.cn('absolute inset-0 pointer-events-none')}
        style={{
          backgroundImage:
            'radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--color-primary) 10%, transparent), transparent 45%),' +
            'radial-gradient(circle at 70% 60%, color-mix(in srgb, var(--color-error) 8%, transparent), transparent 40%)',
        }}
        aria-hidden="true"
      />
      <div
        className={cm.cn('absolute inset-0 opacity-[0.06] pointer-events-none')}
        style={{
          backgroundImage:
            'linear-gradient(color-mix(in srgb, var(--color-on-background) 50%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--color-on-background) 50%, transparent) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
        aria-hidden="true"
      />

      <div className={cm.cn('relative z-10 text-center space-y-6 max-w-md')}>
        <p
          className={cm.cn('font-mono text-[11px] font-black uppercase tracking-widest')}
          style={{ color: BRAND_COLOR }}
        >
          {t(
            'notFound.eyebrow',
            { app: APP_NAME.toLowerCase() },
            { defaultValue: 'HTTP 404 · {{app}}' },
          )}
        </p>
        <h1
          className={cm.cn(
            'font-mono text-[7.5rem] md:text-[9rem] leading-none font-extrabold tracking-tighter relative inline-block',
          )}
          style={{ color: 'var(--color-text)' }}
          aria-label="404"
        >
          <span style={{ color: BRAND_COLOR }}>4</span>
          <span className={cm.cn('relative')}>
            0
            <span
              aria-hidden="true"
              className={cm.cn('absolute')}
              style={{
                top: '20%',
                left: '12%',
                right: '12%',
                bottom: '38%',
                border: `1px solid ${BRAND_COLOR}aa`,
                transform: 'rotate(-18deg)',
                pointerEvents: 'none',
                opacity: 0.65,
                backgroundImage: `linear-gradient(115deg, transparent 48%, ${BRAND_COLOR} 49%, ${BRAND_COLOR} 51%, transparent 52%)`,
              }}
            />
          </span>
          <span style={{ color: BRAND_COLOR }}>4</span>
        </h1>

        <pre
          className={cm.cn(
            'text-left text-sm font-mono leading-relaxed rounded-xl px-4 py-3 whitespace-pre-wrap break-words',
          )}
          style={{
            backgroundColor: 'var(--color-code-block)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-secondary)',
          }}
        >
          {`> GET ${typeof window !== 'undefined' ? window.location.pathname : '/missing'}
< 404 Not Found
{
  "error": "route_not_found",
  "message": "This route did not throw — it never existed."
}`}
        </pre>

        <p className={cm.cn('text-base')} style={{ color: 'var(--color-text-secondary)' }}>
          {t(
            'notFound.body',
            {},
            { defaultValue: 'Pick a path that exists. The dashboard is still live.' },
          )}
        </p>

        <div className={cm.cn('flex items-center justify-center gap-3 flex-wrap')}>
          <Link
            to="/dashboard"
            className={cm.cn(
              'inline-flex items-center gap-2 px-6 py-3 rounded-md font-mono text-sm font-bold uppercase tracking-widest transition-opacity hover:opacity-90',
            )}
            style={{
              backgroundColor: BRAND_COLOR,
              color: 'var(--color-on-primary)',
              boxShadow:
                '0 12px 28px -12px color-mix(in srgb, var(--color-primary) 60%, transparent)',
            }}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              arrow_back
            </span>
            {t('auth.backToDashboard', {}, { defaultValue: 'Back to dashboard' })}
          </Link>
          <Link
            to="/issues"
            className={cm.cn(
              'font-mono text-xs font-bold uppercase tracking-widest hover:underline',
            )}
            style={{ color: 'var(--color-text-code)' }}
          >
            {t('notFound.reportBug', {}, { defaultValue: 'Report a bug' })}
          </Link>
        </div>
      </div>
    </div>
  )
}
