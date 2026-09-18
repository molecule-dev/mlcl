import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { type AnimationToolLimits, animationToolPlanKeys, getPricingTiers } from '../tiers.js'

export default createBillingRouter<AnimationToolLimits>({
  getPricingTiers,
  planKeys: animationToolPlanKeys,
})
