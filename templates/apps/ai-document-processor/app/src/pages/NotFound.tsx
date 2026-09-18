import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, BRAND_GRADIENT } from '../branding.js'

export function NotFound() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.sp('p', 8),
        'bg-background text-center',
      )}
    >
      <div
        className={cm.cn(
          cm.w(16),
          cm.h(16),
          cm.flex({ align: 'center', justify: 'center' }),
          'rounded-full text-white shadow-lg shadow-primary/30',
        )}
        style={{ background: BRAND_GRADIENT }}
      >
        <span
          className={cm.cn('material-symbols-outlined')}
          style={{ fontSize: 36 }}
          aria-hidden="true"
        >
          find_in_page
        </span>
      </div>
      <p
        className={cm.cn(
          cm.textSize('xs'),
          cm.sp('mt', 6),
          'uppercase tracking-widest text-on-surface-variant font-bold',
        )}
        style={{ fontSize: 10 }}
      >
        {t('notFound.eyebrow', { app: APP_NAME }, { defaultValue: '{{app}} · 404' })}
      </p>
      <h1
        className={cm.cn(
          cm.textSize('4xl'),
          cm.sp('mt', 2),
          cm.sp('mb', 3),
          'font-extrabold tracking-tight',
        )}
      >
        {t('notFound.title', {}, { defaultValue: 'That page is not on file' })}
      </h1>
      <p className={cm.cn(cm.textSize('base'), cm.sp('mb', 8), 'text-on-surface-variant max-w-md')}>
        {t(
          'notFound.body',
          {},
          {
            defaultValue:
              'The document or route you tried to open is no longer here. Head back to the dashboard or pick a section from the sidebar.',
          },
        )}
      </p>
      <div className={cm.flex({ gap: 'md' })}>
        <Link
          to="/dashboard"
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.fontWeight('semibold'),
            'rounded-full text-white hover:opacity-90 transition-opacity',
          )}
          style={{ background: BRAND_GRADIENT }}
        >
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
          {t('notFound.home', {}, { defaultValue: 'Open landing page' })}
        </Link>
      </div>
    </div>
  )
}
