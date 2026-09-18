import { LegalContentPage } from '@molecule/app-legal-pages-react'

import { APP_NAME } from '../branding.js'
import { LandingFooter } from '../components/LandingFooter.js'
import { LandingTopNavBar } from '../components/LandingTopNavBar.js'
import { loadContent } from '../config.js'

export function Privacy() {
  return (
    <LegalContentPage
      kind="privacy"
      appName={APP_NAME}
      loadContent={loadContent}
      header={<LandingTopNavBar />}
      footer={<LandingFooter />}
    />
  )
}

export default Privacy
export { Privacy as PrivacyPage }
