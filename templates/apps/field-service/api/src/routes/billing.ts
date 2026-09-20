import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { type FieldServiceLimits, fieldServicePlanKeys, getPricingTiers } from '../tiers.js'

export default createBillingRouter<FieldServiceLimits>({
  getPricingTiers,
  planKeys: fieldServicePlanKeys,
})
