import { createBillingRouter } from '@molecule/api-bonds-default-express'

import {
  getPricingTiers,
  type MultiVendorMarketplaceLimits,
  multiVendorMarketplacePlanKeys,
} from '../tiers.js'

export default createBillingRouter<MultiVendorMarketplaceLimits>({
  getPricingTiers,
  planKeys: multiVendorMarketplacePlanKeys,
})
