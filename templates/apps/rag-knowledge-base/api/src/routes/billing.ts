import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type RagKnowledgeBaseLimits, ragKnowledgeBasePlanKeys } from '../tiers.js'

export default createBillingRouter<RagKnowledgeBaseLimits>({
  getPricingTiers,
  planKeys: ragKnowledgeBasePlanKeys,
})
