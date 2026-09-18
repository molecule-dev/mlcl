import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type TelemedicineLimits, telemedicinePlanKeys } from '../tiers.js'

export default createBillingRouter<TelemedicineLimits>({
  getPricingTiers,
  planKeys: telemedicinePlanKeys,
})
