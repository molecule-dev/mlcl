import { AuthBrandHeader as Base } from '@molecule/app-auth-brand-header-react'

import { APP_NAME, APP_TAGLINE, BRAND_COLOR } from '../branding.js'

export function AuthBrandHeader() {
  return (
    <Base
      appName={APP_NAME}
      tagline={APP_TAGLINE}
      icon="call_split"
      chipGradient={`linear-gradient(135deg, ${BRAND_COLOR}, var(--color-gradient-end, ${BRAND_COLOR}))`}
      wordmarkColor={BRAND_COLOR}
    />
  )
}

export default AuthBrandHeader
