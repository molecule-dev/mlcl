import { AppFooter } from '@molecule/app-footer-react'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'

// `className` forwards onto the AppFooter bar so a page can tint it to match
// its own footer treatment (the Landing's rounded tinted panel passes
// bg-surface-secondary; the bar's default bg-background would otherwise paint
// a white strip across it).
export function Footer({ className }: { className?: string }) {
  return (
    <AppFooter
      appName={APP_NAME}
      aboutHref="/about"
      loadContent={loadContent}
      legalMode="modal"
      className={className}
    />
  )
}
