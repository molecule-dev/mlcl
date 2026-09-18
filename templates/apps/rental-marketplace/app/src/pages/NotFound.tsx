import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export function NotFound() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        'bg-background text-on-surface antialiased flex items-center justify-center',
        cm.sp('px', 6),
      )}
    >
      <div
        className={cm.cn(
          cm.maxW('xl'),
          cm.textCenter,
          cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
        )}
      >
        <span
          className="material-symbols-outlined text-7xl text-primary-dark"
          aria-hidden="true"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          travel_explore
        </span>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-[0.25em] text-primary-dark',
          )}
        >
          {t('notFound.eyebrow', {}, { defaultValue: 'Lost in transit' })}
        </p>
        <h1
          className={cm.cn(
            cm.textSize('5xl'),
            cm.fontWeight('extrabold'),
            'leading-[0.95] tracking-tight',
          )}
          style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
        >
          {t('notFound.heading', {}, { defaultValue: "We can't find that stay" })}
        </h1>
        <p
          className={cm.cn(cm.textSize('base'), 'text-on-surface-variant max-w-md leading-relaxed')}
        >
          {t(
            'notFound.body',
            {},
            {
              defaultValue:
                "The link you followed may be expired, or the listing was taken down. Let's get you back on the road.",
            },
          )}
        </p>
        <div
          className={cm.cn(
            cm.sp('mt', 4),
            cm.flex({ align: 'center', gap: 'md', wrap: 'wrap', justify: 'center' }),
          )}
        >
          <Link
            to="/"
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              'rounded-full bg-primary text-on-primary hover:bg-primary-container shadow-sm',
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
              'rounded-full border border-outline-variant hover:border-primary hover:text-primary',
            )}
          >
            {t('nav.browseStays', {}, { defaultValue: 'Browse stays' })}
          </Link>
        </div>
      </div>
    </div>
  )
}
