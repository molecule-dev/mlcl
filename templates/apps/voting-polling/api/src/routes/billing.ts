import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type VotingPollingLimits, votingPollingPlanKeys } from '../tiers.js'

export default createBillingRouter<VotingPollingLimits>({
  getPricingTiers,
  planKeys: votingPollingPlanKeys,
})
