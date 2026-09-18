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
        'bg-background bg-quote-pattern text-on-background',
      )}
    >
      <div
        className={cm.cn(
          cm.maxW('lg'),
          cm.textCenter,
          cm.stack(6),
          cm.sp('p', 10),
          'rounded-2xl bg-surface border border-outline-variant shadow-sm',
        )}
      >
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('notFound.eyebrow', {}, { defaultValue: 'A blank page' })}
        </p>
        <h1 className={cm.cn('text-7xl font-extrabold tracking-tighter font-serif text-primary')}>
          404
        </h1>
        <h2 className={cm.cn('text-2xl font-extrabold tracking-tight font-serif text-on-surface')}>
          {t('notFound.title', {}, { defaultValue: 'This chapter has not been written yet.' })}
        </h2>
        <p className={cm.cn(cm.textMuted, 'leading-relaxed font-serif italic')}>
          {t(
            'notFound.body',
            { app: APP_NAME },
            {
              defaultValue:
                'The link you followed may be moved, retired, or simply imagined. Let us return to {{app}} and find something worth reading.',
            },
          )}
        </p>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 'sm', wrap: 'wrap' }),
          )}
        >
          <Link
            to="/"
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              'rounded-full bg-primary text-white hover:bg-primary-dark transition-colors shadow-sm',
            )}
          >
            {t('auth.backToHome', {}, { defaultValue: 'Back to home' })}
          </Link>
          <Link
            to="/dashboard"
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              'rounded-full border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-colors',
            )}
          >
            {t('notFound.goDashboard', {}, { defaultValue: 'Open dashboard' })}
          </Link>
        </div>
      </div>
    </div>
  )
}

export default NotFound
export { NotFound as NotFoundPage }
