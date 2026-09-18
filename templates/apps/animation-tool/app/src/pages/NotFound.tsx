import { Link, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { VivaceWordmark } from '../components/VivaceWordmark.js'

export function NotFound() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const location = useLocation()

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.minH('screen'),
        'bg-[var(--anim-background)] text-[var(--anim-text)] font-body relative overflow-hidden text-center',
      )}
    >
      <div aria-hidden className={cm.cn('absolute inset-0 pointer-events-none')}>
        <div
          className={cm.cn(
            'absolute -top-40 -right-40 w-[480px] h-[480px] rounded-full bg-[color-mix(in_srgb,var(--anim-primary)_15%,transparent)] blur-[120px]',
          )}
        />
        <div
          className={cm.cn(
            'absolute -bottom-40 -left-40 w-[480px] h-[480px] rounded-full bg-[color-mix(in_srgb,var(--anim-secondary)_15%,transparent)] blur-[120px]',
          )}
        />
      </div>

      <div className={cm.cn('relative z-10 max-w-[520px] px-6')}>
        <VivaceWordmark size="md" to="/" />
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.sp('mt', 8),
            'font-mono uppercase tracking-widest text-[var(--anim-primary)]',
          )}
        >
          {t('notFound.eyebrow', {}, { defaultValue: '// 404 — frame not in timeline' })}
        </p>
        <h1
          className={cm.cn(
            cm.sp('mt', 3),
            'font-headline font-extrabold text-6xl md:text-7xl tracking-tight',
          )}
        >
          <span
            className={cm.cn(
              'bg-clip-text text-transparent bg-gradient-to-r from-[var(--anim-primary)] via-[var(--anim-primary)] to-[var(--anim-secondary)]',
            )}
          >
            404
          </span>
        </h1>
        <p className={cm.cn(cm.textSize('lg'), cm.sp('mt', 4), 'text-[var(--anim-text)]')}>
          {t('notFound.heading', {}, { defaultValue: 'This keyframe never landed.' })}
        </p>
        <p
          className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-[var(--anim-text-secondary)]')}
        >
          {t(
            'notFound.body',
            { path: location.pathname },
            {
              defaultValue:
                'The route “{{path}}” is missing from the timeline. Check the URL or scrub back to the dashboard.',
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
              'rounded-lg bg-gradient-to-r from-[var(--anim-primary)] to-[var(--anim-secondary)] text-white hover:opacity-90 transition-opacity',
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
              'rounded-lg border border-[var(--anim-border)] hover:border-[color-mix(in_srgb,var(--anim-primary)_40%,transparent)] text-[var(--anim-text)] transition-colors',
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
