import { Outlet } from 'react-router'

import { AppShellLayout } from '@molecule/app-shell-layout-react'

import { Footer } from './Footer.js'
import { Header } from './Header.js'

/**
 * This component is used as a nested Route element: render <Outlet /> where the page belongs.
 * React Router does not pass nested route elements as children; replacing Outlet with a
 * children prop leaves every page empty while the header and footer still render.
 */
export function AppLayout() {
  return (
    <AppShellLayout header={<Header />} footer={<Footer />}>
      <Outlet />
    </AppShellLayout>
  )
}
