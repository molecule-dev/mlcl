import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { type FlashcardAppLimits, flashcardAppPlanKeys, getPricingTiers } from '../tiers.js'

export default createBillingRouter<FlashcardAppLimits>({
  getPricingTiers,
  planKeys: flashcardAppPlanKeys,
})
