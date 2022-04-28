import { Plan } from '../../../types.js'

/**
 * The single use Stripe plan for molecules.
 */
export const stripeSingleUseMolecule: Plan = {
  planKey: `stripeSingleUseMolecule`,
  platformKey: `stripe`,
  platformProductId: ``,
  alias: `singleUseMolecule`,
  period: ``,
  price: `$499`,
  autoRenews: false,
  title: `Single Use Molecule`,
  description: `Includes all of the core functionality you've selected for your full-stack application.`,
  capabilities: {
    forMolecules: true,
    premium: true,
    attachments: true,
  }
}
