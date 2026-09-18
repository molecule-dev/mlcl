import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

import { MeridianMailSidebar } from './MeridianMailSidebar.js'
import { MeridianTopBar } from './MeridianTopBar.js'

interface MeridianAppShellProps {
  children: ReactNode
  /** Hide the left mail sidebar (used on full-screen pages like Compose). */
  hideSidebar?: boolean
  /** Bumped by callers after mutations so the sidebar refetches counts. */
  refreshKey?: number
}

/**
 * Outer chrome for every signed-in Meridian page — fixed top bar,
 * sticky left mail sidebar, full-bleed content slot.
 *
 * Translated from team-chat's ChatLayout, adapted for the email-client's
 * three-pane shell.
 */
export function MeridianAppShell({
  children,
  hideSidebar = false,
  refreshKey,
}: MeridianAppShellProps) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        'h-screen bg-surface text-on-surface antialiased overflow-hidden',
      )}
    >
      <MeridianTopBar />
      <div className={cm.cn(cm.flex({}), cm.flex1, 'overflow-hidden')}>
        {!hideSidebar && <MeridianMailSidebar refreshKey={refreshKey} />}
        <main className={cm.cn(cm.flex1, 'min-w-0 overflow-hidden')}>{children}</main>
      </div>
    </div>
  )
}
