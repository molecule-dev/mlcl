import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { type AiEmailComposerLimits, aiEmailComposerPlanKeys, getPricingTiers } from '../tiers.js'

export default createBillingRouter<AiEmailComposerLimits>({
  getPricingTiers,
  planKeys: aiEmailComposerPlanKeys,
})
