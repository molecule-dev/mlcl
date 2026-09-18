import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { PlanUpdated as PlanUpdatedShared } from '@molecule/app-plan-updated-page-react'

import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

export function PlanUpdated() {
  // The inner <PlanUpdatedShared /> owns the "plan updated" + "Thank you"
  // headings and the Return-home action, so the shell intentionally omits
  // `title`/`subtitle` (which would render duplicate headings with the same
  // text — a strict-mode locator violation). Omitting `title` also skips the
  // hero band; the shared component is a complete, centered confirmation.
  return (
    <ContentPageShell dataMolId="page-plan-updated" header={<Header />} footer={<Footer />}>
      <PlanUpdatedShared />
    </ContentPageShell>
  )
}

export default PlanUpdated
