import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { type BankingDashboardLimits, bankingDashboardPlanKeys, getPricingTiers } from '../tiers.js'

export default createBillingRouter<BankingDashboardLimits>({
  getPricingTiers,
  planKeys: bankingDashboardPlanKeys,
})
