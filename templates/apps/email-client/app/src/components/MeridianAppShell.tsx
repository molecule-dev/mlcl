import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { useIsMobile } from '../lib/useIsMobile.js'
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
 * Mobile (below 768px) the sidebar becomes a slide-in drawer opened from
 * a hamburger button in the top bar: overlay click, Escape, and any
 * navigation close it. The two-pane pages keep their own list → detail
 * collapse (see Inbox / FolderView / Starred / Drafts).
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
  const isMobile = useIsMobile()
  const location = useLocation()
  const [navOpen, setNavOpen] = useState(false)

  // Any navigation (folder link, label link, search) closes the drawer.
  useEffect(() => {
    setNavOpen(false)
  }, [location.pathname, location.search])

  // Escape closes the drawer.
  useEffect(() => {
    if (!navOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNavOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [navOpen])

  const showSidebar = !hideSidebar
  const drawerOpen = showSidebar && isMobile && navOpen

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        'h-screen bg-surface text-on-surface antialiased overflow-hidden',
      )}
    >
      <MeridianTopBar onMenuClick={showSidebar && isMobile ? () => setNavOpen(true) : undefined} />
      <div className={cm.cn(cm.flex({}), cm.flex1, 'overflow-hidden')}>
        {drawerOpen && (
          <div
            role="presentation"
            onClick={() => setNavOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
            aria-hidden="true"
          />
        )}
        {showSidebar && isMobile && (
          <div
            data-mol-id="sidebar-drawer"
            className={cm.cn(
              'fixed bottom-0 left-0 top-[56px] z-50 shadow-xl transition-transform duration-200 ease-out',
              navOpen ? 'translate-x-0' : '-translate-x-full',
            )}
            aria-hidden={!navOpen}
            inert={!navOpen}
          >
            <MeridianMailSidebar
              refreshKey={refreshKey}
              onNavigate={isMobile ? () => setNavOpen(false) : undefined}
            />
          </div>
        )}
        {showSidebar && !isMobile && <MeridianMailSidebar refreshKey={refreshKey} />}
        <main className={cm.cn(cm.flex1, 'min-w-0 overflow-hidden')}>{children}</main>
      </div>
    </div>
  )
}
