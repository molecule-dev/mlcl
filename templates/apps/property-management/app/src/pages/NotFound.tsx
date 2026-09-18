import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export function NotFound() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.minH('screen'),
        cm.sp('p', 8),
        'bg-background text-on-surface',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
          cm.w(20),
          cm.h(20),
          cm.roundedFull,
          cm.sp('mb', 6),
          'bg-primary/10 text-primary',
        )}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '40px' }} aria-hidden="true">
          door_open
        </span>
      </div>
      <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
        {t('notFound.title', {}, { defaultValue: 'That door doesn\u2019t open' })}
      </h1>
      <p
        className={cm.cn(
          cm.textSize('base'),
          cm.sp('mt', 3),
          'text-on-surface-variant max-w-md text-center',
        )}
      >
        {t(
          'notFound.body',
          {},
          {
            defaultValue:
              'The page you were looking for has been moved, archived, or never existed.',
          },
        )}
      </p>
      <Link
        to="/dashboard"
        className={cm.cn(
          cm.sp('px', 6),
          cm.sp('py', 3),
          cm.sp('mt', 8),
          cm.fontWeight('semibold'),
          cm.flex({ align: 'center', gap: 'xs' }),
          'rounded-full bg-primary text-on-primary hover:bg-primary/90 transition-colors',
        )}
      >
        <span className={'material-symbols-outlined text-base'} aria-hidden="true">
          home
        </span>
        {t('auth.backToDashboard', {}, { defaultValue: 'Back to dashboard' })}
      </Link>
    </div>
  )
}
