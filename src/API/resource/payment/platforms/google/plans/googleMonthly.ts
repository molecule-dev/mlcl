import { Plan } from '../../../types.js'

/**
 * The monthly Google Pay plan.
 */
export const googleMonthly: Plan = {
  planKey: `googleMonthly`,
  platformKey: `google`,
  platformProductId: `monthly_early_adopter`,
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
