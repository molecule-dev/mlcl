import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, BRAND_COLOR, SURFACE_DARK, SURFACE_PANEL } from '../branding.js'

const PANEL_BORDER = 'var(--color-border)'

/**
 * Pylon-flavoured 404 page — terminal-aesthetic dark surface with a
 * fake "request log" trace showing the missing route as a 404
 * response. CTA returns the user to the workspace.
 */
export function NotFound() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const path = typeof window !== 'undefined' ? window.location.pathname : '/'

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.minH('screen'),
        'antialiased font-body p-6 relative overflow-hidden',
      )}
      style={{ backgroundColor: SURFACE_DARK, color: 'var(--color-text-primary)' }}
    >
      <div
        className={cm.cn('absolute inset-0 -z-10 pointer-events-none')}
        style={{
          backgroundImage:
            'linear-gradient(color-mix(in srgb, var(--color-text) 3.5%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--color-text) 3.5%, transparent) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
        aria-hidden="true"
      />
      <div
        className={cm.cn(
          'absolute -z-10 top-1/3 left-1/2 -translate-x-1/2 w-[40rem] h-[40rem] rounded-full pointer-events-none',
        )}
        style={{ background: BRAND_COLOR, filter: 'blur(140px)', opacity: 0.1 }}
        aria-hidden="true"
      />

      <div className={cm.cn(cm.w('full'), cm.maxW('lg'), 'text-center')}>
        <p
          className={cm.cn('font-mono text-xs font-bold uppercase tracking-widest mb-3')}
          style={{ color: 'var(--color-error)' }}
        >
          {t('notFound.eyebrow', {}, { defaultValue: '$ pylon resolve --strict' })}
        </p>
        <h1
          className={cm.cn('text-7xl md:text-8xl font-extrabold tracking-tighter mb-4')}
          style={{ color: 'var(--color-text)' }}
        >
          404
        </h1>
        <p
          className={cm.cn('text-xl font-bold tracking-tight mb-2')}
          style={{ color: 'var(--color-text)' }}
        >
          {t('notFound.title', {}, { defaultValue: 'Route not found' })}
        </p>
        <p className={cm.cn('text-sm mb-6')} style={{ color: 'var(--color-text-secondary)' }}>
          {t(
            'notFound.body',
            { app: APP_NAME },
            {
              defaultValue:
                '{{app}} fired a request for this URL and got nothing back. Double-check the route or hop back to the workspace.',
            },
          )}
        </p>

        <pre
          className={cm.cn(
            'text-left font-mono text-[12px] p-4 rounded-xl m-0 mb-6 overflow-x-auto',
          )}
          style={{
            backgroundColor: SURFACE_PANEL,
            border: `1px solid ${PANEL_BORDER}`,
            color: 'var(--color-text-secondary)',
          }}
        >
          {[
            `→ GET ${path}`,
            '← 404 Not Found · 4ms',
            `← X-${APP_NAME}-Trace: 'no matching route'`,
          ].join('\n')}
        </pre>

        <div className={cm.flex({ align: 'center', justify: 'center', gap: 'md', wrap: 'wrap' })}>
          <Link
            to="/workspace"
            className={cm.cn(
              'inline-flex items-center gap-2 px-6 py-3 font-mono font-semibold rounded-md transition-all hover:opacity-90 shadow-xl',
            )}
            style={{
              backgroundColor: 'var(--color-primary)',
              color: 'var(--color-on-primary)',
              boxShadow:
                '0 12px 32px -10px color-mix(in srgb, var(--color-primary) 45%, transparent)',
            }}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              terminal
            </span>
            {t('notFound.backToWorkspace', {}, { defaultValue: 'Back to workspace' })}
          </Link>
          <Link
            to="/"
            className={cm.cn(
              'inline-flex items-center gap-2 px-6 py-3 font-mono font-semibold rounded-md border transition-colors hover:bg-surface/5',
            )}
            style={{
              borderColor: 'color-mix(in srgb, var(--color-text) 18%, transparent)',
              color: 'var(--color-text)',
            }}
          >
            {t('auth.backToLanding', {}, { defaultValue: 'Back to landing' })}
          </Link>
        </div>
      </div>
    </div>
  )
}
