import { Outlet } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { AulaSideNav } from './AulaSideNav.js'
import { AulaTopBar } from './AulaTopBar.js'

/**
 * Authenticated dashboard shell — fixed left sidebar (260px), sticky
 * top bar (64px), padded content area.
 *
 * Pattern source: lms/Dashboard.tsx (ml-[260px] pt-24 main offset).
 */
export function VirtualClassroomLayout() {
  const cm = getClassMap()
  return (
    <div className={cm.cn('min-h-screen bg-background text-on-surface antialiased')}>
      <AulaSideNav />
      <AulaTopBar />
      <main className={cm.cn(cm.sp('px', 8), cm.sp('pb', 12), 'ml-[260px] pt-24')}>
        <Outlet />
      </main>
    </div>
  )
}

export default VirtualClassroomLayout
