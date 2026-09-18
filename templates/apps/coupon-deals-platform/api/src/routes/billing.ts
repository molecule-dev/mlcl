import { createBillingRouter } from '@molecule/api-bonds-default-express'

import {
  type CouponDealsPlatformLimits,
  couponDealsPlatformPlanKeys,
  getPricingTiers,
} from '../tiers.js'

export default createBillingRouter<CouponDealsPlatformLimits>({
  getPricingTiers,
  planKeys: couponDealsPlatformPlanKeys,
})
