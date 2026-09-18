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
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.sp('p', 6),
        'bg-surface-container-low text-on-surface relative overflow-hidden',
      )}
    >
      <div
        className={cm.cn(
          cm.maxW('lg'),
          cm.flex({ direction: 'col', align: 'center', gap: 'lg', justify: 'center' }),
          cm.textCenter,
          cm.sp('p', 10),
          'rounded-[2rem] bg-surface-container-lowest border border-outline-variant/30 shadow-sm',
        )}
      >
        <span
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-lg',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined text-4xl')}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            inventory_2
          </span>
        </span>
        <span className={cm.cn('text-xs font-bold uppercase tracking-widest text-primary')}>
          {t('notFound.eyebrow', {}, { defaultValue: 'Empty box' })}
        </span>
        <h1
          className={cm.cn('text-5xl md:text-6xl font-extrabold tracking-tighter text-on-surface')}
        >
          404
        </h1>
        <h2 className={cm.cn('text-2xl md:text-3xl font-extrabold tracking-tight text-on-surface')}>
          {t('notFound.heading', {}, { defaultValue: 'This shelf is bare' })}
        </h2>
        <p className={cm.cn('text-base text-on-surface-variant max-w-md')}>
          {t(
            'notFound.body',
            { app: APP_NAME },
            {
              defaultValue:
                'We could not find that page in the {{app}} archive. It may have been retired or simply mistyped.',
            },
          )}
        </p>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}>
          <Link
            to="/"
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.roundedFull,
              'text-sm bg-primary text-on-primary hover:bg-primary-hover hover:shadow-lg transition-all',
            )}
          >
            {t('auth.backToLanding', {}, { defaultValue: 'Back to landing' })}
          </Link>
          <Link
            to="/dashboard"
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.roundedFull,
              'text-sm border-2 border-on-surface text-on-surface hover:bg-on-surface hover:text-surface transition-all',
            )}
          >
            {t('notFound.cta.dashboard', {}, { defaultValue: 'Go to dashboard' })}
          </Link>
        </div>
      </div>
      {/* Decorative orbs */}
      <div
        className={cm.cn(
          'absolute -left-32 -top-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl pointer-events-none',
        )}
      />
      <div
        className={cm.cn(
          'absolute -right-24 -bottom-24 w-80 h-80 rounded-full bg-success/15 blur-3xl pointer-events-none',
        )}
      />
    </div>
  )
}

export default NotFound
