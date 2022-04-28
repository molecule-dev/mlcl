import * as platforms from './platforms/index.js'
import * as types from './types.js'

const defaultPlan: types.Plan = { // No plan AKA free plan.
  planKey: ``,
  platformKey: ``,
  platformProductId: ``,
  alias: ``,
  period: ``,
  price: ``,
  title: `Free`,
  description: `Certain features are limited. Upgrade your plan to unlock premium features.`,
  shortDescription: `Limited features and usage.`,
  capabilities: {
  },
}

/**
 * A map of every available `planKey` to `plan`.
 *
 * Every plan key for every platform should be unique.
 * E.g., `appleMonthly` and `appleYearly` vs `googleMonthly` and `googleYearly`.
 *
 * You'll need to customize the `Plan` type, adding properties and logic surrounding it
 * as necessary for your particular application.
 */
export const plans = {
  '': defaultPlan,
  ...platforms.stripe.plans,
  ...platforms.google.plans,
  ...platforms.apple.plans,
}
