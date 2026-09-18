import { LegalContentPage } from '@molecule/app-legal-pages-react'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'

export function Privacy() {
  return <LegalContentPage kind="privacy" appName={APP_NAME} loadContent={loadContent} />
}

export default Privacy
export { Privacy as PrivacyPage }
