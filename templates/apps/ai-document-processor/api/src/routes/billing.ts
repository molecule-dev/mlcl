import { createBillingRouter } from '@molecule/api-bonds-default-express'

import {
  type AiDocumentProcessorLimits,
  aiDocumentProcessorPlanKeys,
  getPricingTiers,
} from '../tiers.js'

export default createBillingRouter<AiDocumentProcessorLimits>({
  getPricingTiers,
  planKeys: aiDocumentProcessorPlanKeys,
})
