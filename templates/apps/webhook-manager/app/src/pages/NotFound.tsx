import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, BRAND_COLOR } from '../branding.js'

const DECORATIVE_LINES = [
  '{ "request": {',
  '  "method": "GET",',
  '  "url": "/your-page",',
  '  "headers": { ... },',
  '  "body": null',
  '},',
  '"response": {',
  '  "status": 404,',
  '  "duration_ms": 12,',
  '  "delivered": false',
  '} }',
]

export function NotFound() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      className={cm.cn(cm.minH('screen'), 'antialiased font-body relative overflow-hidden')}
      style={{ backgroundColor: 'var(--mol-color-background)', color: 'var(--mol-color-text)' }}
    >
      <div
        className={cm.cn('absolute inset-0 -z-10 pointer-events-none')}
        style={{
          backgroundImage:
            'linear-gradient(color-mix(in srgb, var(--mol-color-text) 4%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--mol-color-text) 4%, transparent) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
        aria-hidden="true"
      />
      <pre
        className={cm.cn(
          'absolute top-12 right-12 font-mono text-xs opacity-15 pointer-events-none whitespace-pre select-none m-0 hidden lg:block',
        )}
        style={{ color: 'var(--mol-color-primary)' }}
        aria-hidden="true"
      >
        {DECORATIVE_LINES.join('\n')}
      </pre>

      <nav
        className={cm.cn('sticky top-0 z-50 backdrop-blur-md border-b')}
        style={{
          backgroundColor: 'color-mix(in srgb, var(--mol-color-background) 85%, transparent)',
          borderColor: 'var(--mol-color-border)',
        }}
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.sp('px', 6),
            cm.sp('py', 4),
            cm.flex({ align: 'center', justify: 'between' }),
            cm.mxAuto,
          )}
        >
          <Link
            to="/"
            className={cm.cn('flex items-center gap-2 text-xl font-extrabold tracking-tight')}
            style={{ color: 'var(--mol-color-text)' }}
          >
            <span
              className={cm.cn('inline-flex h-8 w-8 items-center justify-center rounded-lg')}
              style={{ backgroundColor: BRAND_COLOR, color: 'var(--color-on-primary)' }}
              aria-hidden="true"
            >
              <span className={cm.cn('material-symbols-outlined text-[20px]')}>cloud_sync</span>
            </span>
            <span>
              {APP_NAME}
              <span style={{ color: BRAND_COLOR }}>.</span>
            </span>
          </Link>
          <Link
            to="/login"
            className={cm.cn('text-sm font-medium')}
            style={{ color: 'var(--mol-color-text-secondary)' }}
          >
            {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </Link>
        </div>
      </nav>

      <main
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center', direction: 'col' }),
          cm.sp('px', 6),
          'min-h-[calc(100vh-72px)]',
        )}
      >
        <p
          className={cm.cn('font-mono text-xs font-bold uppercase tracking-widest mb-3')}
          style={{ color: BRAND_COLOR }}
        >
          {t(
            'notFound.eyebrow',
            { app: APP_NAME.toLowerCase() },
            { defaultValue: '$ {{app}} log --status 404' },
          )}
        </p>
        <p
          className={cm.cn(
            'font-mono font-extrabold tracking-tighter text-7xl md:text-9xl leading-none',
          )}
          style={{ color: BRAND_COLOR, textShadow: '0 0 40px rgba(16, 185, 129, 0.45)' }}
        >
          404
        </p>
        <h1
          className={cm.cn(
            'mt-6 max-w-xl text-center text-2xl md:text-3xl font-extrabold tracking-tight',
          )}
          style={{ color: 'var(--mol-color-text)' }}
        >
          {t('notFound.heading', {}, { defaultValue: 'This payload never reached its endpoint.' })}
        </h1>
        <p
          className={cm.cn('mt-3 max-w-lg text-center text-sm')}
          style={{ color: 'var(--mol-color-text-secondary)' }}
        >
          {t(
            'notFound.body',
            { app: APP_NAME },
            {
              defaultValue:
                'The route you tried to deliver to does not exist on this {{app}} instance. Check the URL, or head back to the dashboard.',
            },
          )}
        </p>

        <div
          className={cm.cn(
            'mt-6 inline-flex items-center gap-3 rounded-md px-4 py-2 font-mono text-[12px]',
          )}
          style={{
            backgroundColor: 'var(--mol-color-surface)',
            border: '1px solid var(--mol-color-border)',
            color: 'var(--mol-color-text-secondary)',
          }}
        >
          <span
            className={cm.cn('px-1.5 py-0.5 rounded font-extrabold')}
            style={{
              backgroundColor: 'color-mix(in srgb, var(--mol-color-success) 15%, transparent)',
              color: 'var(--mol-color-success)',
            }}
          >
            GET
          </span>
          <span className={cm.cn('truncate')} style={{ color: 'var(--mol-color-text-secondary)' }}>
            {`https://${APP_NAME.toLowerCase()}.dev/your-page`}
          </span>
          <span
            className={cm.cn('px-1.5 py-0.5 rounded font-extrabold')}
            style={{
              backgroundColor: 'color-mix(in srgb, var(--mol-color-warning) 15%, transparent)',
              color: 'var(--mol-color-warning)',
            }}
          >
            404
          </span>
          <span style={{ color: 'var(--mol-color-text-tertiary)' }}>· 12ms</span>
        </div>

        <div className={cm.cn('mt-10 flex items-center gap-3 flex-wrap justify-center')}>
          <Link
            to="/dashboard"
            className={cm.cn(
              'inline-flex items-center gap-2 px-6 py-3 font-mono font-semibold rounded-md transition-all hover:opacity-90 shadow-xl',
            )}
            style={{
              backgroundColor: BRAND_COLOR,
              color: 'var(--color-on-primary)',
              boxShadow:
                '0 12px 32px -10px color-mix(in srgb, var(--mol-color-primary) 45%, transparent)',
            }}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              space_dashboard
            </span>
            {t('auth.backToDashboard', {}, { defaultValue: 'Back to dashboard' })}
          </Link>
          <Link
            to="/"
            className={cm.cn(
              'inline-flex items-center gap-2 px-6 py-3 font-mono font-semibold rounded-md border transition-colors hover:bg-surface/5',
            )}
            style={{
              borderColor: 'var(--mol-color-border)',
              color: 'var(--mol-color-text)',
            }}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              monitoring
            </span>
            {t('notFound.statusCta', {}, { defaultValue: 'View status page' })}
          </Link>
        </div>
      </main>
    </div>
  )
}
