import type { ReactNode } from 'react'
import { matchRoutes, useLocation } from 'react-router'

import { AppShellLayout } from '@molecule/app-shell-layout-react'

import { Footer } from './Footer.js'
import { Header } from './Header.js'
import type { AppRoute } from './AuthGuard.js'

/**
 * Entry-point shell around every page, including public pages. Keep it outside
 * the page route tree: access policy does not decide whether navigation exists.
 * A route with `layout: 'none'` owns its full layout, including any descendants.
 * This component takes explicit children; it is not a nested Route element.
 */
export function AppLayout({
  children,
  routes,
}: {
  children: ReactNode
  routes: AppRoute[]
}): ReactNode {
  const location = useLocation()
  const branch = matchRoutes(routes, location)
  if (branch?.some(({ route }) => route.layout === 'none')) return children

  return (
    <AppShellLayout header={<Header />} footer={<Footer />}>
      {children}
    </AppShellLayout>
  )
}
