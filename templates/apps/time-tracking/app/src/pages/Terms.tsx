import { LegalContentPage } from '@molecule/app-legal-pages-react'

import { APP_NAME } from '../branding.js'
import { PublicPageFooter } from '../components/PublicPageFooter.js'
import { PublicTopNav } from '../components/PublicTopNav.js'
import { loadContent } from '../config.js'

export function Terms() {
  return (
    <LegalContentPage
      kind="terms"
      appName={APP_NAME}
      loadContent={loadContent}
      header={<PublicTopNav />}
      footer={<PublicPageFooter />}
    />
  )
}

export default Terms
export { Terms as TermsPage }
