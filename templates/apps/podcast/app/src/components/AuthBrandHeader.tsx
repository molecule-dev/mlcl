import type { JSX } from 'react'

import {
  AuthBrandHeader as Base,
  AuthBrandHeaderChip,
  AuthBrandHeaderTagline,
} from '@molecule/app-auth-brand-header-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

interface WavelengthBrandHeaderProps {
  /**
   * Render the wordmark as an `<h1>` (default). Pages that render their
   * OWN `<h1>` (e.g. Pricing's "Choose your Wavelength plan") must pass
   * `false` so the page carries exactly one `h1` — a second top-level
   * heading breaks the document outline and fails axe plus the e2e
   * strict-mode heading locators.
   */
  wordmarkAsHeading?: boolean
}

export function AuthBrandHeader({
  wordmarkAsHeading = true,
}: WavelengthBrandHeaderProps = {}): JSX.Element {
  const { t } = useTranslation()
  if (wordmarkAsHeading) {
    return <Base appName={APP_NAME} tagline={APP_TAGLINE} icon="headphones" />
  }
  // Demoted variant: identical chrome, but the wordmark is a styled
  // `<p>` so the page's real `<h1>` stays the only one.
  const cm = getClassMap()
  return (
    <Base>
      <AuthBrandHeaderChip icon="headphones" />
      <p className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tighter text-on-surface')}>
        {t('authBrandHeader.appName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
      </p>
      <AuthBrandHeaderTagline>
        {t('authBrandHeader.tagline', { tagline: APP_TAGLINE }, { defaultValue: '{{tagline}}' })}
      </AuthBrandHeaderTagline>
    </Base>
  )
}

export default AuthBrandHeader
