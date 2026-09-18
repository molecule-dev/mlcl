import { createBillingRouter } from '@molecule/api-bonds-default-express'

import {
  getPricingTiers,
  type PresentationBuilderLimits,
  presentationBuilderPlanKeys,
} from '../tiers.js'

export default createBillingRouter<PresentationBuilderLimits>({
  getPricingTiers,
  planKeys: presentationBuilderPlanKeys,
})
