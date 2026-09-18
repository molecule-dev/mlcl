import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { type AiMeetingNotesLimits, aiMeetingNotesPlanKeys, getPricingTiers } from '../tiers.js'

export default createBillingRouter<AiMeetingNotesLimits>({
  getPricingTiers,
  planKeys: aiMeetingNotesPlanKeys,
})
