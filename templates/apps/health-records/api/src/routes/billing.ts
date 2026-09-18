import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type HealthRecordsLimits, healthRecordsPlanKeys } from '../tiers.js'

export default createBillingRouter<HealthRecordsLimits>({
  getPricingTiers,
  planKeys: healthRecordsPlanKeys,
})
