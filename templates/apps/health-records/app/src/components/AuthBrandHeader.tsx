import { AuthBrandHeader as Base } from '@molecule/app-auth-brand-header-react'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

export function AuthBrandHeader() {
  return (
    <Base
      appName={APP_NAME}
      tagline={APP_TAGLINE}
      icon="health_and_safety"
      chipGradient="linear-gradient(135deg, #0f766e, #14b8a6)"
    />
  )
}

export default AuthBrandHeader
