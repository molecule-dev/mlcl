import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type SocialMediaLimits, socialMediaPlanKeys } from '../tiers.js'

export default createBillingRouter<SocialMediaLimits>({
  getPricingTiers,
  planKeys: socialMediaPlanKeys,
})
