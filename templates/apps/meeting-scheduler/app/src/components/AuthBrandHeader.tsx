import { AuthBrandHeader as Base } from '@molecule/app-auth-brand-header-react'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

export function AuthBrandHeader() {
  return (
    <Base
      appName={APP_NAME}
      tagline={APP_TAGLINE}
      icon="schedule"
      chipGradient="linear-gradient(135deg, var(--color-primary), var(--color-primary-gradient-to))"
      wordmarkColor="var(--color-primary-hover)"
    />
  )
}

export default AuthBrandHeader
