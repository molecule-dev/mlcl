import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ACCENT_COLOR, APP_NAME, BRAND_COLOR } from '../branding.js'

const HERO_GRADIENT = `linear-gradient(135deg, ${BRAND_COLOR} 0%, ${ACCENT_COLOR} 100%)`

/**
 * Brand-consistent 404 — Vivid pink → violet gradient orb + an
 * `image_search` glyph, lifted from photo-sharing's NotFound.tsx and
 * recoloured for the Vivid palette.
 */
export function NotFound() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.sp('p', 8),
        cm.textCenter,
        'bg-background text-on-surface',
      )}
    >
      <div
        className={cm.cn('w-32 h-32 rounded-full flex items-center justify-center shadow-xl mb-8')}
        style={{ background: HERO_GRADIENT }}
        aria-hidden="true"
      >
        <span className={cm.cn('material-symbols-outlined text-[64px] text-white')}>
          image_search
        </span>
      </div>
      <p className={cm.cn('text-[11px] font-black uppercase tracking-widest text-primary mb-3')}>
        {t('notFound.eyebrow', {}, { defaultValue: 'Off-feed' })}
      </p>
      <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight md:text-5xl')}>
        {t('notFound.heading', {}, { defaultValue: 'This page took a hiatus' })}
      </h1>
      <p className={cm.cn('text-base text-on-surface-variant max-w-md mt-3')}>
        {t(
          'notFound.body',
          { app: APP_NAME },
          {
            defaultValue:
              "The post or profile you were after isn't here. Maybe it was deleted, set private, or the link aged out. Let's get you back to the feed.",
          },
        )}
      </p>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }), 'mt-8')}>
        <Link
          to="/feed"
          className={cm.cn(
            'inline-flex items-center gap-2',
            cm.sp('px', 6),
            'py-3 rounded-full font-bold text-sm text-white hover:shadow-lg transition-all',
          )}
          style={{ background: HERO_GRADIENT }}
        >
          {t('notFound.feedCta', {}, { defaultValue: 'Back to feed' })}
        </Link>
        <Link
          to="/"
          className={cm.cn(
            cm.sp('px', 6),
            'py-3 rounded-full font-bold text-sm border border-outline-variant hover:bg-surface-container-low transition-colors',
          )}
        >
          {t('notFound.homeCta', {}, { defaultValue: 'Go home' })}
        </Link>
      </div>
    </div>
  )
}
