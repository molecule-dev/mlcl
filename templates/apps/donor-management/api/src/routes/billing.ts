import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { type DonorManagementLimits, donorManagementPlanKeys, getPricingTiers } from '../tiers.js'

export default createBillingRouter<DonorManagementLimits>({
  getPricingTiers,
  planKeys: donorManagementPlanKeys,
})
