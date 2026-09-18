import { getClassMap } from '@molecule/app-ui'

import LeadCard from './LeadCard.js'
import LeadsTableHeader from './LeadsTableHeader.js'
import LostLeadCard from './LostLeadCard.js'

export default function AgentLeadsTable() {
  const cm = getClassMap()
  return (
    <section className={cm.stack(4)}>
      {/* Table Header (Labels Only) */}
      <LeadsTableHeader />
      <LeadCard />

      {/* Susan Wright */}
      <LeadCard />
      <LostLeadCard />
    </section>
  )
}
export { AgentLeadsTable }
