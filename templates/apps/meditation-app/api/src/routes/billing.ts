import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type MeditationAppLimits, meditationAppPlanKeys } from '../tiers.js'

export default createBillingRouter<MeditationAppLimits>({
  getPricingTiers,
  planKeys: meditationAppPlanKeys,
})
