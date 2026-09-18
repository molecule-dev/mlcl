import { LegalContentPage } from '@molecule/app-legal-pages-react'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { PublicTopNav } from '../components/PublicTopNav.js'
import { loadContent } from '../config.js'

export function Privacy() {
  return (
    <LegalContentPage
      kind="privacy"
      appName={APP_NAME}
      loadContent={loadContent}
      header={<PublicTopNav />}
      footer={<Footer />}
    />
  )
}

export default Privacy
export { Privacy as PrivacyPage }
