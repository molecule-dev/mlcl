import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

interface SigilBrandHeaderProps {
  /** Optional override of the heading shown beneath the brand mark. */
  heading?: string
  /** Optional override of the supporting copy beneath the heading. */
  subhead?: string
  /** When false, hides heading + subhead (used in nav contexts). */
  showHeading?: boolean
}

/**
 * Crystalline brand header for Sigil — diamond glyph in a primary
 * tile, app name in heavy tracking-tight type, and an optional
 * brand-aware heading/subhead row.
 *
 * Translated from blog's BrandingHeader / personal-finance's
 * LoginBrandingHeader anatomy (catalog §13.7) with Sigil's diamond
 * glyph and indigo palette.
 */
export function SigilBrandHeader({ heading, subhead, showHeading = true }: SigilBrandHeaderProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(cm.flex({ direction: 'col', align: 'center', gap: 'md' }), cm.textCenter)}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.fontWeight('bold'),
          'text-[26px] tracking-tight text-primary',
        )}
      >
        <span
          className={cm.cn(cm.textSize('3xl'), 'material-symbols-outlined text-primary')}
          style={{ fontVariationSettings: "'FILL' 1" }}
          aria-hidden="true"
        >
          diamond
        </span>
        <span className="font-extrabold tracking-tighter">{APP_NAME}</span>
      </div>
      {showHeading && (
        <div className={cm.cn(cm.stack(2), cm.textCenter)}>
          <h1 className={cm.cn(cm.fontWeight('bold'), 'text-3xl tracking-tight text-on-surface')}>
            {heading ??
              t('auth.login.signInTitle', { appName: APP_NAME }, { defaultValue: 'Welcome back' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-sm')}>
            {subhead ??
              t(
                'sigilBrandHeader.subhead',
                { tagline: APP_TAGLINE },
                { defaultValue: '{{tagline}}' },
              )}
          </p>
        </div>
      )}
    </div>
  )
}

export default SigilBrandHeader
