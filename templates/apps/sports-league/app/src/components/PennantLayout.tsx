import { AppShell } from './AppShell.js'

/**
 * Pennant dashboard shell — the app's navigation chrome wrapped around the
 * outlet so each authed page renders inside the standings/teams/stats
 * navigation.
 *
 * Delegates to AppShell, which renders the shared SidebarLayout from 768px
 * up and a template-local mobile shell (sticky top bar + drawer) below it —
 * the shared sidebar has a fixed 240px aside and no mobile collapse.
 */
export function PennantLayout() {
  return <AppShell />
}
