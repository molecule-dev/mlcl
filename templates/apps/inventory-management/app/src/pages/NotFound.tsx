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
        cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 'md' }),
        cm.sp('p', 8),
        'min-h-[100dvh] bg-background',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
          cm.sp('p', 10),
          'max-w-lg text-center rounded-3xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm',
        )}
      >
        <span
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-secondary text-white text-2xl shadow-lg shadow-primary/30',
          )}
        >
          <span className="material-symbols-outlined" data-icon="explore_off">
            explore_off
          </span>
        </span>
        <p className={cm.cn('text-[11px] font-bold uppercase tracking-[0.22em] text-primary')}>
          {t('notFound.eyebrow', {}, { defaultValue: '404 · Off the floor map' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight')}>
          {t('notFound.title', {}, { defaultValue: 'That bin does not exist.' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'notFound.body',
            { app: APP_NAME },
            {
              defaultValue:
                "We couldn't find the page you were headed to. It may have been archived, the SKU could have moved, or the URL is just plain wrong.",
            },
          )}
        </p>
        <div className={cm.cn(cm.flex({ gap: 'sm' }), 'flex-wrap justify-center')}>
          <Link
            to="/dashboard"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 5),
              cm.h(11),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'rounded-xl bg-gradient-to-br from-primary to-primary-dark text-white shadow shadow-primary/30 hover:opacity-95',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-[18px]')}
              data-icon="space_dashboard"
            >
              space_dashboard
            </span>
            {t('auth.backToDashboard', {}, { defaultValue: 'Back to dashboard' })}
          </Link>
          <Link
            to="/inventory"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 5),
              cm.h(11),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-xl border border-outline-variant text-on-surface hover:bg-background-secondary',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[18px]')} data-icon="search">
              search
            </span>
            {t('notFound.search', {}, { defaultValue: 'Search inventory' })}
          </Link>
        </div>
      </div>
    </div>
  )
}

export default NotFound
