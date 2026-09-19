import { AuthBrandHeader as Base } from '@molecule/app-auth-brand-header-react'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

export function AuthBrandHeader() {
  return (
    <Base
      appName={APP_NAME}
      tagline={APP_TAGLINE}
      icon="account_tree"
      chipGradient="linear-gradient(135deg, #15803d, #65a30d)"
    />
  )
}

export default AuthBrandHeader
