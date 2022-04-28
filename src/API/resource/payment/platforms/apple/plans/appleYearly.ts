import { Plan } from '../../../types.js'

/**
 * The yearly Apple Pay plan.
 */
export const appleYearly: Plan = {
  planKey: `appleYearly`,
  platformKey: `apple`,
  platformProductId: `molecule_yearly_early_adopter`,
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
