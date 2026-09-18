import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type PersonalFinanceLimits, personalFinancePlanKeys } from '../tiers.js'

export default createBillingRouter<PersonalFinanceLimits>({
  getPricingTiers,
  planKeys: personalFinancePlanKeys,
})
