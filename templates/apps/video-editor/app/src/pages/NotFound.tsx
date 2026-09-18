import { Link, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { RushesWordmark } from '../components/RushesWordmark.js'

export function NotFound() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const location = useLocation()

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.minH('screen'),
        'bg-[var(--video-input-bg)] text-[var(--video-text-primary)] font-body relative overflow-hidden text-center',
      )}
    >
      <div aria-hidden className={cm.cn('absolute inset-0 pointer-events-none')}>
        <div
          className={cm.cn(
            'absolute -top-40 -right-40 w-[480px] h-[480px] rounded-full bg-[var(--video-cta-from)]/15 blur-[120px]',
          )}
        />
        <div
          className={cm.cn(
            'absolute -bottom-40 -left-40 w-[480px] h-[480px] rounded-full bg-[var(--video-link-hover)]/15 blur-[120px]',
          )}
        />
      </div>

      <div className={cm.cn('relative z-10 max-w-[520px] px-6')}>
        <RushesWordmark size="md" to="/" />
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.sp('mt', 8),
            'font-mono uppercase tracking-widest text-[var(--video-link)]',
          )}
        >
          {t('notFound.eyebrow', {}, { defaultValue: '// 404 — clip not on the timeline' })}
        </p>
        <h1 className={cm.cn(cm.sp('mt', 3), 'font-extrabold text-6xl md:text-7xl tracking-tight')}>
          <span
            className={cm.cn(
              'bg-clip-text text-transparent bg-gradient-to-r from-[var(--video-link)] via-[var(--video-cta-from)] to-[var(--video-cta-to)]',
            )}
          >
            404
          </span>
        </h1>
        <p className={cm.cn(cm.textSize('lg'), cm.sp('mt', 4), 'text-[var(--video-text-primary)]')}>
          {t('notFound.heading', {}, { defaultValue: 'This frame never made the cut.' })}
        </p>
        <p
          className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-[var(--video-text-muted-alt)]')}
        >
          {t(
            'notFound.body',
            { path: location.pathname },
            {
              defaultValue:
                'The route “{{path}}” isn’t in this project. Check the URL or scrub back to the dashboard.',
            },
          )}
        </p>
        <div
          className={cm.cn(cm.flex({ align: 'center', justify: 'center', gap: 3 }), cm.sp('mt', 8))}
        >
          <Link
            to="/"
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.flex({ align: 'center', gap: 2 }),
              cm.sp('px', 5),
              cm.sp('py', 3),
              'rounded-lg bg-gradient-to-r from-[var(--video-cta-from)] to-[var(--video-cta-to)] text-white hover:opacity-90 transition-opacity',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[18px]')}>home</span>
            <span>{t('auth.backToLanding', {}, { defaultValue: 'Back to landing' })}</span>
          </Link>
          <Link
            to="/dashboard"
            className={cm.cn(
              cm.fontWeight('medium'),
              cm.flex({ align: 'center', gap: 2 }),
              cm.sp('px', 5),
              cm.sp('py', 3),
              'rounded-lg border border-[var(--video-border-subtle)] hover:border-[var(--video-cta-from)]/40 text-[var(--video-text-primary)] transition-colors',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[18px]')}>dashboard</span>
            <span>{t('notFound.dashboard', {}, { defaultValue: 'Open dashboard' })}</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default NotFound
