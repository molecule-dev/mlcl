import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { AulaSideNav } from './AulaSideNav.js'
import { AulaTopBar } from './AulaTopBar.js'

/**
 * Authenticated dashboard shell — fixed left sidebar (260px), sticky
 * top bar (64px), padded content area.
 *
 * Mobile (<768px): the sidebar collapses off-canvas into a slide-in
 * drawer behind a backdrop, opened from a hamburger in the top bar; the
 * main content runs full-width. The drawer closes on route change, on
 * backdrop tap, on Escape, and via its own close button.
 *
 * Pattern source: lms/Dashboard.tsx (ml-[260px] pt-24 main offset).
 */
export function VirtualClassroomLayout() {
  const cm = getClassMap()
  const [navOpen, setNavOpen] = useState(false)
  const { pathname } = useLocation()

  // Navigating (drawer link, back button, redirect) must always dismiss
  // the mobile drawer — a drawer that survives navigation traps the user.
  useEffect(() => {
    setNavOpen(false)
  }, [pathname])

  // Escape closes the drawer while it is open.
  useEffect(() => {
    if (!navOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNavOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navOpen])

  return (
    <div className={cm.cn('min-h-screen bg-background text-on-surface antialiased')}>
      <AulaSideNav open={navOpen} onClose={() => setNavOpen(false)} />
      <AulaTopBar onMenu={() => setNavOpen(true)} />
      <main
        className={cm.cn('px-4 md:px-8', cm.sp('pb', 12), 'ml-0 md:ml-[260px]', 'pt-20 md:pt-24')}
      >
        <Outlet />
      </main>
    </div>
  )
}

export default VirtualClassroomLayout
