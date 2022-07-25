import { Plan } from '../../../types.js'

/**
 * The reduced unlimited use Stripe plan for molecules.
 */
export const stripeUnlimitedUseMoleculeReduced: Plan = {
  planKey: `stripeUnlimitedUseMoleculeReduced`,
  platformKey: `stripe`,
  platformProductId: ``,
  alias: `unlimitedUseMolecule`,
  period: ``,
  price: `$999`,
  autoRenews: false,
  title: `Unlimited Use Molecule`,
  description: `Includes all of the core functionality you've selected for your full-stack application.`,
  capabilities: {
    forMolecules: true,
    premium: true,
    attachments: true,
  }
}
