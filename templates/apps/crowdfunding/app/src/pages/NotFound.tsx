import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { Footer } from '../components/Footer.js'

export function NotFound() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      className={cm.cn(cm.flex({ direction: 'col' }), cm.minH('screen'), 'bg-background')}
      data-mol-id="page-not-found"
    >
      <main
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
          cm.flex1,
          cm.sp('px', 6),
          cm.sp('py', 16),
          cm.textCenter,
          'relative overflow-hidden',
        )}
      >
        <div
          className={cm.cn(
            cm.w(80),
            cm.h(80),
            cm.roundedFull,
            'absolute -right-24 -top-24 bg-primary/20 blur-3xl pointer-events-none',
          )}
          aria-hidden="true"
        />
        <div
          className={cm.cn(
            cm.w(64),
            cm.h(64),
            cm.roundedFull,
            'absolute -left-24 bottom-0 bg-accent/20 blur-3xl pointer-events-none',
          )}
          aria-hidden="true"
        />

        <div
          className={cm.cn(
            cm.w(20),
            cm.h(20),
            cm.roundedFull,
            cm.flex({ align: 'center', justify: 'center' }),
            cm.sp('mb', 6),
            'shadow-lg shadow-primary/20',
          )}
          style={{
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
          }}
        >
          <span
            className="material-symbols-outlined text-5xl text-white"
            style={{ fontVariationSettings: "'FILL' 1" }}
            aria-hidden="true"
          >
            rocket_launch
          </span>
        </div>

        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 2),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('notFound.eyebrow', {}, { defaultValue: 'Lost in space' })}
        </p>
        <h1
          className={cm.cn(
            cm.textSize('6xl'),
            cm.fontWeight('extrabold'),
            cm.sp('mb', 4),
            'tracking-tighter text-on-surface',
          )}
        >
          404
        </h1>
        <h2
          className={cm.cn(
            cm.textSize('2xl'),
            cm.fontWeight('bold'),
            cm.sp('mb', 3),
            'text-on-surface',
          )}
        >
          {t('notFound.title', {}, { defaultValue: 'This campaign drifted off course' })}
        </h2>
        <p
          className={cm.cn(
            cm.textSize('base'),
            cm.sp('mb', 8),
            cm.maxW('xl'),
            'text-on-surface-variant',
          )}
        >
          {t(
            'notFound.body',
            {},
            {
              defaultValue:
                "The page you wanted is no longer here. Maybe it ended, maybe the link is stale — either way, head back and discover what's launching now.",
            },
          )}
        </p>

        <div
          className={cm.cn(cm.flex({ align: 'center', justify: 'center', gap: 'md' }), 'flex-wrap')}
        >
          <Link
            to="/"
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'rounded-lg text-white shadow-md hover:shadow-lg active:scale-95 transition-all',
            )}
            style={{
              background:
                'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
            }}
          >
            {t('auth.backToHome', {}, { defaultValue: 'Back to home' })}
          </Link>
          <Link
            to="/discover"
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container transition-colors',
            )}
          >
            {t('notFound.discover', {}, { defaultValue: 'Discover campaigns' })}
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default NotFound
