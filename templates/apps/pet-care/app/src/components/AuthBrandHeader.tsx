import { AuthBrandHeader as Base } from '@molecule/app-auth-brand-header-react'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

export function AuthBrandHeader() {
  return (
    <Base
      appName={APP_NAME}
      tagline={APP_TAGLINE}
      icon="pets"
      chipGradient="linear-gradient(135deg, var(--mol-color-primary), var(--mol-color-secondary))"
    />
  )
}

export default AuthBrandHeader
