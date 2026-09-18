import { AuthBrandHeader as Base } from '@molecule/app-auth-brand-header-react'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

export function AuthBrandHeader() {
  return (
    <Base
      appName={APP_NAME}
      tagline={APP_TAGLINE}
      icon="rocket_launch"
      chipGradient="linear-gradient(135deg, #0891b2, #0e7490)"
    />
  )
}

export default AuthBrandHeader
