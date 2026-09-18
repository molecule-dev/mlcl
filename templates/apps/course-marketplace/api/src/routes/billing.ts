import { createBillingRouter } from '@molecule/api-bonds-default-express'

import {
  type CourseMarketplaceLimits,
  courseMarketplacePlanKeys,
  getPricingTiers,
} from '../tiers.js'

export default createBillingRouter<CourseMarketplaceLimits>({
  getPricingTiers,
  planKeys: courseMarketplacePlanKeys,
})
