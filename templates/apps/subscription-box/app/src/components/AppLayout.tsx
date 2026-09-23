import { Outlet } from 'react-router'

import { AppShellLayout } from '@molecule/app-shell-layout-react'

import { AppNav } from './AppNav.js'
import { Footer } from './Footer.js'

export function AppLayout() {
  return (
    <AppShellLayout header={<AppNav />} footer={<Footer />}>
      <Outlet />
    </AppShellLayout>
  )
}
