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
        cm.sp('p', 8),
        'bg-gradient-to-br from-primary-container via-surface to-surface text-center',
      )}
    >
      <div
        className={cm.cn(cm.flex({ direction: 'col', align: 'center', gap: 'lg' }), cm.maxW('md'))}
      >
        <span
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(20),
            cm.h(20),
            cm.roundedFull,
            'bg-gradient-to-br from-primary to-tertiary text-on-primary shadow-lg shadow-primary/30',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined text-5xl')}
            style={{ fontVariationSettings: "'FILL' 1" }}
            aria-hidden="true"
          >
            restaurant_menu
          </span>
        </span>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary',
          )}
        >
          404
        </p>
        <h1 className={cm.cn(cm.textSize('5xl'), 'font-extrabold tracking-tight font-display')}>
          {t('notFound.heading', {}, { defaultValue: 'This table is not on the floor.' })}
        </h1>
        <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant')}>
          {t(
            'notFound.subheading',
            {},
            {
              defaultValue:
                'The page you were looking for has been seated elsewhere — or never existed.',
            },
          )}
        </p>
        <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
          <Link
            to="/dashboard"
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              'rounded-full bg-primary text-on-primary hover:bg-primary/90 transition-colors inline-flex items-center gap-2',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              dashboard
            </span>
            {t('auth.backToDashboard', {}, { defaultValue: 'Back to dashboard' })}
          </Link>
          <Link
            to="/"
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              'rounded-full border border-outline-variant hover:bg-surface-container-low transition-colors',
            )}
          >
            {t('notFound.toLanding', { app: APP_NAME }, { defaultValue: '{{app}} home' })}
          </Link>
        </div>
      </div>
    </div>
  )
}
