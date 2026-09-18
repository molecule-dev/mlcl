import { createBillingRouter } from '@molecule/api-bonds-default-express'

import {
  type AiWorkflowAutomatorLimits,
  aiWorkflowAutomatorPlanKeys,
  getPricingTiers,
} from '../tiers.js'

export default createBillingRouter<AiWorkflowAutomatorLimits>({
  getPricingTiers,
  planKeys: aiWorkflowAutomatorPlanKeys,
})
