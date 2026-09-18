import { LegalContentPage } from '@molecule/app-legal-pages-react'

import { APP_NAME } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { LoginFooter } from '../components/LoginFooter.js'
import { loadContent } from '../config.js'

/**
 * Public terms of service page — renders the SAME bonded legal content the
 * footer modal shows, wrapped in the app's public chrome.
 *
 * @returns The rendered terms of service page.
 */
export function Terms() {
  return (
    <LegalContentPage
      kind="terms"
      appName={APP_NAME}
      loadContent={loadContent}
      header={<AuthBrandHeader />}
      footer={<LoginFooter />}
    />
  )
}

export default Terms
export { Terms as TermsPage }
