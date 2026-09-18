import { createBillingRouter } from '@molecule/api-bonds-default-express'

import {
  getPricingTiers,
  type InventoryManagementLimits,
  inventoryManagementPlanKeys,
} from '../tiers.js'

export default createBillingRouter<InventoryManagementLimits>({
  getPricingTiers,
  planKeys: inventoryManagementPlanKeys,
})
