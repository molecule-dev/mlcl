import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

export function NotFound() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      data-mol-id="page-not-found"
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.minH('screen'),
        cm.sp('p', 8),
        'relative overflow-hidden bg-background text-on-surface',
      )}
    >
      <div
        className={
          'pointer-events-none absolute -top-24 -right-24 h-[500px] w-[500px] rounded-full bg-primary-fixed opacity-25 blur-[120px]'
        }
        aria-hidden="true"
      />
      <div
        className={
          'pointer-events-none absolute -bottom-24 -left-24 h-[500px] w-[500px] rounded-full bg-secondary-fixed opacity-25 blur-[120px]'
        }
        aria-hidden="true"
      />

      <div
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', gap: 'lg' }),
          cm.maxW('lg'),
          cm.textCenter,
          'relative z-10',
        )}
      >
        <span
          className={cm.cn(
            cm.w(16),
            cm.h(16),
            cm.flex({ align: 'center', justify: 'center' }),
            'rounded-3xl bg-gradient-to-br from-primary to-primary-container shadow-lg shadow-primary/20',
          )}
        >
          <span
            className="material-symbols-outlined text-4xl text-white"
            style={{ fontVariationSettings: "'FILL' 1" }}
            aria-hidden="true"
          >
            travel_explore
          </span>
        </span>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('notFound.label', { appName: APP_NAME }, { defaultValue: '{{appName}} · 404' })}
        </p>
        <h1 className={'text-5xl md:text-6xl font-extrabold tracking-tighter text-on-surface'}>
          {t('notFound.heading', {}, { defaultValue: 'Page not found.' })}
        </h1>
        <p className={cm.cn('serif-text text-lg leading-relaxed text-on-surface-variant')}>
          {t(
            'notFound.body',
            {},
            {
              defaultValue:
                "That URL is uncharted territory. Maybe a typo, maybe a deleted lesson — either way, let's get you back to studying.",
            },
          )}
        </p>
        <div className={cm.flex({ direction: 'col', gap: 'sm' })}>
          <Link
            to="/dashboard"
            className={cm.cn(
              cm.sp('px', 8),
              cm.sp('py', 4),
              cm.fontWeight('semibold'),
              cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
              'rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary hover:opacity-90 transition-opacity',
            )}
          >
            <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
              dashboard
            </span>
            {t('auth.backToDashboard', {}, { defaultValue: 'Back to dashboard' })}
          </Link>
          <Link
            to="/"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'text-primary hover:underline',
            )}
          >
            {t('notFound.backToHome', {}, { defaultValue: 'Or go to the homepage →' })}
          </Link>
        </div>
      </div>
    </div>
  )
}
