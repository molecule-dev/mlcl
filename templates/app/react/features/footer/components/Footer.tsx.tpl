import { AppFooter } from '@molecule/app-footer-react'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'

export function Footer() {
  // The "About" link points at the in-app /about page (every app ships one), NOT
  // at an external URL. WEBSITE_URL in branding.ts is your public/marketing site,
  // surfaced on the About page itself — it is not the About link.
  return <AppFooter appName={APP_NAME} aboutHref="/about" loadContent={loadContent} />
}
