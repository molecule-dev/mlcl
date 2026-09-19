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
        'bg-background text-on-surface text-center',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          'w-20 h-20 rounded-full bg-primary-container mb-6',
        )}
      >
        <span
          aria-hidden="true"
          className={cm.cn('material-symbols-outlined text-4xl text-primary')}
        >
          ramen_dining
        </span>
      </div>
      <p
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          'uppercase tracking-widest text-primary mb-2',
        )}
      >
        404
      </p>
      <h1 className={cm.cn(cm.fontWeight('bold'), 'text-3xl md:text-4xl tracking-tight mb-3')}>
        {t('simmer.notFound.heading', {}, { defaultValue: 'This shelf is bare' })}
      </h1>
      <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant max-w-md mb-8')}>
        {t(
          'simmer.notFound.body',
          { app: APP_NAME },
          {
            defaultValue:
              "We couldn't find the page you were looking for. Try heading back to your week.",
          },
        )}
      </p>
      <div className={cm.cn(cm.flex({ gap: 'sm' }))}>
        <Link
          to="/plan"
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-full hover:bg-primary-light transition-colors shadow-sm',
          )}
        >
          {t('simmer.notFound.planCta', {}, { defaultValue: 'Go to your plan' })}
        </Link>
        <Link
          to="/"
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.fontWeight('semibold'),
            'rounded-full text-on-surface bg-surface border border-outline hover:bg-surface-variant transition-colors',
          )}
        >
          {t('auth.backToHome', {}, { defaultValue: 'Back to home' })}
        </Link>
      </div>
    </div>
  )
}
