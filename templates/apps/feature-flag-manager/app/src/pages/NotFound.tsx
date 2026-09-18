import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * 404 — terminal-aesthetic dark NotFound, brand-consistent with the
 * Pennant control-panel mood (mono caret + emerald CTA + grid texture).
 * Translated from api-documentation's dark monospace 404 pattern per
 * the polish manual's dev-tools guidance.
 */

export function NotFound() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        'relative flex items-center justify-center antialiased font-body overflow-hidden px-6',
      )}
      style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text-code)' }}
      data-mol-id="page-not-found"
    >
      <div
        className={cm.cn('absolute inset-0 opacity-[0.07] pointer-events-none')}
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
        aria-hidden="true"
      />
      <div
        className={cm.cn(
          'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60rem] h-[60rem] rounded-full pointer-events-none',
        )}
        style={{ background: 'var(--color-primary)', filter: 'blur(180px)', opacity: 0.1 }}
        aria-hidden="true"
      />

      <div className={cm.cn('relative z-10 max-w-lg text-center')}>
        <p
          className={cm.cn('font-mono text-sm font-bold uppercase tracking-widest mb-3')}
          style={{ color: 'var(--color-text-link)' }}
        >
          {t(
            'notFound.kicker',
            { appName: APP_NAME },
            { defaultValue: '$ {{appName}} lookup --route' },
          )}
        </p>
        <p
          className={cm.cn('font-mono text-7xl md:text-8xl font-extrabold tracking-tighter mb-2')}
          style={{ color: 'var(--color-primary-hover)' }}
        >
          404
        </p>
        <h1 className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-3')}>
          {t('notFound.heading', {}, { defaultValue: 'Flag not found' })}
        </h1>
        <p className={cm.cn('text-base text-white/70 mb-8')}>
          {t(
            'notFound.body',
            { app: APP_NAME },
            {
              defaultValue:
                'The route you requested doesn\u2019t exist in {{app}}. The flag may have been archived, renamed, or never deployed in this environment.',
            },
          )}
        </p>
        <div className={cm.flex({ align: 'center', justify: 'center', gap: 'sm', wrap: 'wrap' })}>
          <Link
            to="/dashboard"
            className={cm.cn(
              'inline-flex items-center gap-2 px-6 py-3 font-mono font-semibold rounded-md transition-all hover:opacity-90',
            )}
            style={{
              backgroundColor: 'var(--color-primary)',
              color: 'var(--color-on-primary-cta)',
              boxShadow: '0 12px 32px -10px rgba(16, 185, 129, 0.45)',
            }}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              dashboard
            </span>
            {t('auth.backToDashboard', {}, { defaultValue: 'Back to dashboard' })}
          </Link>
          <Link
            to="/flags"
            className={cm.cn(
              'inline-flex items-center px-6 py-3 font-mono font-semibold rounded-md border transition-colors hover:bg-surface/5',
            )}
            style={{ borderColor: 'rgba(255,255,255,0.18)' }}
          >
            {t('notFound.flags', {}, { defaultValue: 'View all flags' })}
          </Link>
        </div>
      </div>
    </div>
  )
}
