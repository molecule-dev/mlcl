import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'

/**
 * Catch-all 404. Without it, any unmatched URL renders a fully blank
 * screen (no route matches, so nothing mounts — not even the shell).
 *
 * @returns The rendered not-found page.
 */
export function NotFound() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-surface-container-low text-on-surface',
      )}
    >
      <main
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
          cm.flex1,
          cm.sp('p', 8),
          'text-center space-y-4',
        )}
      >
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('notFound.eyebrow', {}, { defaultValue: '404 — signal lost' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t(
            'notFound.heading',
            { app: APP_NAME },
            { defaultValue: "This page isn't in {{app}}'s feed" },
          )}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.maxW('md'))}>
          {t(
            'notFound.body',
            {},
            { defaultValue: 'The page you were looking for may have been moved or removed.' },
          )}
        </p>
        <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }) + ' justify-center'}>
          <Link
            to="/discover"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'rounded-full bg-primary text-on-primary',
            )}
          >
            {t('notFound.browseCta', {}, { defaultValue: 'Browse shows' })}
          </Link>
          <Link
            to="/"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'rounded-full border-2 border-outline-variant',
            )}
          >
            {t('notFound.homeCta', {}, { defaultValue: 'Go home' })}
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  )
}
