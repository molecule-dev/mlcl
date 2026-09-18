import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type ScreenSharingLimits, screenSharingPlanKeys } from '../tiers.js'

export default createBillingRouter<ScreenSharingLimits>({
  getPricingTiers,
  planKeys: screenSharingPlanKeys,
})
