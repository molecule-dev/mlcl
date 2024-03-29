import { Plan } from '../../../types.js'

/**
 * The monthly Stripe plan for molecules.
 */
export const stripeMonthlyMolecule: Plan = {
  planKey: `stripeMonthlyMolecule`,
  platformKey: `stripe`,
  platformProductId: ``,
  alias: `monthlyMolecule`,
  period: `month`,
  price: `$99`,
  autoRenews: true,
  title: `Monthly Molecule`,
  description: `Includes all of the core functionality you've selected for your full-stack application.`,
  capabilities: {
    forMolecules: true,
    attachments: true,
  }
}
