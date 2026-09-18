import { Outlet } from 'react-router'

import { AppShellLayout } from '@molecule/app-shell-layout-react'

import { Footer } from './Footer.js'
import { Header } from './Header.js'

export function AppLayout() {
  return (
    <AppShellLayout header={<Header />} footer={<Footer />}>
      <Outlet />
    </AppShellLayout>
  )
}
