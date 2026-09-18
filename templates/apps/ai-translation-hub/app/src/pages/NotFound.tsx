import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

export function NotFound() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.sp('p', 8),
        'bg-surface text-on-surface relative overflow-hidden text-center',
      )}
    >
      <div
        aria-hidden="true"
        className={cm.cn(
          'absolute -top-40 -left-40 w-[640px] h-[640px] bg-gradient-to-br from-primary/15 to-tertiary/10 rounded-full blur-[120px] pointer-events-none',
        )}
      />
      <div
        aria-hidden="true"
        className={cm.cn(
          'absolute -bottom-40 -right-40 w-[480px] h-[480px] bg-gradient-to-tr from-tertiary/10 to-primary/10 rounded-full blur-[120px] pointer-events-none',
        )}
      />

      <div className={cm.cn('relative z-10 max-w-2xl')}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.sp('mb', 4),
            'font-bold uppercase tracking-widest text-primary',
          )}
        >
          {t('notFound.eyebrow', {}, { defaultValue: '404 · Lost in translation' })}
        </p>
        <h1
          className={cm.cn(
            'text-6xl md:text-7xl font-extrabold tracking-tighter leading-[0.95] bg-gradient-to-r from-primary via-primary-container to-tertiary bg-clip-text text-transparent',
          )}
        >
          {t('notFound.title', {}, { defaultValue: 'This page has no translation.' })}
        </h1>
        <p
          className={cm.cn(
            cm.textSize('lg'),
            cm.sp('mt', 6),
            'text-on-surface-variant max-w-xl mx-auto leading-relaxed',
          )}
        >
          {t(
            'notFound.body',
            { app: APP_NAME, tagline: APP_TAGLINE },
            {
              defaultValue:
                'We searched every locale tree but couldn’t find that one. Head back to the dashboard or kick off a new project.',
            },
          )}
        </p>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 'md', wrap: 'wrap' }),
            cm.sp('mt', 10),
          )}
        >
          <Link
            to="/dashboard"
            className={cm.cn(
              cm.sp('px', 8),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-full inline-flex items-center gap-2 text-on-primary bg-gradient-to-br from-primary to-primary-container hover:opacity-90 transition-opacity shadow-lg shadow-primary/20',
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
              cm.sp('px', 8),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-full border border-outline-variant/40 hover:bg-surface-container-low transition-colors',
            )}
          >
            {t('notFound.home', {}, { defaultValue: 'Visit landing' })}
          </Link>
        </div>
      </div>
    </div>
  )
}

export default NotFound
export { NotFound as NotFoundPage }
