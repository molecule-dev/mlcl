import { createBillingRouter } from '@molecule/api-bonds-default-express'

import {
  type CustomerSupportChatLimits,
  customerSupportChatPlanKeys,
  getPricingTiers,
} from '../tiers.js'

export default createBillingRouter<CustomerSupportChatLimits>({
  getPricingTiers,
  planKeys: customerSupportChatPlanKeys,
})
