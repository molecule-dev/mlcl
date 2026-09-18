import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { type DatabaseAdminLimits, databaseAdminPlanKeys, getPricingTiers } from '../tiers.js'

export default createBillingRouter<DatabaseAdminLimits>({
  getPricingTiers,
  planKeys: databaseAdminPlanKeys,
})
