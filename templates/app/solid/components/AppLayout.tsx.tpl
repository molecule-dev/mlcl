import type { RouteSectionProps } from '@solidjs/router'

import { AppShellLayout } from '@molecule/app-shell-layout-solid'

import { Footer } from './Footer.js'
import { Header } from './Header.js'

/**
 * This component is used as a nested Route element: render the routed content where the
 * page belongs — Solid Router hands a layout route its nested pages as `props.children`.
 */
export function AppLayout(props: RouteSectionProps) {
  return (
    <AppShellLayout header={<Header />} footer={<Footer />}>
      {props.children}
    </AppShellLayout>
  )
}
