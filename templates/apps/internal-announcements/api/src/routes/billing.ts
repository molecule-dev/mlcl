import { createBillingRouter } from '@molecule/api-bonds-default-express'

import {
  getPricingTiers,
  type InternalAnnouncementsLimits,
  internalAnnouncementsPlanKeys,
} from '../tiers.js'

export default createBillingRouter<InternalAnnouncementsLimits>({
  getPricingTiers,
  planKeys: internalAnnouncementsPlanKeys,
})
