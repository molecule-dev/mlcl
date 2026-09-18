import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type MusicDawLimits, musicDawPlanKeys } from '../tiers.js'

export default createBillingRouter<MusicDawLimits>({
  getPricingTiers,
  planKeys: musicDawPlanKeys,
})
