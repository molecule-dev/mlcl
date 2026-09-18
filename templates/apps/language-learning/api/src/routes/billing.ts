import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type LanguageLearningLimits, languageLearningPlanKeys } from '../tiers.js'

export default createBillingRouter<LanguageLearningLimits>({
  getPricingTiers,
  planKeys: languageLearningPlanKeys,
})
