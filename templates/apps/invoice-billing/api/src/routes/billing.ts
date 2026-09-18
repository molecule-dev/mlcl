import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type InvoiceBillingLimits, invoiceBillingPlanKeys } from '../tiers.js'

export default createBillingRouter<InvoiceBillingLimits>({
  getPricingTiers,
  planKeys: invoiceBillingPlanKeys,
})
