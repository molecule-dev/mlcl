import { getClassMap } from '@molecule/app-ui'

import GpaCard from './GpaCard.js'
import GradeTrendCard from './GradeTrendCard.js'

type Grade = Record<string, unknown>

function GradeSummaryGrid({ grades = [] }: { grades?: Grade[] }) {
  const cm = getClassMap()
  const totalScore = grades.reduce((sum, g) => sum + (Number(g.score) || 0), 0)
  const totalMax = grades.reduce((sum, g) => sum + (Number(g.max_score) || 0), 0)
  const gpa = totalMax > 0 ? ((totalScore / totalMax) * 4).toFixed(1) : null
  const barData = grades.slice(0, 8).map((g) => {
    const s = Number(g.score) || 0
    const m = Number(g.max_score) || 1
    return Math.round((s / m) * 100)
  })

  return (
    <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'md:grid-cols-3')}>
      {/* Overall GPA Card */}
      <GpaCard gpa={gpa} />
      {/* Grade Trend Card */}
      <GradeTrendCard barData={barData} />
    </div>
  )
}

export default GradeSummaryGrid
export { GradeSummaryGrid }
