import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * Brand-consistent 404 — uses Obscura's warm-paper palette + the
 * editorial Playfair display face, plus an `image_not_supported` glyph
 * card to keep the photographic identity even on the empty state.
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
        className={'w-32 h-32 rounded-full flex items-center justify-center shadow-xl mb-8'}
        style={{
          background:
            'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
        }}
        aria-hidden="true"
      >
        <span className="material-symbols-outlined text-[64px] text-white">
          image_not_supported
        </span>
      </div>
      <p className={'text-[11px] font-black uppercase tracking-widest text-primary mb-3'}>
        {t('notFound.eyebrow', {}, { defaultValue: 'Frame not found' })}
      </p>
      <h1
        className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight md:text-5xl')}
        style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
      >
        {t('notFound.heading', {}, { defaultValue: 'Out of focus' })}
      </h1>
      <p className={'text-base text-on-surface-variant max-w-md mt-3'}>
        {t(
          'notFound.body',
          { app: APP_NAME },
          {
            defaultValue:
              "Whatever you were looking for isn't here. Maybe it was unpublished, or the link aged out. Let's get you somewhere with photographs.",
          },
        )}
      </p>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }), 'mt-8')}>
        <Link
          to="/explore"
          className={cm.cn(
            cm.sp('px', 6),
            'py-3 rounded-full font-bold text-sm bg-primary text-on-primary hover:bg-primary/90 transition-colors shadow',
          )}
        >
          {t('notFound.exploreCta', {}, { defaultValue: 'Back to Explore' })}
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
