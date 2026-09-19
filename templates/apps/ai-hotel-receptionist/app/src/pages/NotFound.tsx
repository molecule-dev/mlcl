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
        'bg-background text-on-surface flex items-center justify-center',
      )}
    >
      <div className={cm.cn(cm.textCenter, cm.sp('p', 8))}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-[0.3em] text-primary',
          )}
        >
          {t('notFound.eyebrow', {}, { defaultValue: '404' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'), cm.sp('mt', 2))}>
          {t('notFound.heading', {}, { defaultValue: 'This line is not connected' })}
        </h1>
        <p className={cm.cn(cm.sp('mt', 3), 'text-on-surface-variant')}>
          {t(
            'notFound.subheading',
            {},
            { defaultValue: 'The page you are looking for does not exist or has moved.' },
          )}
        </p>
        <Link
          to="/dashboard"
          data-mol-id="not-found-home-link"
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            'inline-block rounded-xl bg-primary text-on-primary hover:bg-primary-container transition-colors shadow-lg',
            cm.sp('mt', 6),
          )}
        >
          {t('notFound.backToDashboard', {}, { defaultValue: 'Back to the dashboard' })}
        </Link>
      </div>
    </div>
  )
}
