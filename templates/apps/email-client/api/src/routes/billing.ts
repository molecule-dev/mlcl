import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { type EmailClientLimits, emailClientPlanKeys, getPricingTiers } from '../tiers.js'

export default createBillingRouter<EmailClientLimits>({
  getPricingTiers,
  planKeys: emailClientPlanKeys,
})
