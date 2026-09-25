import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

import { SpreadsheetShell } from './SpreadsheetShell.js'

interface WorkbenchLayoutProps {
  /** Main pane content. */
  children: ReactNode
  /** Optional max-width for the inner content. Defaults to `1440px`. */
  maxWidth?: string
}

/**
 * Authenticated workbench shell — the shared `ResponsiveAppShell` (composed
 * in `SpreadsheetShell`) with routed page content on the right in a
 * constrained inner max-width, so every authenticated page renders the same
 * chrome.
 */
export function WorkbenchLayout({ children, maxWidth = '1440px' }: WorkbenchLayoutProps) {
  const cm = getClassMap()
  return (
    <SpreadsheetShell>
      <div
        className={cm.cn(cm.sp('px', 4), 'md:px-8 md:py-10 py-6', cm.stack(8))}
        style={{ maxWidth }}
      >
        {children}
      </div>
    </SpreadsheetShell>
  )
}
