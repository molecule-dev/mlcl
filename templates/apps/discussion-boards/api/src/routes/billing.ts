import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { type DiscussionBoardsLimits, discussionBoardsPlanKeys, getPricingTiers } from '../tiers.js'

export default createBillingRouter<DiscussionBoardsLimits>({
  getPricingTiers,
  planKeys: discussionBoardsPlanKeys,
})
