import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type MusicStreamingLimits, musicStreamingPlanKeys } from '../tiers.js'

export default createBillingRouter<MusicStreamingLimits>({
  getPricingTiers,
  planKeys: musicStreamingPlanKeys,
})
