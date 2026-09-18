import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { type CloudFileManagerLimits, cloudFileManagerPlanKeys, getPricingTiers } from '../tiers.js'

export default createBillingRouter<CloudFileManagerLimits>({
  getPricingTiers,
  planKeys: cloudFileManagerPlanKeys,
})
