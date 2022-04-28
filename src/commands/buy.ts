import open from 'open'
import { Command, Argument } from 'commander'
import { userLoggedIn } from '../utilities/userLoggedIn.js'
import { repoConfig } from '../repoConfig.js'
import * as API from '../API/index.js'
import { logger } from '../logger.js'
import { getErrorMessage } from '../utilities/getErrorMessage.js'
import { plans } from '../API/resource/payment/plans.js'
import { PlanKey } from '../API/resource/payment/types.js'

/**
 * Adds the `buy` command to the program.
 */
 export const buy = (program: Command) => {
  program.command(`buy`)
    .description(`purchase a license for your Molecule`)
    .addArgument(new Argument(`[license]`, `the type of license`).choices([`single`, `unlimited`, `business`]))
    .addArgument(new Argument(`[quantity]`, `the quantity for the business license (at least ${plans.stripeBusinessMolecule.minimumQuantity})`))
    .action(async (license?: `single` | `unlimited` | `business`, quantity = 1) => {
      if (!license) {
        logger.info(`Usage:`)
        logger.info(`  mlcl buy single - one app with this Molecule`)
        logger.info(`  mlcl buy unlimited - unlimited apps with this Molecule`)
        logger.info(`  mlcl buy business <quantity> - at least 10 apps with any Molecule`)
        return
      }

      const user = await userLoggedIn()

      if (!user) {
        return
      }

      if (!repoConfig?.id) {
        logger.warn(`Not within a Molecule repository or \`.mlclrc.json\` not found.`)
        return
      }

      const planKey = ({
        single: `stripeSingleUseMolecule`,
        unlimited: `stripeUnlimitedUseMolecule`,
        business: `stripeBusinessMolecule`,
      })[license || ``] as PlanKey

      if (!planKey || !plans[planKey]) {
        logger.warn(`Unknown license option.`)
        return
      }

      try {
        quantity = Math.max(plans[planKey]?.minimumQuantity || 1, Math.round(Number(quantity) || 1))

        const molecule = (await API.resource.molecule.read(repoConfig.id)).data.props

        if (!molecule) {
          throw new Error(`Failed to fetch Molecule by ID ${repoConfig.id}.`)
        }

        const { checkoutUrl } = (await API.resource.molecule.updatePlan(molecule.id, { planKey, quantity })).data

        if (checkoutUrl) {
          logger.info(`Opening your browser to complete checkout via Stripe...`)

          const childProcess = await open(checkoutUrl)

          childProcess.on(`error`, error => {
            logger.warn(`Error opening the checkout URL: ${getErrorMessage(error)}`)
            logger.warn(`If your browser didn't open on its own, visit the following URL: ${checkoutUrl}`)
          })

          childProcess.on(`close`, code => {
            if (code !== 0) {
              logger.warn(`If your browser didn't open on its own, visit the following URL: ${checkoutUrl}`)
            }
          })
        } else {
          throw new Error(`Unexpected response. Please contact developer-support@molecule.dev so we can fix this.`)
        }
      } catch (error) {
        logger.warn(`Something went wrong. ${getErrorMessage(error)}`)
      }
    })
}
