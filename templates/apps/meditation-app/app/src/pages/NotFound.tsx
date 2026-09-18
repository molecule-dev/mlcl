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
        cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 'lg' }),
        cm.minH('screen'),
        cm.sp('p', 8),
        'bg-gradient-to-br from-[var(--color-hero-from-alt)] via-primary to-[var(--color-cat-mindfulness)] text-white text-center relative overflow-hidden',
      )}
    >
      <div
        className={cm.cn('absolute -top-32 -left-20 w-96 h-96 bg-surface/10 rounded-full blur-3xl')}
        aria-hidden="true"
      />
      <div
        className={cm.cn(
          'absolute -bottom-32 -right-20 w-96 h-96 bg-accent/30 rounded-full blur-3xl',
        )}
        aria-hidden="true"
      />
      <svg
        className={cm.cn('w-48 h-48 opacity-50 relative')}
        viewBox="0 0 100 100"
        aria-hidden="true"
      >
        {[14, 22, 30, 38, 46].map((r) => (
          <circle
            key={r}
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="white"
            strokeWidth="0.6"
            strokeOpacity={0.6 - r / 100}
          />
        ))}
      </svg>
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), 'relative z-10 max-w-lg')}>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-[0.4em] text-white/70',
          )}
        >
          404
        </span>
        <h1
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-5xl md:text-6xl tracking-tight leading-[0.95]',
          )}
        >
          {t('stillpoint.notFound.title', {}, { defaultValue: 'Lost in the silence' })}
        </h1>
        <p className={cm.cn(cm.textSize('lg'), 'text-white/85 leading-relaxed mt-3')}>
          {t(
            'stillpoint.notFound.body',
            { app: APP_NAME },
            {
              defaultValue:
                'This page is taking a long, deep breath somewhere. Let’s find a quieter spot for you in {{app}}.',
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
          to="/home"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            'rounded-full bg-surface text-primary hover:bg-accent hover:text-on-accent transition-colors shadow-lg',
          )}
        >
          <span
            aria-hidden="true"
            className={cm.cn('material-symbols-outlined text-xl')}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            self_improvement
          </span>
          {t('stillpoint.notFound.toHome', {}, { defaultValue: 'Back to today' })}
        </Link>
        <Link
          to="/library"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('semibold'),
            cm.textSize('sm'),
            'rounded-full border border-surface/30 hover:bg-surface/10 transition-colors',
          )}
        >
          {t('stillpoint.notFound.toLibrary', {}, { defaultValue: 'Browse library' })}
        </Link>
      </div>
    </div>
  )
}
