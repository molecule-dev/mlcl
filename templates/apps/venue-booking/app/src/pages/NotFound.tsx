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
        'bg-background text-on-surface antialiased flex flex-col',
      )}
    >
      <div className={cm.cn('border-b border-outline-variant/40 bg-surface/95 backdrop-blur-md')}>
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.sp('px', 6),
            cm.sp('py', 4),
            cm.flex({ align: 'center', justify: 'between' }),
            cm.mxAuto,
          )}
        >
          <Link to="/" className={cm.flex({ align: 'center', gap: 'sm' })}>
            <span
              className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'text-primary')}
              style={{ fontFamily: '"DM Sans", system-ui, sans-serif', letterSpacing: '-0.02em' }}
            >
              {APP_NAME}
            </span>
          </Link>
        </div>
      </div>
      <main
        className={cm.cn(
          'flex-1 flex items-center justify-center',
          cm.sp('px', 6),
          cm.sp('py', 16),
        )}
      >
        <div className={cm.cn(cm.maxW('2xl'), cm.textCenter, 'relative')}>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-[0.25em] text-primary',
            )}
          >
            {t('notFound.eyebrow', {}, { defaultValue: 'Lost in the venue grid' })}
          </p>
          <h1
            className={
              'text-6xl md:text-8xl font-extrabold tracking-tighter leading-[0.95] text-primary mt-4'
            }
            style={{ fontFamily: '"DM Sans", system-ui, sans-serif', letterSpacing: '-0.04em' }}
          >
            404
          </h1>
          <p
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('bold'),
              cm.sp('mt', 4),
              'leading-tight',
            )}
            style={{ fontFamily: '"DM Sans", system-ui, sans-serif', letterSpacing: '-0.02em' }}
          >
            {t('notFound.heading', {}, { defaultValue: 'This space has stepped out for the day.' })}
          </p>
          <p
            className={cm.cn(
              cm.textSize('base'),
              cm.sp('mt', 3),
              'text-on-surface-variant leading-relaxed',
            )}
          >
            {t(
              'notFound.body',
              { appName: APP_NAME },
              {
                defaultValue:
                  'The link might be old or the listing was unpublished. Try the search instead — {{appName}} has 340+ vetted venues across 28 cities.',
              },
            )}
          </p>
          <div
            className={cm.cn(
              cm.sp('mt', 8),
              cm.flex({ align: 'center', gap: 'sm', justify: 'center', wrap: 'wrap' }),
            )}
          >
            <Link
              to="/"
              className={cm.cn(
                cm.sp('px', 6),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                'rounded-full bg-primary text-on-primary hover:bg-primary-container transition-colors',
              )}
            >
              {t('auth.backToHome', {}, { defaultValue: 'Back to home' })}
            </Link>
            <Link
              to="/search"
              className={cm.cn(
                cm.sp('px', 6),
                cm.sp('py', 3),
                cm.fontWeight('semibold'),
                'rounded-full border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary transition-colors',
              )}
            >
              {t('notFound.search', {}, { defaultValue: 'Browse spaces' })}
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
