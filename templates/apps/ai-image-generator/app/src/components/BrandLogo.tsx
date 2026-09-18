import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { SafeLink } from './SafeLink.js'

export interface BrandLogoProps {
  /** Render the tagline beneath the wordmark. Defaults to true. */
  showTagline?: boolean
  /** Where the logo links to. Default `/`. */
  to?: string
  /** Larger sizing for hero / auth surfaces. */
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Reverie brand mark — sparkle glyph paired with the gradient wordmark and the
 * brand tagline from branding.ts. Used in the sidebar, auth shells and the
 * landing-page nav.
 */
export function BrandLogo({ showTagline = true, to = '/', size = 'md' }: BrandLogoProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const glyphSize =
    size === 'lg' ? 'w-12 h-12 text-2xl' : size === 'sm' ? 'w-8 h-8 text-base' : 'w-10 h-10 text-xl'
  const wordmarkSize = size === 'lg' ? 'text-3xl' : size === 'sm' ? 'text-base' : 'text-xl'

  return (
    <SafeLink to={to} className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'group')}>
      <span
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          glyphSize,
          'rounded-xl bg-gradient-to-br from-primary to-secondary text-white shadow-lg shadow-primary/30 group-hover:shadow-primary/50 transition-shadow',
        )}
        aria-hidden="true"
      >
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
          auto_awesome
        </span>
      </span>
      <span className={cm.flex({ direction: 'col' })}>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            wordmarkSize,
            'font-display tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary',
          )}
        >
          {t('brand.name', {}, { defaultValue: APP_NAME })}
        </span>
        {showTagline && (
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('medium'),
              'text-on-surface-variant tracking-wide',
            )}
          >
            {t('brand.tagline', {}, { defaultValue: APP_TAGLINE })}
          </span>
        )}
      </span>
    </SafeLink>
  )
}
