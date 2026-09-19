import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type NewsletterLimits, newsletterPlanKeys } from '../tiers.js'

export default createBillingRouter<NewsletterLimits>({
  getPricingTiers,
  planKeys: newsletterPlanKeys,
})
