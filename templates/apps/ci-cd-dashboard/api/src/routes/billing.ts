import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { type CiCdDashboardLimits, ciCdDashboardPlanKeys, getPricingTiers } from '../tiers.js'

export default createBillingRouter<CiCdDashboardLimits>({
  getPricingTiers,
  planKeys: ciCdDashboardPlanKeys,
})
