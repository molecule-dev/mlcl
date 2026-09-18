import { createBillingRouter } from '@molecule/api-bonds-default-express'

import {
  type EmployeeOnboardingLimits,
  employeeOnboardingPlanKeys,
  getPricingTiers,
} from '../tiers.js'

export default createBillingRouter<EmployeeOnboardingLimits>({
  getPricingTiers,
  planKeys: employeeOnboardingPlanKeys,
})
