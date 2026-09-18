import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type RestaurantReviewLimits, restaurantReviewPlanKeys } from '../tiers.js'

export default createBillingRouter<RestaurantReviewLimits>({
  getPricingTiers,
  planKeys: restaurantReviewPlanKeys,
})
