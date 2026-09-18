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
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        'min-h-screen text-white relative overflow-hidden',
      )}
      style={{
        backgroundImage:
          'radial-gradient(circle at 50% 0%, var(--color-primary) 0%, var(--color-primary-dark) 40%, var(--color-sidebar) 100%)',
      }}
    >
      <div
        aria-hidden="true"
        className={cm.cn(
          'pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-surface/10 blur-3xl',
        )}
      />
      <div
        aria-hidden="true"
        className={cm.cn(
          'pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-secondary/30 blur-3xl',
        )}
      />

      <div className={cm.cn(cm.stack(6), cm.sp('px', 6), 'relative text-center max-w-xl')}>
        <span
          className={cm.cn(
            'inline-flex h-16 w-16 rounded-2xl bg-surface/15 backdrop-blur-md mx-auto',
            cm.flex({ align: 'center', justify: 'center' }),
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-3xl')} data-icon="package_2">
            package_2
          </span>
        </span>
        <p className={cm.cn('text-[11px] font-bold uppercase tracking-[0.32em] text-white/60')}>
          {t('notFound.eyebrow', {}, { defaultValue: 'Lost in the warehouse' })}
        </p>
        <h1 className={cm.cn('text-7xl md:text-8xl font-extrabold tracking-tighter tabular-nums')}>
          404
        </h1>
        <p className={cm.cn(cm.textSize('lg'), 'text-white/80')}>
          {t(
            'notFound.body',
            {},
            {
              defaultValue:
                'No bin matches that route. The page might have shipped, been cancelled, or been put away in the wrong aisle.',
            },
          )}
        </p>
        <div
          className={cm.cn(cm.flex({ align: 'center', justify: 'center', gap: 'sm' }), 'flex-wrap')}
        >
          <Link
            to="/dashboard"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 6),
              cm.h(12),
              cm.fontWeight('bold'),
              'rounded-xl bg-secondary text-on-secondary shadow-lg shadow-secondary/30 hover:opacity-95 transition-all uppercase tracking-wider text-sm',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-[18px]')}
              data-icon="space_dashboard"
            >
              space_dashboard
            </span>
            {t('notFound.dashboard', {}, { defaultValue: 'Go to dashboard' })}
          </Link>
          <Link
            to="/"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 6),
              cm.h(12),
              cm.fontWeight('semibold'),
              'rounded-xl border border-surface/30 text-white hover:bg-surface/5 transition-colors uppercase tracking-wider text-sm',
            )}
          >
            {t('notFound.home', { app: APP_NAME }, { defaultValue: '{{app}} home' })}
          </Link>
        </div>
      </div>
    </div>
  )
}

export default NotFound
