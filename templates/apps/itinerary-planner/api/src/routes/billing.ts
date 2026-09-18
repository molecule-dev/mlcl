import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type ItineraryPlannerLimits, itineraryPlannerPlanKeys } from '../tiers.js'

export default createBillingRouter<ItineraryPlannerLimits>({
  getPricingTiers,
  planKeys: itineraryPlannerPlanKeys,
})
