import { AppFooter } from '@molecule/app-footer-react'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'

export function Footer() {
  // legalMode="route" because this app renders Privacy and Terms on their own
  // routes (App.tsx, with their own specs). AppFooter defaults to modal, which
  // left both pages unreachable from the footer and made 24 specs across 12
  // files — every one asserting the footer link navigates — fail on a <button>.
  return (
    <AppFooter appName={APP_NAME} aboutHref="/about" legalMode="route" loadContent={loadContent} />
  )
}
