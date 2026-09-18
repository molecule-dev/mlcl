import { createBillingRouter } from '@molecule/api-bonds-default-express'

import {
  getPricingTiers,
  type InternalKnowledgeBaseLimits,
  internalKnowledgeBasePlanKeys,
} from '../tiers.js'

export default createBillingRouter<InternalKnowledgeBaseLimits>({
  getPricingTiers,
  planKeys: internalKnowledgeBasePlanKeys,
})
