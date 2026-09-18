import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type TravelBookingLimits, travelBookingPlanKeys } from '../tiers.js'

export default createBillingRouter<TravelBookingLimits>({
  getPricingTiers,
  planKeys: travelBookingPlanKeys,
})
