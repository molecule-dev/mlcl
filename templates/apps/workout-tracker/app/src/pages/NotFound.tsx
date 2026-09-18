import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

export function NotFound() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <main
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 'lg' }),
        cm.minH('screen'),
        cm.sp('p', 8),
        'bg-accent text-white text-center relative overflow-hidden',
      )}
    >
      <div
        className={cm.cn(
          'absolute -top-32 -left-32 w-[400px] h-[400px] rounded-full bg-primary/30 blur-3xl pointer-events-none',
        )}
        aria-hidden="true"
      />
      <div
        className={cm.cn(
          'absolute -bottom-32 -right-32 w-[400px] h-[400px] rounded-full bg-primary/15 blur-3xl pointer-events-none',
        )}
        aria-hidden="true"
      />

      <Link
        to="/"
        className={cm.cn('relative z-10 text-3xl font-black text-primary tracking-tighter')}
      >
        {APP_NAME}
      </Link>

      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }), 'relative z-10 max-w-xl')}>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            'font-black uppercase tracking-[0.32em] text-primary-light',
          )}
        >
          404 · {t('forja.notFound.eyebrow', {}, { defaultValue: 'Lost rep' })}
        </span>
        <h1
          className={cm.cn('text-6xl md:text-7xl font-extrabold tracking-tighter leading-[0.95]')}
        >
          {t('forja.notFound.title', {}, { defaultValue: 'No bar here.' })}
        </h1>
        <p className={cm.cn(cm.textSize('lg'), 'text-white/70 leading-relaxed')}>
          {t(
            'forja.notFound.body',
            {},
            {
              defaultValue:
                "The page you're looking for got racked. Head back to your dashboard and pick the bar up.",
            },
          )}
        </p>
        <div className={cm.cn(cm.flex({ gap: 'sm', justify: 'center' }), 'flex-wrap')}>
          <Link
            to="/dashboard"
            className={cm.cn(
              cm.sp('px', 8),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              'bg-primary text-on-primary rounded-full hover:bg-primary-light transition-colors shadow-lg shadow-primary/30 uppercase tracking-wide',
            )}
          >
            {t('auth.backToDashboard', {}, { defaultValue: 'Back to dashboard' })}
          </Link>
          <Link
            to="/"
            className={cm.cn(
              cm.sp('px', 8),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              'rounded-full border border-surface/30 text-white hover:bg-surface/10 transition-colors uppercase tracking-wide',
            )}
          >
            {t('forja.notFound.home', {}, { defaultValue: 'Marketing home' })}
          </Link>
        </div>
      </div>
    </main>
  )
}
