import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { type AiDataAnalystLimits, aiDataAnalystPlanKeys, getPricingTiers } from '../tiers.js'

export default createBillingRouter<AiDataAnalystLimits>({
  getPricingTiers,
  planKeys: aiDataAnalystPlanKeys,
})
