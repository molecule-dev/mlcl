import { AuthBrandHeader as Base } from '@molecule/app-auth-brand-header-react'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

export function AuthBrandHeader() {
  return (
    <Base
      appName={APP_NAME}
      tagline={APP_TAGLINE}
      icon="medication"
      chipGradient="linear-gradient(135deg, var(--color-primary), var(--color-secondary))"
    />
  )
}

export default AuthBrandHeader
