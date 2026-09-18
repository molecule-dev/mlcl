import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import AssetAllocationCard from '../components/AssetAllocationCard.js'
import NetWorthCard from '../components/NetWorthCard.js'

function DashboardHeroSection() {
  const cm = getClassMap()
  return (
    <section className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'lg:grid-cols-12 items-stretch')}>
      <Link to="/accounts" className={cm.cn('contents')} onClick={(e) => e.stopPropagation()}>
        <NetWorthCard />
      </Link>
      <Link to="/accounts" className={cm.cn('contents')} onClick={(e) => e.stopPropagation()}>
        <AssetAllocationCard />
      </Link>
    </section>
  )
}

export default DashboardHeroSection
export { DashboardHeroSection }
