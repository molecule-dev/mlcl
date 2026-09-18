import { AppFooter } from '@molecule/app-footer-react'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'

/**
 * Shared public footer. About links to the in-app `/about` page; Privacy and
 * Terms open in-place modals (AppFooter's default `legalMode="modal"`) backed
 * by the bonded legal catalog via `loadContent`. Also carries the language
 * picker and version.
 */
export function Footer() {
  return (
    <AppFooter
      appName={APP_NAME}
      aboutHref="/about"
      loadContent={loadContent}
      dataMolId="app-footer"
    />
  )
}

export default Footer
