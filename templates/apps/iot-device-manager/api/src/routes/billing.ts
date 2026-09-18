import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type IotDeviceManagerLimits, iotDeviceManagerPlanKeys } from '../tiers.js'

export default createBillingRouter<IotDeviceManagerLimits>({
  getPricingTiers,
  planKeys: iotDeviceManagerPlanKeys,
})
