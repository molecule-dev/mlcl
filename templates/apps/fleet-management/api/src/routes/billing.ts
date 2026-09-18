import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { type FleetManagementLimits, fleetManagementPlanKeys, getPricingTiers } from '../tiers.js'

export default createBillingRouter<FleetManagementLimits>({
  getPricingTiers,
  planKeys: fleetManagementPlanKeys,
})
