import { Outlet } from 'react-router'

import { AppShellLayout } from '@molecule/app-shell-layout-react'

import { Footer } from './Footer.js'
import { Header } from './Header.js'

/** Header, page, footer — the frame every route renders inside. */
export function SiteLayout() {
  return (
    <AppShellLayout header={<Header />} footer={<Footer />} dataMolId="site-layout">
      <Outlet />
    </AppShellLayout>
  )
}
