import type { RouteSectionProps } from '@solidjs/router'

import { AppShellLayout } from '@molecule/app-shell-layout-solid'

{{#feature footer}}
import { Footer } from './Footer.js'
{{/feature}}
import { Header } from './Header.js'

/**
 * This component is used as a nested Route element: render the routed content where the
 * page belongs — Solid Router hands a layout route its nested pages as `props.children`.
 */
export function AppLayout(props: RouteSectionProps) {
{{#feature footer}}
  return (
    <AppShellLayout header={<Header />} footer={<Footer />}>
      {props.children}
    </AppShellLayout>
  )
{{/feature}}
{{^feature footer}}
  return <AppShellLayout header={<Header />}>{props.children}</AppShellLayout>
{{/feature}}
}
