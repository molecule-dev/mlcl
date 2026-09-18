import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { type ApiTestingToolLimits, apiTestingToolPlanKeys, getPricingTiers } from '../tiers.js'

export default createBillingRouter<ApiTestingToolLimits>({
  getPricingTiers,
  planKeys: apiTestingToolPlanKeys,
})
