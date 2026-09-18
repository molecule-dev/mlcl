import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type PhotoEditorLimits, photoEditorPlanKeys } from '../tiers.js'

export default createBillingRouter<PhotoEditorLimits>({
  getPricingTiers,
  planKeys: photoEditorPlanKeys,
})
