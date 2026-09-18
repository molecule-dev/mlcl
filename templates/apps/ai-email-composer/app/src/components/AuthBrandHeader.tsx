import { AuthBrandHeader as Base } from '@molecule/app-auth-brand-header-react'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

export function AuthBrandHeader({ subtitle }: { subtitle?: string }) {
  return (
    <Base
      appName={APP_NAME}
      tagline={subtitle ?? APP_TAGLINE}
      icon="stylus_note"
      chipGradient="linear-gradient(135deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 70%, #a78bfa))"
      wordmarkColor="var(--color-primary)"
    />
  )
}

export default AuthBrandHeader
