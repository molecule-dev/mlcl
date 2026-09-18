import { AppFooter } from '@molecule/app-footer-react'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'

export function Footer() {
  return (
    <AppFooter appName={APP_NAME} aboutHref="/about" loadContent={loadContent} legalMode="modal" />
  )
}
