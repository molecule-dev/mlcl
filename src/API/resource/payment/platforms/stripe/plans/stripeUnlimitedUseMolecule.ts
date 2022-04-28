import { Plan } from '../../../types.js'

/**
 * The unlimited use Stripe plan for molecules.
 */
export const stripeUnlimitedUseMolecule: Plan = {
  planKey: `stripeUnlimitedUseMolecule`,
  platformKey: `stripe`,
  platformProductId: ``,
  alias: `unlimitedUseMolecule`,
  period: ``,
  price: `$1499`,
  autoRenews: false,
  title: `Unlimited Use Molecule`,
  description: `Includes all of the core functionality you've selected for your full-stack application.`,
  capabilities: {
    forMolecules: true,
    premium: true,
    attachments: true,
  }
}
