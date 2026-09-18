import { createBillingRouter } from '@molecule/api-bonds-default-express'

import {
  getPricingTiers,
  type WarehouseFulfillmentLimits,
  warehouseFulfillmentPlanKeys,
} from '../tiers.js'

export default createBillingRouter<WarehouseFulfillmentLimits>({
  getPricingTiers,
  planKeys: warehouseFulfillmentPlanKeys,
})
