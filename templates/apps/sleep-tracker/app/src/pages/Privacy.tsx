import { LegalContentPage } from '@molecule/app-legal-pages-react'

import { APP_NAME } from '../branding.js'
import { LandingFooter } from '../components/LandingFooter.js'
import { LandingNav } from '../components/LandingNav.js'
import { loadContent } from '../config.js'

export function Privacy() {
  return (
    <LegalContentPage
      kind="privacy"
      appName={APP_NAME}
      loadContent={loadContent}
      header={<LandingNav />}
      footer={<LandingFooter />}
    />
  )
}

export default Privacy
export { Privacy as PrivacyPage }
