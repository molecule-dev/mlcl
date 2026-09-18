import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, BRAND_GRADIENT } from '../branding.js'

/**
 * Brand-consistent 404 \u2014 retrieval-themed copy + the same purple gradient
 * orbs as the auth shell, so the dead-end still feels like Engram.
 */
export function NotFound() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        'relative overflow-hidden bg-surface-container-low text-on-surface flex items-center justify-center',
      )}
    >
      <div
        className={cm.cn(
          'absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full opacity-25 blur-3xl pointer-events-none',
        )}
        style={{ background: BRAND_GRADIENT }}
        aria-hidden="true"
      />
      <div
        className={cm.cn(
          'absolute -bottom-40 -right-40 w-[520px] h-[520px] rounded-full opacity-20 blur-3xl pointer-events-none',
        )}
        style={{ background: 'radial-gradient(circle, var(--color-accent) 0%, transparent 70%)' }}
        aria-hidden="true"
      />

      <div
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
          cm.maxW('lg'),
          cm.sp('p', 8),
          cm.textCenter,
          'relative z-10',
        )}
      >
        <span
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(16),
            cm.h(16),
            'rounded-full text-white shadow-lg shadow-primary/30',
          )}
          style={{ background: BRAND_GRADIENT }}
        >
          <span
            className={cm.cn('material-symbols-outlined')}
            style={{ fontSize: 36, fontVariationSettings: "'FILL' 1" }}
            aria-hidden="true"
          >
            search_off
          </span>
        </span>
        <p
          className={cm.cn(cm.textSize('xs'), 'uppercase tracking-widest font-bold text-primary')}
          style={{ fontSize: 11 }}
        >
          {t('notFound.eyebrow', {}, { defaultValue: 'Cannot retrieve' })}
        </p>
        <h1 className={cm.cn('text-7xl font-extrabold tracking-tighter text-primary tabular-nums')}>
          404
        </h1>
        <h2 className={cm.cn(cm.textSize('2xl'), 'font-bold tracking-tight')}>
          {t('notFound.title', {}, { defaultValue: 'No such chunk in the index' })}
        </h2>
        <p
          className={cm.cn(cm.textSize('base'), 'text-on-surface-variant max-w-md leading-relaxed')}
        >
          {t(
            'notFound.body',
            { app: APP_NAME },
            {
              defaultValue:
                '{{app}} couldn\u2019t locate that page. The link may be broken, or the page may have been retired during a re-index.',
            },
          )}
        </p>
        <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'sm' }), cm.sp('mt', 4))}>
          <Link
            to="/ask"
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'rounded-full text-white inline-flex items-center gap-2 hover:opacity-90 transition-opacity shadow-md shadow-primary/20',
            )}
            style={{ background: BRAND_GRADIENT }}
          >
            <span
              className={cm.cn('material-symbols-outlined')}
              style={{ fontSize: 18 }}
              aria-hidden="true"
            >
              forum
            </span>
            {t('notFound.askCta', {}, { defaultValue: 'Ask the knowledge base' })}
          </Link>
          <Link
            to="/"
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-full border border-outline-variant text-on-surface hover:bg-surface-container-low transition-colors inline-flex items-center gap-2',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined')}
              style={{ fontSize: 18 }}
              aria-hidden="true"
            >
              home
            </span>
            {t('auth.backToLanding', {}, { defaultValue: 'Back to landing' })}
          </Link>
        </div>
      </div>
    </div>
  )
}
