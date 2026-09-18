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
        'relative overflow-hidden bg-surface text-on-surface',
      )}
    >
      <div
        aria-hidden="true"
        className={cm.cn(
          'pointer-events-none absolute -right-32 -top-40 h-[28rem] w-[28rem] rounded-full bg-primary/10 blur-3xl',
        )}
      />
      <div
        aria-hidden="true"
        className={cm.cn(
          'pointer-events-none absolute -left-32 bottom-0 h-[24rem] w-[24rem] rounded-full bg-secondary/10 blur-3xl',
        )}
      />

      <div className={cm.cn('relative z-10 mx-auto max-w-xl text-center')}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('extrabold'),
            'uppercase tracking-widest text-secondary',
          )}
        >
          {t('notFound.eyebrow', {}, { defaultValue: 'Off the trail' })}
        </p>
        <p
          className={cm.cn(
            cm.sp('mt', 4),
            cm.fontWeight('extrabold'),
            'bg-gradient-to-br from-primary to-secondary bg-clip-text text-transparent',
          )}
          style={{ fontSize: '7rem', lineHeight: 1, letterSpacing: '-0.04em' }}
        >
          404
        </p>
        <h1
          className={cm.cn(
            cm.sp('mt', 4),
            cm.textSize('3xl'),
            cm.fontWeight('extrabold'),
            'tracking-tight text-on-surface',
          )}
        >
          {t('notFound.heading', {}, { defaultValue: 'This page is not in the library.' })}
        </h1>
        <p
          className={cm.cn(cm.sp('mt', 4), cm.textSize('lg'), 'italic text-on-surface-variant')}
          style={{ fontFamily: 'Georgia, "Iowan Old Style", serif' }}
        >
          {t(
            'notFound.body',
            { app: APP_NAME },
            {
              defaultValue:
                'The article you were looking for has been moved, archived, or never written. Open a fresh draft, or head back to the trail.',
            },
          )}
        </p>
        <div
          className={cm.cn(
            cm.sp('mt', 8),
            cm.flex({ align: 'center', justify: 'center', gap: 'md', wrap: 'wrap' }),
          )}
        >
          <Link
            to="/home"
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.fontWeight('extrabold'),
              cm.textSize('sm'),
              'rounded-full bg-gradient-to-br from-primary to-secondary text-white shadow-md transition-transform hover:-translate-y-0.5',
            )}
          >
            {t('notFound.home', {}, { defaultValue: 'Back to workspace' })}
          </Link>
          <Link
            to="/"
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-full border border-outline text-on-surface hover:bg-surface-container',
            )}
          >
            {t('notFound.landing', {}, { defaultValue: 'Open landing page' })}
          </Link>
        </div>
      </div>
    </div>
  )
}

export default NotFound
