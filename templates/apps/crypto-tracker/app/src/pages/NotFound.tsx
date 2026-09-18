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
        'bg-surface text-on-surface relative overflow-hidden',
      )}
    >
      <div
        className={cm.cn(
          cm.w(80),
          cm.h(80),
          cm.roundedFull,
          'absolute -top-32 -right-32 bg-primary/10 blur-3xl',
        )}
        aria-hidden="true"
      />
      <div
        className={cm.cn(
          cm.w(80),
          cm.h(80),
          cm.roundedFull,
          'absolute -bottom-32 -left-32 bg-secondary/10 blur-3xl',
        )}
        aria-hidden="true"
      />
      <div className={cm.cn('relative z-10 max-w-xl', cm.textCenter)}>
        <p
          className={cm.cn(
            'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
            cm.sp('mb', 4),
          )}
        >
          {t(
            'notFound.eyebrow',
            { appName: APP_NAME },
            { defaultValue: '{{appName}} signal lost' },
          )}
        </p>
        <h1
          className={cm.cn(
            'text-7xl md:text-8xl font-extrabold tracking-tighter tabular-nums text-primary',
          )}
        >
          404
        </h1>
        <p className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'), cm.sp('mt', 4))}>
          {t('notFound.heading', {}, { defaultValue: 'This signal is out of range' })}
        </p>
        <p className={cm.cn(cm.textSize('base'), cm.sp('mt', 2), 'text-on-surface-variant')}>
          {t(
            'notFound.body',
            {},
            {
              defaultValue:
                'The route you scanned does not resolve to a known coin or page. Recheck the symbol and try again.',
            },
          )}
        </p>
        <div
          className={cm.cn(cm.flex({ justify: 'center', gap: 'md' }), cm.sp('mt', 8), 'flex-wrap')}
        >
          <Link
            to="/dashboard"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              'rounded-full bg-primary text-on-primary hover:bg-primary/90 transition-colors',
            )}
          >
            {t('auth.backToDashboard', {}, { defaultValue: 'Back to dashboard' })}
          </Link>
          <Link
            to="/markets"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              'rounded-full border border-outline text-on-surface hover:bg-surface-container transition-colors',
            )}
          >
            {t('notFound.browseMarkets', {}, { defaultValue: 'Browse markets' })}
          </Link>
        </div>
      </div>
    </div>
  )
}
