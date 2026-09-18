import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type SpreadsheetLimits, spreadsheetPlanKeys } from '../tiers.js'

export default createBillingRouter<SpreadsheetLimits>({
  getPricingTiers,
  planKeys: spreadsheetPlanKeys,
})
