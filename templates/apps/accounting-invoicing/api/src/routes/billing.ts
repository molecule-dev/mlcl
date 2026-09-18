import { createBillingRouter } from '@molecule/api-bonds-default-express'

import {
  type AccountingInvoicingLimits,
  accountingInvoicingPlanKeys,
  getPricingTiers,
} from '../tiers.js'

export default createBillingRouter<AccountingInvoicingLimits>({
  getPricingTiers,
  planKeys: accountingInvoicingPlanKeys,
})
