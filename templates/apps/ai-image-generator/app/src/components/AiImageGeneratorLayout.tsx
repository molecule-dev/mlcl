import type { ReactNode } from 'react'
import { Outlet } from 'react-router'

import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { useAiImageGeneratorNav } from './AiImageGeneratorSidebar.js'
import { BrandLogo } from './BrandLogo.js'

export interface AiImageGeneratorLayoutProps {
  /** Optional override for content; if omitted the router `<Outlet>` is rendered. */
  children?: ReactNode
}

/**
 * Signed-in shell — the shared `ResponsiveAppShell`: brand top bar with the
 * mobile menu trigger, a desktop sidebar (≥768px), a dialog drawer (<768px)
 * and one content column. Pages render their own `AiImageGeneratorTopBar` so
 * each route controls its title, subtitle and actions independently; the
 * drawer auto-closes on navigation, Escape and backdrop tap inside the shell.
 */
export function AiImageGeneratorLayout({ children }: AiImageGeneratorLayoutProps) {
  const { nav, footer } = useAiImageGeneratorNav()

  return (
    <ResponsiveAppShell sidebarWidth="lg" className="bg-surface text-on-surface antialiased">
      <ResponsiveAppShell.TopBar mobileOnly brand={<BrandLogo showTagline={false} />} />
      <ResponsiveAppShell.Sidebar className="bg-surface-container-low" footer={footer}>
        {nav}
      </ResponsiveAppShell.Sidebar>
      <ResponsiveAppShell.Drawer
        className="bg-surface-container-low shadow-2xl"
        header={<BrandLogo showTagline={false} />}
        footer={footer}
      >
        {nav}
      </ResponsiveAppShell.Drawer>
      <ResponsiveAppShell.Content>{children ?? <Outlet />}</ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}
