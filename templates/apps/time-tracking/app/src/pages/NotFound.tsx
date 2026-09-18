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
        'bg-gradient-to-br from-blue-50 via-slate-50 to-emerald-50 antialiased text-foreground',
      )}
    >
      <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 12))}>
        <span
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(10),
            cm.h(10),
            'rounded-xl bg-gradient-to-br from-blue-600 to-emerald-500 text-white shadow-lg',
          )}
        >
          <span
            className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            schedule
          </span>
        </span>
        <span className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight')}>
          {APP_NAME}
        </span>
      </Link>

      <div
        className={cm.cn(
          cm.sp('p', 12),
          'bg-surface rounded-3xl shadow-xl shadow-blue-500/5 max-w-xl w-full text-center relative overflow-hidden',
        )}
      >
        <p className={cm.cn('text-[11px] font-bold uppercase tracking-widest text-blue-600 mb-2')}>
          {t('notFound.eyebrow', {}, { defaultValue: 'Untracked territory' })}
        </p>
        <h1
          className={cm.cn(
            'text-7xl md:text-8xl font-extrabold tracking-tighter font-mono tabular-nums text-transparent bg-clip-text bg-gradient-to-br from-blue-600 to-emerald-500',
          )}
        >
          404
        </h1>
        <h2 className={cm.cn(cm.textSize('2xl'), 'font-extrabold tracking-tight mt-4')}>
          {t('notFound.title', {}, { defaultValue: 'This page is off the clock' })}
        </h2>
        <p
          className={cm.cn(cm.textSize('base'), 'text-foreground-secondary max-w-md mx-auto mt-3')}
        >
          {t(
            'notFound.body',
            {},
            {
              defaultValue:
                'Looks like the link you followed has stopped tracking. Head back to your dashboard \u2014 we\u2019ll keep counting from there.',
            },
          )}
        </p>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
            cm.sp('mt', 8),
          )}
        >
          <Link
            to="/"
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-xl bg-surface border border-border text-foreground hover:bg-surface-secondary transition-colors',
            )}
          >
            {t('notFound.home', {}, { defaultValue: 'Go home' })}
          </Link>
          <Link
            to="/dashboard"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'rounded-xl bg-gradient-to-br from-blue-600 to-emerald-500 text-white shadow-md hover:shadow-lg transition-all',
            )}
          >
            <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>dashboard</span>
            {t('notFound.dashboard', {}, { defaultValue: 'Open dashboard' })}
          </Link>
        </div>

        <div
          className={cm.cn(
            'absolute -right-24 -bottom-24 w-72 h-72 rounded-full bg-blue-100/50 blur-3xl pointer-events-none',
          )}
        />
        <div
          className={cm.cn(
            'absolute -left-20 -top-20 w-56 h-56 rounded-full bg-success-light/50 blur-3xl pointer-events-none',
          )}
        />
      </div>
    </div>
  )
}

export default NotFound
export { NotFound as NotFoundPage }
