import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { type AiCodeReviewToolLimits, aiCodeReviewToolPlanKeys, getPricingTiers } from '../tiers.js'

export default createBillingRouter<AiCodeReviewToolLimits>({
  getPricingTiers,
  planKeys: aiCodeReviewToolPlanKeys,
})
