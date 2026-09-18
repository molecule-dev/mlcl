import { Outlet } from 'react-router'

import { AppShellLayout } from '@molecule/app-shell-layout-react'
import { getClassMap } from '@molecule/app-ui'

import { Footer } from './Footer.js'
import { Header } from './Header.js'

export function AppLayout() {
  const cm = getClassMap()
  return (
    <AppShellLayout header={<Header />} footer={<Footer />} mainClassName={cm.cn(cm.sp('py', 8))}>
      <Outlet />
    </AppShellLayout>
  )
}
