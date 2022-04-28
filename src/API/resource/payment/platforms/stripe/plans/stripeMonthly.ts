import { Plan } from '../../../types.js'

/**
 * The monthly Stripe plan.
 */
export const stripeMonthly: Plan = {
  planKey: `stripeMonthly`,
  platformKey: `stripe`,
  platformProductId: ``,
  alias: `monthly`,
  period: `month`,
  price: `$5`,
  autoRenews: true,
  title: `Monthly`,
  description: `Create and view attachments.`,
  capabilities: {
    forUsers: true,
    attachments: true,
  }
}
