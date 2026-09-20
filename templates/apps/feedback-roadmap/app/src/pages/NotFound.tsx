/**
 * NotFound — catch-all 404 / dead link page.
 */
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
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.minH('screen'),
        cm.sp('px', 6),
        cm.sp('py', 12),
        'bg-background text-center',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
          cm.sp('p', 10),
          'relative max-w-xl rounded-[2rem] overflow-hidden bg-gradient-to-br from-primary to-primary-container text-white',
        )}
      >
        <div
          className={cm.cn(
            cm.w(60),
            cm.h(60),
            cm.roundedFull,
            'absolute -right-20 -bottom-20 bg-surface/10 blur-3xl',
          )}
          aria-hidden="true"
        />
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[11px] uppercase tracking-widest text-primary-fixed/80 relative z-10',
          )}
        >
          {t('notFound.eyebrow', {}, { defaultValue: '404' })}
        </span>
        <h1
          className={cm.cn(
            cm.fontWeight('bold'),
            'relative z-10 text-5xl font-extrabold tracking-tight',
          )}
        >
          {t('notFound.title', {}, { defaultValue: 'This page went off the roadmap.' })}
        </h1>
        <p
          className={cm.cn(
            cm.textSize('base'),
            'relative z-10 leading-relaxed max-w-md text-primary-fixed/90',
          )}
        >
          {t(
            'notFound.body',
            {},
            {
              defaultValue:
                'It may have been removed by a mod, deleted by its author, or never existed in the first place. There is plenty more to read.',
            },
          )}
        </p>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            'relative z-10 flex-wrap justify-center',
          )}
        >
          <Link
            to="/boards"
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 5),
              cm.sp('py', 3),
              'rounded-full bg-surface text-primary hover:-translate-y-0.5 transition-transform',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-base')}>home</span>
            {t('notFound.ctaFeed', {}, { defaultValue: 'Back to boards' })}
          </Link>
          <Link
            to="/boards"
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              cm.sp('px', 5),
              cm.sp('py', 3),
              'rounded-full border border-surface/40 text-white hover:bg-surface/10 backdrop-blur-md transition-colors',
            )}
          >
            {t('notFound.ctaCategories', {}, { defaultValue: 'Browse communities' })}
          </Link>
        </div>
      </div>
      <p
        className={cm.cn(
          cm.sp('mt', 8),
          cm.textSize('xs'),
          'uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {APP_NAME} · {APP_TAGLINE}
      </p>
    </div>
  )
}

export default NotFound
