import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { type CrmLimits, crmPlanKeys, getPricingTiers } from '../tiers.js'

export default createBillingRouter<CrmLimits>({
  getPricingTiers,
  planKeys: crmPlanKeys,
})
