import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { type DeliveryTrackingLimits, deliveryTrackingPlanKeys, getPricingTiers } from '../tiers.js'

export default createBillingRouter<DeliveryTrackingLimits>({
  getPricingTiers,
  planKeys: deliveryTrackingPlanKeys,
})
