import { createBillingRouter } from '@molecule/api-bonds-default-express'

import {
  type DocumentCollaborationLimits,
  documentCollaborationPlanKeys,
  getPricingTiers,
} from '../tiers.js'

export default createBillingRouter<DocumentCollaborationLimits>({
  getPricingTiers,
  planKeys: documentCollaborationPlanKeys,
})
