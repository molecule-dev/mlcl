import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { type ApiDocumentationLimits, apiDocumentationPlanKeys, getPricingTiers } from '../tiers.js'

export default createBillingRouter<ApiDocumentationLimits>({
  getPricingTiers,
  planKeys: apiDocumentationPlanKeys,
})
