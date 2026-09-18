import { Link, useParams } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

export function ThankYou() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { slug = 'q4-product-nps' } = useParams()

  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.sp('p', 6),
        'bg-gradient-to-br from-[var(--color-bg-tertiary)] via-[var(--color-bg)] to-[var(--color-bg-tertiary)] dark:from-[var(--color-bg)] dark:via-[var(--color-bg-secondary)] dark:to-[var(--color-bg)]',
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
            'bg-success-light text-[color:var(--color-on-success)]',
          )}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 36 }} aria-hidden="true">
            check_circle
          </span>
        </span>
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 2 }))}>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-primary',
            )}
          >
            {t('thankYou.eyebrow', {}, { defaultValue: 'Response received' })}
          </span>
          <h1
            className={cm.cn(cm.textSize('2xl'), 'font-extrabold tracking-tight text-on-surface')}
          >
            {t('thankYou.heading', {}, { defaultValue: 'Thanks — your voice matters.' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'thankYou.body',
              { app: APP_NAME },
              {
                defaultValue:
                  'Your response has been recorded. {{app}} will include it in the next analytics refresh.',
              },
            )}
          </p>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
          <Link
            to={`/s/${slug}`}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 2 }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              'rounded-full bg-primary text-white font-semibold shadow-md hover:opacity-90 transition-opacity',
            )}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }} aria-hidden="true">
              replay
            </span>
            {t('thankYou.retake', {}, { defaultValue: 'Take another response' })}
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
            {t('thankYou.home', { app: APP_NAME }, { defaultValue: 'Visit {{app}}' })}
          </Link>
        </div>
      </main>
    </div>
  )
}

export default ThankYou
