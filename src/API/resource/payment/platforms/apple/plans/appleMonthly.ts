import { Plan } from '../../../types.js'

/**
 * The monthly Apple Pay plan.
 */
export const appleMonthly: Plan = {
  planKey: `appleMonthly`,
  platformKey: `apple`,
  platformProductId: `molecule_monthly_early_adopter`,
  alias: `monthly`,
  period: `month`,
  price: `$5.99`,
  autoRenews: true,
  title: `Monthly`,
  description: `Create and view attachments.`,
  capabilities: {
    attachments: true,
  }
}
