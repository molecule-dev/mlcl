import { AuthBrandHeader as Base } from '@molecule/app-auth-brand-header-react'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

export function AuthBrandHeader() {
  return (
    <Base
      appName={APP_NAME}
      tagline={APP_TAGLINE}
      icon="account_balance"
      chipGradient="linear-gradient(135deg, var(--color-primary-container, #1e3a8a), var(--color-primary, #1e40af))"
      wordmarkColor="var(--color-primary, #1e40af)"
    />
  )
}

export default AuthBrandHeader
