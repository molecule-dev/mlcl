import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { type DailyPuzzleLimits, dailyPuzzlePlanKeys, getPricingTiers } from '../tiers.js'

export default createBillingRouter<DailyPuzzleLimits>({
  getPricingTiers,
  planKeys: dailyPuzzlePlanKeys,
})
