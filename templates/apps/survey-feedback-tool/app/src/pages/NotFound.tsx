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
        cm.minH('screen'),
        cm.sp('p', 6),
        'bg-gradient-to-br from-[var(--color-bg-tertiary)] via-[var(--color-text)] to-[var(--color-bg-tertiary)] dark:from-[var(--color-bg)] dark:via-[var(--color-bg-secondary)] dark:to-[var(--color-bg)]',
      )}
    >
      <main
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', gap: 5 }),
          cm.sp('p', 10),
          cm.w('full'),
          cm.maxW('md'),
          'rounded-3xl bg-surface shadow-lg border border-[color:var(--color-border)] text-center',
        )}
      >
        <span
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(16),
            cm.h(16),
            cm.roundedFull,
            'bg-primary/15 text-primary',
          )}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 32 }} aria-hidden="true">
            graphic_eq
          </span>
        </span>
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 2 }))}>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-primary',
            )}
          >
            {t('notFound.eyebrow', {}, { defaultValue: '404' })}
          </span>
          <h1
            className={cm.cn(cm.textSize('2xl'), 'font-extrabold tracking-tight text-on-surface')}
          >
            {t('notFound.heading', {}, { defaultValue: 'This survey drifted off the queue.' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'notFound.body',
              { app: APP_NAME },
              {
                defaultValue:
                  'The page you’re looking for doesn’t exist on {{app}}. Let’s get you back to your surveys.',
              },
            )}
          </p>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
          <Link
            to="/surveys"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 2 }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              'rounded-full bg-primary text-white font-semibold shadow-md hover:opacity-90 transition-opacity',
            )}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }} aria-hidden="true">
              poll
            </span>
            {t('notFound.cta', {}, { defaultValue: 'Back to surveys' })}
          </Link>
          <Link
            to="/"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 2 }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              'rounded-full border border-[color:var(--color-border)] text-on-surface font-semibold hover:bg-surface-secondary transition-colors',
            )}
          >
            {t('notFound.home', {}, { defaultValue: 'Visit homepage' })}
          </Link>
        </div>
      </main>
    </div>
  )
}

export default NotFound
