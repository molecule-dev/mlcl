import { Outlet } from 'react-router'

import { AppShellLayout } from '@molecule/app-shell-layout-react'

import { Footer } from './Footer.js'
import { Header } from './Header.js'
import { MainNavLinks } from './MainNav.js'

export function AppLayout() {
  return (
    <AppShellLayout
      header={
        <>
          <Header />
          {/* Mobile primary nav: chip bar under the top bar (md and below). */}
          <MainNavLinks variant="chips" />
        </>
      }
      footer={<Footer />}
    >
      <Outlet />
    </AppShellLayout>
  )
}
