import { createBillingRouter } from '@molecule/api-bonds-default-express'

import {
  getPricingTiers,
  type MedicationReminderLimits,
  medicationReminderPlanKeys,
} from '../tiers.js'

export default createBillingRouter<MedicationReminderLimits>({
  getPricingTiers,
  planKeys: medicationReminderPlanKeys,
})
