import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { type AiChatbotBuilderLimits, aiChatbotBuilderPlanKeys, getPricingTiers } from '../tiers.js'

export default createBillingRouter<AiChatbotBuilderLimits>({
  getPricingTiers,
  planKeys: aiChatbotBuilderPlanKeys,
})
