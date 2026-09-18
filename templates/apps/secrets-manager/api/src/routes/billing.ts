import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type SecretsManagerLimits, secretsManagerPlanKeys } from '../tiers.js'

export default createBillingRouter<SecretsManagerLimits>({
  getPricingTiers,
  planKeys: secretsManagerPlanKeys,
})
