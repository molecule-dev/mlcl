import { PlanUpdated as PlanUpdatedPage } from '@molecule/app-plan-updated-page-react'

/**
 * /plan-updated — post-purchase confirmation, rendered inside the authed
 * WeatherDashboardLayout shell (it's an AuthGuard + WeatherDashboardLayout
 * child route, so the ResponsiveAppShell's sidebar/topbar — and its single
 * page `<main>` — are already provided). This page therefore renders ONLY the
 * body, like Dashboard and the other in-shell pages: it must NOT wrap its
 * content in `ContentPageShell` (which renders a full standalone page with
 * its own Header/Footer/hero AND its own `<main>`) nor in a component that
 * emits another `<main>`. Nesting `<main>` landmarks is invalid HTML — and
 * it broke `plan-updated.spec.ts` (`page.locator('main')` matched three
 * `<main>` elements: the shell's + ContentPageShell's + the inner one).
 *
 * Uses the shared `@molecule/app-plan-updated-page-react` package: it reads
 * auth state via `useAuth` (no API write on mount), renders the two
 * confirmation `<h2>` headings (`planUpdated.message` + `planUpdated.thankYou`)
 * and a Return Home `<Button>` inside a plain `<section>` (no `<main>`). The
 * Return Home action keeps its default `actionHref="/"`, so the spec's
 * `<a href="/">` + "navigate back to /" assertions stay satisfied.
 */
export function PlanUpdated() {
  return <PlanUpdatedPage />
}

export default PlanUpdated
