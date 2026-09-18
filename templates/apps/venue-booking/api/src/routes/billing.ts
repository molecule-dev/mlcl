import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type VenueBookingLimits, venueBookingPlanKeys } from '../tiers.js'

export default createBillingRouter<VenueBookingLimits>({
  getPricingTiers,
  planKeys: venueBookingPlanKeys,
})
