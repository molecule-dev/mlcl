import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type PetCareLimits, petCarePlanKeys } from '../tiers.js'

export default createBillingRouter<PetCareLimits>({
  getPricingTiers,
  planKeys: petCarePlanKeys,
})
