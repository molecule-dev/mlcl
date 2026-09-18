import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type KanbanBoardLimits, kanbanBoardPlanKeys } from '../tiers.js'

export default createBillingRouter<KanbanBoardLimits>({
  getPricingTiers,
  planKeys: kanbanBoardPlanKeys,
})
