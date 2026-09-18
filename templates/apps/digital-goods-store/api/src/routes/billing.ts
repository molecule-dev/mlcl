import { createBillingRouter } from '@molecule/api-bonds-default-express'

import {
  type DigitalGoodsStoreLimits,
  digitalGoodsStorePlanKeys,
  getPricingTiers,
} from '../tiers.js'

export default createBillingRouter<DigitalGoodsStoreLimits>({
  getPricingTiers,
  planKeys: digitalGoodsStorePlanKeys,
})
