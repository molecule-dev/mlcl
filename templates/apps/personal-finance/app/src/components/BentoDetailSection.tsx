import { getClassMap } from '@molecule/app-ui'

import CategoryAllocationChart from './CategoryAllocationChart.js'
import ConnectBankCta from './ConnectBankCta.js'

function BentoDetailSection() {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.grid({ cols: 1, gap: 'xl' }),
        'lg:grid-cols-3',
        cm.sp('p', 8),
        'rounded-3xl',
        'bg-surface-container-lowest ambient-shadow',
      )}
      data-mol-id="details-section"
    >
      <CategoryAllocationChart />
      <ConnectBankCta />
    </div>
  )
}

export default BentoDetailSection
export { BentoDetailSection }
