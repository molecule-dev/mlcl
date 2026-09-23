import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

import { SpreadsheetSidebar } from './SpreadsheetSidebar.js'

interface WorkbenchLayoutProps {
  /** Main pane content. */
  children: ReactNode
  /** Optional max-width for the inner content. Defaults to `1440px`. */
  maxWidth?: string
}

/**
 * Authenticated workbench shell — `<SpreadsheetSidebar />` on the left,
 * routed page content on the right with a constrained inner max-width.
 *
 * Composes the bespoke `SpreadsheetSidebar` with a simple flex layout so
 * every authenticated page renders the same chrome.
 */
export function WorkbenchLayout({ children, maxWidth = '1440px' }: WorkbenchLayoutProps) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.flex({}),
        'flex-col md:flex-row min-h-screen bg-surface text-on-surface antialiased',
      )}
    >
      <SpreadsheetSidebar />
      <main className={cm.cn(cm.flex1, cm.flex({ direction: 'col' }), 'min-w-0')}>
        <div
          className={cm.cn(cm.sp('px', 4), 'md:px-8 md:py-10 py-6', cm.stack(8))}
          style={{ maxWidth }}
        >
          {children}
        </div>
      </main>
    </div>
  )
}
