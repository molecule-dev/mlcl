import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type VirtualClassroomLimits, virtualClassroomPlanKeys } from '../tiers.js'

export default createBillingRouter<VirtualClassroomLimits>({
  getPricingTiers,
  planKeys: virtualClassroomPlanKeys,
})
