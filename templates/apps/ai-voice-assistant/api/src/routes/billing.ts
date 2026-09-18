import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { type AiVoiceAssistantLimits, aiVoiceAssistantPlanKeys, getPricingTiers } from '../tiers.js'

export default createBillingRouter<AiVoiceAssistantLimits>({
  getPricingTiers,
  planKeys: aiVoiceAssistantPlanKeys,
})
