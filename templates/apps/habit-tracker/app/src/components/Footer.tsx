import { AppFooter } from '@molecule/app-footer-react'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'

/**
 * Public site footer.
 *
 * Uses the shared {@link AppFooter} so the About link routes to `/about`
 * and the Privacy / Terms links open the bonded legal copy in an in-place
 * modal (the default `legalMode`), kept in sync with the standalone
 * `/privacy` and `/terms` pages via the same `loadContent` bond.
 */
export function Footer() {
  return <AppFooter appName={APP_NAME} aboutHref="/about" loadContent={loadContent} />
}

export default Footer
