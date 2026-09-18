import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type PhotoSharingLimits, photoSharingPlanKeys } from '../tiers.js'

export default createBillingRouter<PhotoSharingLimits>({
  getPricingTiers,
  planKeys: photoSharingPlanKeys,
})
