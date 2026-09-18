import { createBillingRouter } from '@molecule/api-bonds-default-express'

import {
  getPricingTiers,
  type SurveyFeedbackToolLimits,
  surveyFeedbackToolPlanKeys,
} from '../tiers.js'

export default createBillingRouter<SurveyFeedbackToolLimits>({
  getPricingTiers,
  planKeys: surveyFeedbackToolPlanKeys,
})
