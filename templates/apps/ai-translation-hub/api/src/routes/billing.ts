import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { type AiTranslationHubLimits, aiTranslationHubPlanKeys, getPricingTiers } from '../tiers.js'

export default createBillingRouter<AiTranslationHubLimits>({
  getPricingTiers,
  planKeys: aiTranslationHubPlanKeys,
})
