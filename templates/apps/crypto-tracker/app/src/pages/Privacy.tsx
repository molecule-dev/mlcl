import { LegalContentPage } from '@molecule/app-legal-pages-react'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'

/**
 * Standalone Privacy policy page. Renders the same bonded legal HTML the
 * footer modal shows, wrapped in the branded content-page shell so the
 * `/privacy` route and the in-place modal stay in sync.
 *
 * @returns The rendered privacy page.
 */
export function Privacy() {
  return <LegalContentPage kind="privacy" appName={APP_NAME} loadContent={loadContent} />
}

export default Privacy
export { Privacy as PrivacyPage }
