import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { type FamilyTreeLimits, familyTreePlanKeys, getPricingTiers } from '../tiers.js'

export default createBillingRouter<FamilyTreeLimits>({
  getPricingTiers,
  planKeys: familyTreePlanKeys,
})
