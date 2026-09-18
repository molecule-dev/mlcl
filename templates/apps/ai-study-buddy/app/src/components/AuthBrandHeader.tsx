import { AuthBrandHeader as Base } from '@molecule/app-auth-brand-header-react'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

export function AuthBrandHeader() {
  return <Base appName={APP_NAME} tagline={APP_TAGLINE} icon="lightbulb" chipShape="square" />
}

export default AuthBrandHeader
