import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type HotelBookingLimits, hotelBookingPlanKeys } from '../tiers.js'

export default createBillingRouter<HotelBookingLimits>({
  getPricingTiers,
  planKeys: hotelBookingPlanKeys,
})
