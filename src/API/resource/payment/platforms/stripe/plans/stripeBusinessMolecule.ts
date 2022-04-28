import { Plan } from '../../../types.js'

/**
 * The business Stripe plan for molecules.
 */
export const stripeBusinessMolecule: Plan = {
  planKey: `stripeBusinessMolecule`,
  platformKey: `stripe`,
  platformProductId: ``,
  alias: `businessMolecule`,
  period: ``,
  price: `$449`,
  allowMultiple: true,
  minimumQuantity: 10,
  autoRenews: false,
  title: `Business Molecule`,
  description: `Includes all of the core functionality available for full-stack applications.`,
  capabilities: {
    forMolecules: true,
    premium: true,
    attachments: true,
  }
}
