import { LegalContentPage } from '@molecule/app-legal-pages-react'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { PublicPageNav } from '../components/PublicPageNav.js'
import { loadContent } from '../config.js'

export function Terms() {
  return (
    <LegalContentPage
      kind="terms"
      appName={APP_NAME}
      loadContent={loadContent}
      header={<PublicPageNav />}
      footer={<Footer />}
    />
  )
}

export default Terms
export { Terms as TermsPage }
