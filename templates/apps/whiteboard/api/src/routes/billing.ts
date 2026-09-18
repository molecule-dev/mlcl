import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type WhiteboardLimits, whiteboardPlanKeys } from '../tiers.js'

export default createBillingRouter<WhiteboardLimits>({
  getPricingTiers,
  planKeys: whiteboardPlanKeys,
})
