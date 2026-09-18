import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { type EventTicketingLimits, eventTicketingPlanKeys, getPricingTiers } from '../tiers.js'

export default createBillingRouter<EventTicketingLimits>({
  getPricingTiers,
  planKeys: eventTicketingPlanKeys,
})
