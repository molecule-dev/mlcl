import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { type AiImageGeneratorLimits, aiImageGeneratorPlanKeys, getPricingTiers } from '../tiers.js'

export default createBillingRouter<AiImageGeneratorLimits>({
  getPricingTiers,
  planKeys: aiImageGeneratorPlanKeys,
})
