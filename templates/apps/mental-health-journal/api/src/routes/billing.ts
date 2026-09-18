import { createBillingRouter } from '@molecule/api-bonds-default-express'

import {
  getPricingTiers,
  type MentalHealthJournalLimits,
  mentalHealthJournalPlanKeys,
} from '../tiers.js'

export default createBillingRouter<MentalHealthJournalLimits>({
  getPricingTiers,
  planKeys: mentalHealthJournalPlanKeys,
})
