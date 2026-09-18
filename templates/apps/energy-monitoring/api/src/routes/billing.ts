import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { type EnergyMonitoringLimits, energyMonitoringPlanKeys, getPricingTiers } from '../tiers.js'

export default createBillingRouter<EnergyMonitoringLimits>({
  getPricingTiers,
  planKeys: energyMonitoringPlanKeys,
})
