import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

export function NotFound() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <main
      data-mol-id="page-not-found"
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.minH('screen'),
        cm.sp('p', 6),
        'relative bg-gradient-to-br from-primary/5 via-surface to-secondary/5 text-on-surface overflow-hidden',
      )}
    >
      <div
        className={
          'absolute -top-40 -right-40 w-[480px] h-[480px] rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 blur-3xl pointer-events-none'
        }
        aria-hidden="true"
      />
      <div
        className={
          'absolute -bottom-40 -left-40 w-[480px] h-[480px] rounded-full bg-gradient-to-br from-secondary/20 to-primary/20 blur-3xl pointer-events-none'
        }
        aria-hidden="true"
      />

      <div
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
          cm.maxW('md'),
          cm.textCenter,
          'relative z-10',
        )}
      >
        <div
          className={cm.cn(
            cm.w(20),
            cm.h(20),
            cm.flex({ align: 'center', justify: 'center' }),
            cm.sp('mb', 2),
            'rounded-3xl bg-gradient-to-br from-primary to-secondary text-white shadow-xl shadow-primary/20',
          )}
          aria-hidden="true"
        >
          <span
            className="material-symbols-outlined text-5xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            mark_email_unread
          </span>
        </div>

        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('meridian.notFound.eyebrow', {}, { defaultValue: 'Error 404' })}
        </p>

        <h1 className={cm.cn('text-5xl md:text-6xl font-extrabold tracking-tight leading-[0.95]')}>
          {t('meridian.notFound.title', {}, { defaultValue: 'This thread was archived.' })}
        </h1>

        <p
          className={cm.cn(
            cm.textSize('lg'),
            cm.sp('mt', 2),
            'text-on-surface-variant leading-relaxed',
          )}
        >
          {t(
            'meridian.notFound.body',
            { appName: APP_NAME },
            {
              defaultValue:
                'The page you\u2019re looking for couldn\u2019t be found. Head back to your {{appName}} inbox and we\u2019ll get you on track.',
            },
          )}
        </p>

        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 'sm', wrap: 'wrap' }),
            cm.sp('mt', 4),
          )}
        >
          <Link
            to="/inbox"
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              'inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-primary to-secondary text-white shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-shadow',
            )}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              inbox
            </span>
            {t('meridian.notFound.toInbox', {}, { defaultValue: 'Open my inbox' })}
          </Link>
          <Link
            to="/"
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              'inline-flex items-center gap-2 rounded-full border border-outline-variant text-on-surface bg-surface hover:bg-surface-container-low transition-colors',
            )}
          >
            {t('auth.backToHome', {}, { defaultValue: 'Back to home' })}
          </Link>
        </div>
      </div>
    </main>
  )
}

export default NotFound
