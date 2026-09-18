import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { type DesignCanvasLimits, designCanvasPlanKeys, getPricingTiers } from '../tiers.js'

export default createBillingRouter<DesignCanvasLimits>({
  getPricingTiers,
  planKeys: designCanvasPlanKeys,
})
