import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { type FlightSearchLimits, flightSearchPlanKeys, getPricingTiers } from '../tiers.js'

export default createBillingRouter<FlightSearchLimits>({
  getPricingTiers,
  planKeys: flightSearchPlanKeys,
})
