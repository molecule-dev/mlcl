import { getClassMap } from '@molecule/app-ui'

import BotsEmptyState from './BotsEmptyState.js'
import BotsGrid from './BotsGrid.js'
import BotsListEmptyStateDivider from './BotsListEmptyStateDivider.js'
import BotsListFooter from './BotsListFooter.js'
import BotsListTopNavBar from './BotsListTopNavBar.js'

function BotsListMainContent() {
  const cm = getClassMap()
  return (
    <main
      className={cm.cn(cm.flex1, cm.flex({ direction: 'col' }), cm.minH('screen'), 'ml-[240px]')}
    >
      {/* TopNavBar (Authority: JSON) */}
      <BotsListTopNavBar />
      {/* Content Area */}
      <div className={cm.cn(cm.sp('p', 8), cm.stack(12))}>
        <BotsGrid />
        {/* Empty State Preview Divider */}
        <BotsListEmptyStateDivider />
        {/* Empty State Section */}
        <BotsEmptyState />
      </div>
      {/* System Status Footer */}
      <BotsListFooter />
    </main>
  )
}

export default BotsListMainContent
export { BotsListMainContent }
