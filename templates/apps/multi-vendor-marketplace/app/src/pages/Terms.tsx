import { LegalContentPage } from '@molecule/app-legal-pages-react'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'

export function Terms() {
  return <LegalContentPage kind="terms" appName={APP_NAME} loadContent={loadContent} />
}

export default Terms
export { Terms as TermsPage }
