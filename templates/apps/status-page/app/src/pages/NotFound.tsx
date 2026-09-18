import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

export function NotFound() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        cm.flex({ align: 'center', justify: 'center' }),
        'relative overflow-hidden font-body',
      )}
      style={{ backgroundColor: 'var(--mol-color-background)', color: 'var(--mol-color-text)' }}
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
        className={cm.cn('absolute inset-0 pointer-events-none')}
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 35%, rgba(16, 185, 129, 0.18), transparent 55%)',
        }}
        aria-hidden="true"
      />

      <div className={cm.cn(cm.maxW('lg'), cm.sp('px', 6), 'relative text-center')}>
        <p className={cm.cn('font-mono text-xs font-black uppercase tracking-widest text-primary')}>
          {t('notFound.eyebrow', { app: APP_NAME }, { defaultValue: '$ {{app}} whoami --route' })}
        </p>
        <h1
          className={cm.cn(
            'mt-2 text-[5rem] md:text-[6rem] font-extrabold tracking-tighter leading-none font-mono',
          )}
        >
          404
        </h1>
        <p className={cm.cn('mt-2 font-mono text-sm text-on-surface-variant')}>
          <span style={{ color: 'var(--color-status-major)' }}>err:</span>{' '}
          {t(
            'notFound.message',
            {},
            {
              defaultValue:
                'no route matches that path. it may have moved, been renamed, or never existed.',
            },
          )}
        </p>
        <pre
          className={cm.cn('mt-6 mx-auto max-w-md rounded-md p-4 font-mono text-[11px] text-left')}
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid var(--color-border-card)',
            color: 'var(--color-text-muted)',
          }}
        >
          {`$ ${APP_NAME.toLowerCase()} whoami --route
> path:    ${typeof window !== 'undefined' ? window.location.pathname : '/'}
> status:  not_found
> hint:    try /dashboard or /incidents`}
        </pre>
        <div className={cm.cn('mt-6 flex items-center justify-center gap-3')}>
          <Link
            to="/"
            className={cm.cn(
              'px-5 py-2.5 rounded-md font-mono text-xs font-bold uppercase tracking-widest hover:opacity-90',
            )}
            style={{
              backgroundColor: 'var(--color-status-operational)',
              color: 'var(--color-on-status-operational)',
              boxShadow: '0 12px 28px -12px rgba(16, 185, 129, 0.6)',
            }}
          >
            {t('notFound.home', { app: APP_NAME }, { defaultValue: '{{app}} status page' })}
          </Link>
          <Link
            to="/dashboard"
            className={cm.cn(
              'px-5 py-2.5 rounded-md font-mono text-xs font-bold uppercase tracking-widest',
            )}
            style={{
              backgroundColor: 'rgba(30, 41, 59, 0.6)',
              color: 'var(--color-chip-text)',
              border: '1px solid var(--color-border-card)',
            }}
          >
            {t('notFound.dashboard', {}, { defaultValue: 'Operator dashboard' })}
          </Link>
        </div>
      </div>
    </div>
  )
}
