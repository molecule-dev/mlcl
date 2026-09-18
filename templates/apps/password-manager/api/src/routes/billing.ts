import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type PasswordManagerLimits, passwordManagerPlanKeys } from '../tiers.js'

export default createBillingRouter<PasswordManagerLimits>({
  getPricingTiers,
  planKeys: passwordManagerPlanKeys,
})
