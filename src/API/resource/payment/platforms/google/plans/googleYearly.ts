import { Plan } from '../../../types.js'

/**
 * The yearly Google Pay plan.
 */
export const googleYearly: Plan = {
  planKey: `googleYearly`,
  platformKey: `google`,
  platformProductId: `yearly_early_adopter`,
  alias: `yearly`,
  period: `year`,
  price: `$64.99`,
  autoRenews: true,
  title: `Yearly`,
  description: `Create and view attachments.`,
  highlightedDescription: `Get one month free, every year.`,
  capabilities: {
    attachments: true,
  }
}
