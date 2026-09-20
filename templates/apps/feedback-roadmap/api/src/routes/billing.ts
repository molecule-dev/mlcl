import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { type FeedbackLimits, feedbackPlanKeys, getPricingTiers } from '../tiers.js'

export default createBillingRouter<FeedbackLimits>({
  getPricingTiers,
  planKeys: feedbackPlanKeys,
})
