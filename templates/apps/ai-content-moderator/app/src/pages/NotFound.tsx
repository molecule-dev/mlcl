import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export function NotFound() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        'bg-background text-on-surface px-6 py-12 text-center',
      )}
    >
      <span
        aria-hidden="true"
        className={cm.cn(
          'material-symbols-outlined text-[48px] text-primary bg-primary/10 p-5 rounded-full mb-6',
        )}
      >
        explore_off
      </span>
      <p className={cm.cn('text-xs uppercase tracking-widest font-bold text-primary')}>404</p>
      <h1
        className={cm.cn(
          'mt-2 text-4xl font-bold tracking-tight font-headline text-on-surface max-w-lg',
        )}
      >
        {t('notFound.heading', {}, { defaultValue: 'We can’t find that page.' })}
      </h1>
      <p className={cm.cn('mt-4 text-on-surface-variant max-w-md')}>
        {t(
          'notFound.body',
          {},
          {
            defaultValue:
              'The link may have been moved, deleted, or simply mistyped. Try one of these instead:',
          },
        )}
      </p>
      <div
        className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), 'gap-3 mt-8 flex-wrap')}
      >
        <Link
          to="/dashboard"
          className={cm.cn(
            'bg-gradient-to-br from-primary to-primary-container text-white font-bold text-sm uppercase tracking-wide px-5 py-3 rounded-lg hover:shadow-md transition-shadow',
          )}
        >
          {t('notFound.goDashboard', {}, { defaultValue: 'Open dashboard' })}
        </Link>
        <Link
          to="/queue"
          className={cm.cn(
            'border border-outline-variant text-on-surface font-bold text-sm uppercase tracking-wide px-5 py-3 rounded-lg hover:bg-surface-container-low transition-colors',
          )}
        >
          {t('notFound.goQueue', {}, { defaultValue: 'Open queue' })}
        </Link>
        <Link to="/" className={cm.cn('text-sm text-primary font-semibold hover:underline')}>
          {t('auth.backToLanding', {}, { defaultValue: 'Back to landing' })}
        </Link>
      </div>
    </div>
  )
}

export default NotFound
