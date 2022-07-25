import { Plan } from '../../../types.js'

/**
 * The reduced business Stripe plan for molecules.
 */
export const stripeBusinessMoleculeReduced: Plan = {
  planKey: `stripeBusinessMoleculeReduced`,
  platformKey: `stripe`,
  platformProductId: ``,
  alias: `businessMolecule`,
  period: ``,
  price: `$249`,
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
