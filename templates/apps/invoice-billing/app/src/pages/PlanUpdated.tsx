import { PlanUpdated as PlanUpdatedPage } from '@molecule/app-plan-updated-page-react'

/**
 * /plan-updated — post-purchase confirmation, rendered inside the authed
 * RemitLayout shell (it's an AuthGuard + RemitLayout child route, so the
 * sidebar/topbar are already provided — this page renders only the body,
 * like Dashboard and the other in-shell pages, never its own Header/Footer).
 *
 * Uses the shared `@molecule/app-plan-updated-page-react` package: it reads
 * auth state via `useAuth` (no API write on mount), renders two `<h2>`
 * headings (confirmation + thank-you) and a Return Home `<Button>`. The
 * Return Home action points at this app's authed home, `/dashboard`.
 */
export function PlanUpdated() {
  return <PlanUpdatedPage actionHref="/dashboard" />
}

export default PlanUpdated
