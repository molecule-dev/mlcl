import { AuthBrandHeader as Base } from '@molecule/app-auth-brand-header-react'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

/**
 * Local wrapper around @molecule/app-auth-brand-header-react that pins
 * the brand identity (app name, default tagline, icon) but lets each
 * auth page override the tagline with page-specific copy via the
 * `subtitle` prop.
 */
export function AuthBrandHeader({ subtitle }: { subtitle?: string } = {}) {
  return <Base appName={APP_NAME} tagline={subtitle ?? APP_TAGLINE} icon="check_circle" />
}

export default AuthBrandHeader
