import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type LogViewerLimits, logViewerPlanKeys } from '../tiers.js'

export default createBillingRouter<LogViewerLimits>({
  getPricingTiers,
  planKeys: logViewerPlanKeys,
})
