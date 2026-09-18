import { LegalContentPage } from '@molecule/app-legal-pages-react'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'

/**
 * Standalone Terms of Service page. Renders the same bonded legal HTML the
 * footer modal shows, wrapped in the branded content-page shell so the
 * `/terms` route and the in-place modal stay in sync.
 *
 * @returns The rendered terms page.
 */
export function Terms() {
  return <LegalContentPage kind="terms" appName={APP_NAME} loadContent={loadContent} />
}

export default Terms
export { Terms as TermsPage }
