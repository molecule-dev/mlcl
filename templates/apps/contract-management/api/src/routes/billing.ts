import { createBillingRouter } from '@molecule/api-bonds-default-express'

import {
  type ContractManagementLimits,
  contractManagementPlanKeys,
  getPricingTiers,
} from '../tiers.js'

export default createBillingRouter<ContractManagementLimits>({
  getPricingTiers,
  planKeys: contractManagementPlanKeys,
})
