import { Plan } from '../../../types.js'

/**
 * The reduced monthly Stripe plan for molecules.
 */
export const stripeMonthlyMoleculeReduced: Plan = {
  planKey: `stripeMonthlyMoleculeReduced`,
  platformKey: `stripe`,
  platformProductId: ``,
  alias: `monthlyMolecule`,
  period: `month`,
  price: `$19`,
  autoRenews: true,
  title: `Monthly Molecule`,
  description: `Includes all of the core functionality you've selected for your full-stack application.`,
  capabilities: {
    forMolecules: true,
    attachments: true,
  }
}
