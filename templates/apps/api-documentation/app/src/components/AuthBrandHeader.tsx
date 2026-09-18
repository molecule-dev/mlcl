import { AuthBrandHeader as BrandHeader } from '@molecule/app-auth-brand-header-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE, BRAND_COLOR } from '../branding.js'

/**
 * §13.7 Variant E — wordmark only with a single highlight character.
 * Prism brand: dev-tools dark slate + emerald. Composes the shared
 * AuthBrandHeader shell; the accent wordmark + slate tagline are
 * bespoke and passed as children.
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
          cm.fontWeight('extrabold'),
          'tracking-tight text-white',
        )}
      >
        {name === 'Prism' ? (
          <>
            Pr
            <span style={{ color: BRAND_COLOR, textShadow: `0 0 12px ${BRAND_COLOR}80` }}>i</span>
            sm
          </>
        ) : (
          name
        )}
      </h1>
      <p
        className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}
        style={{ color: 'var(--mol-color-text-tertiary)' }}
      >
        {subtitle || t('authBrandHeader.tagline', {}, { defaultValue: APP_TAGLINE })}
      </p>
    </BrandHeader>
  )
}

export default AuthBrandHeader
