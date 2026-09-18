import { LegalContentPage } from '@molecule/app-legal-pages-react'

import { APP_NAME } from '../branding.js'
import { PublicFooter } from '../components/PublicFooter.js'
import { PublicNav } from '../components/PublicNav.js'
import { loadContent } from '../config.js'

export function Terms() {
  return (
    <LegalContentPage
      kind="terms"
      appName={APP_NAME}
      loadContent={loadContent}
      header={<PublicNav />}
      footer={<PublicFooter />}
    />
  )
}

export default Terms
export { Terms as TermsPage }
