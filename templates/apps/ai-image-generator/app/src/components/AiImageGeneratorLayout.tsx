import type { ReactNode } from 'react'
import { Outlet } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { AiImageGeneratorSidebar } from './AiImageGeneratorSidebar.js'

export interface AiImageGeneratorLayoutProps {
  /** Optional override for content; if omitted the router `<Outlet>` is rendered. */
  children?: ReactNode
}

/**
 * Signed-in shell — sidebar + scrollable content column. Pages render their own
 * `AiImageGeneratorTopBar` so each route controls its title, subtitle and
 * actions independently.
 */
export function AiImageGeneratorLayout({ children }: AiImageGeneratorLayoutProps) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(cm.flex({}), cm.minH('screen'), 'bg-surface text-on-surface antialiased')}
    >
      <AiImageGeneratorSidebar />
      <div className={cm.cn(cm.flex({ direction: 'col' }), 'flex-1 md:ml-64 min-w-0')}>
        {children ?? <Outlet />}
      </div>
    </div>
  )
}
