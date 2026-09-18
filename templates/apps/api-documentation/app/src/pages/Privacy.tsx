import { LegalContentPage } from '@molecule/app-legal-pages-react'

import { APP_NAME } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { LoginFooter } from '../components/LoginFooter.js'
import { loadContent } from '../config.js'

/**
 * Public privacy policy page — renders the SAME bonded legal content the
 * footer modal shows, wrapped in the app's public chrome.
 *
 * @returns The rendered privacy policy page.
 */
export function Privacy() {
  return (
    <LegalContentPage
      kind="privacy"
      appName={APP_NAME}
      loadContent={loadContent}
      header={<AuthBrandHeader />}
      footer={<LoginFooter />}
    />
  )
}

export default Privacy
export { Privacy as PrivacyPage }
