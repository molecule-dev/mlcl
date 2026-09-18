import { getClassMap } from '@molecule/app-ui'

import CsatScoreCard from '../components/CsatScoreCard.js'
import KpiCard from '../components/KpiCard.js'
import SlaComplianceKpiCard from '../components/SlaComplianceKpiCard.js'
import TicketsThisWeekCard from '../components/TicketsThisWeekCard.js'

interface ReportsKpiProps {
  loading?: boolean
  avgResolutionTime?: string
  slaCompliance?: number
  ticketsThisWeek?: number
}
function ReportsKpiSection({
  loading,
  avgResolutionTime,
  slaCompliance,
  ticketsThisWeek,
}: ReportsKpiProps = {}) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.grid({ cols: 4, gap: 10 }))}>
      {/* KPI 1 */}
      <KpiCard value={loading ? undefined : avgResolutionTime} />
      {/* KPI 2 */}
      <SlaComplianceKpiCard value={loading ? undefined : slaCompliance} />
      {/* KPI 3 */}
      <TicketsThisWeekCard count={loading ? undefined : ticketsThisWeek} />
      {/* KPI 4 */}
      <CsatScoreCard />
    </div>
  )
}

export default ReportsKpiSection
export { ReportsKpiSection }
