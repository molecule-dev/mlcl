import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type MeetingSchedulerLimits, meetingSchedulerPlanKeys } from '../tiers.js'

export default createBillingRouter<MeetingSchedulerLimits>({
  getPricingTiers,
  planKeys: meetingSchedulerPlanKeys,
})
