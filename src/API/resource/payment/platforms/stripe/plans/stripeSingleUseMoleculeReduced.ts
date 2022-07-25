import { Plan } from '../../../types.js'

/**
 * The reduced single use Stripe plan for molecules.
 */
export const stripeSingleUseMoleculeReduced: Plan = {
  planKey: `stripeSingleUseMoleculeReduced`,
  platformKey: `stripe`,
  platformProductId: ``,
  alias: `singleUseMolecule`,
  period: ``,
  price: `$299`,
  autoRenews: false,
  title: `Single Use Molecule`,
  description: `Includes all of the core functionality you've selected for your full-stack application.`,
  capabilities: {
    forMolecules: true,
    premium: true,
    attachments: true,
  }
}
