import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type VideoEditorLimits, videoEditorPlanKeys } from '../tiers.js'

export default createBillingRouter<VideoEditorLimits>({
  getPricingTiers,
  planKeys: videoEditorPlanKeys,
})
