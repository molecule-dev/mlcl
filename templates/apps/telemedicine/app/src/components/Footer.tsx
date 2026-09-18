import { AppFooter } from '@molecule/app-footer-react'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'

export function Footer() {
  // legalMode="route" because this app renders Privacy and Terms on their own
  // routes (App.tsx). AppFooter defaults to modal, which rendered <button>s and
  // left both pages unreachable from the footer.
  return (
    <AppFooter appName={APP_NAME} aboutHref="/about" legalMode="route" loadContent={loadContent} />
  )
}
