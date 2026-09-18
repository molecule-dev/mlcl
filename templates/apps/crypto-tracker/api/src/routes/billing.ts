import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { type CryptoTrackerLimits, cryptoTrackerPlanKeys, getPricingTiers } from '../tiers.js'

export default createBillingRouter<CryptoTrackerLimits>({
  getPricingTiers,
  planKeys: cryptoTrackerPlanKeys,
})
