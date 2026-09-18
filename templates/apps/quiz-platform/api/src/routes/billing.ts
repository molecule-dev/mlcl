import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type QuizPlatformLimits, quizPlatformPlanKeys } from '../tiers.js'

export default createBillingRouter<QuizPlatformLimits>({
  getPricingTiers,
  planKeys: quizPlatformPlanKeys,
})
