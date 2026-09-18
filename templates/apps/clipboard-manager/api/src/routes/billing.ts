import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { type ClipboardManagerLimits, clipboardManagerPlanKeys, getPricingTiers } from '../tiers.js'

export default createBillingRouter<ClipboardManagerLimits>({
  getPricingTiers,
  planKeys: clipboardManagerPlanKeys,
})
