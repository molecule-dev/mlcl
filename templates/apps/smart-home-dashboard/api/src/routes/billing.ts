import { createBillingRouter } from '@molecule/api-bonds-default-express'

import {
  getPricingTiers,
  type SmartHomeDashboardLimits,
  smartHomeDashboardPlanKeys,
} from '../tiers.js'

export default createBillingRouter<SmartHomeDashboardLimits>({
  getPricingTiers,
  planKeys: smartHomeDashboardPlanKeys,
})
