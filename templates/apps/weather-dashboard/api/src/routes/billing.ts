import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type WeatherDashboardLimits, weatherDashboardPlanKeys } from '../tiers.js'

export default createBillingRouter<WeatherDashboardLimits>({
  getPricingTiers,
  planKeys: weatherDashboardPlanKeys,
})
