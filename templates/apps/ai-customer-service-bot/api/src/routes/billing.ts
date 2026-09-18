import { createBillingRouter } from '@molecule/api-bonds-default-express'

import {
  type AiCustomerServiceBotLimits,
  aiCustomerServiceBotPlanKeys,
  getPricingTiers,
} from '../tiers.js'

export default createBillingRouter<AiCustomerServiceBotLimits>({
  getPricingTiers,
  planKeys: aiCustomerServiceBotPlanKeys,
})
