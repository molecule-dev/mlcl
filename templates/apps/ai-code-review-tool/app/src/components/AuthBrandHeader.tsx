import {
  AuthBrandHeader as BrandHeader,
  AuthBrandHeaderTagline,
} from '@molecule/app-auth-brand-header-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE, BRAND_COLOR } from '../branding.js'

/**
 * §13.7 Variant E — wordmark only with a single highlight character.
 * Refract brand: violet primary with the "f" rendered as a refracted
 * prism letter. Composes the shared AuthBrandHeader shell + tagline;
 * the accent wordmark is bespoke and passed as a child.
 */
export function AuthBrandHeader({ subtitle }: { subtitle?: string } = {}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const name = t('authBrandHeader.appName', { appName: APP_NAME }, { defaultValue: APP_NAME })
  return (
    <BrandHeader className={cm.textCenter}>
      <h1
        className={cm.cn(
          cm.textSize('4xl'),
          cm.fontWeight('bold'),
          'tracking-tight text-on-surface',
        )}
      >
        {name === 'Refract' ? (
          <>
            Re
            <span style={{ color: BRAND_COLOR, textShadow: `0 0 14px ${BRAND_COLOR}66` }}>f</span>
            ract
          </>
        ) : (
          name
        )}
      </h1>
      <AuthBrandHeaderTagline className="font-mono">
        {subtitle || t('authBrandHeader.tagline', {}, { defaultValue: APP_TAGLINE })}
      </AuthBrandHeaderTagline>
    </BrandHeader>
  )
}

export default AuthBrandHeader
