import { Plan } from '../../../types.js'

/**
 * The yearly Stripe plan.
 */
export const stripeYearly: Plan = {
  planKey: `stripeYearly`,
  platformKey: `stripe`,
  platformProductId: ``,
  alias: `yearly`,
  period: `year`,
  price: `$55`,
  autoRenews: true,
  title: `Yearly`,
  description: `Create and view attachments.`,
  highlightedDescription: `Get one month free, every year.`,
  capabilities: {
    forUsers: true,
    attachments: true,
  }
}
