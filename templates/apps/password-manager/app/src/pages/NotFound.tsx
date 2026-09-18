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
        cm.flex({ align: 'center', justify: 'center' }),
        cm.sp('p', 6),
        cm.minH('screen'),
        'bg-surface-container-low/40 font-body text-on-surface',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', gap: 'lg' }),
          cm.sp('p', 10),
          cm.maxW('lg'),
          cm.textCenter,
          'bg-surface rounded-3xl shadow-lg shadow-primary-light/40 border border-primary-light/30 relative overflow-hidden',
        )}
      >
        <div
          className={cm.cn(
            'relative z-10',
            cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
          )}
        >
          <span
            className={cm.cn(cm.textSize('4xl'), 'material-symbols-outlined text-primary')}
            style={{ fontVariationSettings: "'FILL' 1" }}
            aria-hidden="true"
          >
            travel_explore
          </span>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              'uppercase tracking-widest text-primary-dark',
            )}
          >
            404 · {t('notFound.eyebrow', {}, { defaultValue: 'Lost in the vault' })}
          </span>
          <h1
            className={cm.cn(
              cm.textSize('3xl'),
              cm.fontWeight('bold'),
              'tracking-tight text-on-surface',
            )}
          >
            {t('notFound.heading', {}, { defaultValue: 'That entry is sealed shut.' })}
          </h1>
          <p
            className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-md leading-relaxed')}
          >
            {t(
              'notFound.body',
              { appName: APP_NAME },
              {
                defaultValue:
                  '{{appName}} could not find that page. It may have been moved, purged, or never existed in this vault.',
              },
            )}
          </p>
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            'relative z-10 flex-wrap justify-center',
          )}
        >
          <Link
            to="/"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 5),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-lg py-2 bg-primary text-white hover:bg-primary-hover transition-colors',
            )}
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              home
            </span>
            {t('auth.backToLanding', {}, { defaultValue: 'Back to landing' })}
          </Link>
          <Link
            to="/vault"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 5),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-lg py-2 bg-surface border border-primary-light/40 text-primary hover:bg-primary-light transition-colors',
            )}
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              inventory_2
            </span>
            {t('notFound.vault', {}, { defaultValue: 'Open vault' })}
          </Link>
        </div>
        <div
          className={cm.cn(
            'absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-emerald-300/20 blur-3xl',
          )}
          aria-hidden="true"
        />
        <div
          className={cm.cn(
            'absolute -left-10 -top-10 w-40 h-40 rounded-full bg-primary/10 blur-2xl',
          )}
          aria-hidden="true"
        />
      </div>
    </div>
  )
}

export default NotFound
