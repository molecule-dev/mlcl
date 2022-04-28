import open from 'open'
import { Command } from 'commander'
import { userLoggedIn } from '../utilities/userLoggedIn.js'
import { repoConfig } from '../repoConfig.js'
import * as API from '../API/index.js'
import { logger } from '../logger.js'
import { getErrorMessage } from '../utilities/getErrorMessage.js'
import { plans } from '../API/resource/payment/plans.js'

/**
 * Adds the `subscribe` command to the program.
 */
export const subscribe = (program: Command) => {
  program.command(`subscribe`)
    .description(`enables or renews your Molecule's subscription`)
    .action(async () => {
      const user = await userLoggedIn()

      if (!user) {
        return
      }

      if (!repoConfig?.id) {
        logger.warn(`Not within a Molecule repository or \`.mlclrc.json\` not found.`)
        return
      }

      try {
        const molecule = (await API.resource.molecule.read(repoConfig.id)).data.props

        if (!molecule) {
          throw new Error(`Failed to fetch Molecule by ID ${repoConfig.id}.`)
        }

        const planKey = molecule.planKey || ``
        const planAutoRenews = molecule.planAutoRenews
        const planExpiresAt = molecule.planExpiresAt
        const planExpiresDate = planKey
          ? (planAutoRenews || plans[planKey].autoRenews)
            ? planExpiresAt && new Date(planExpiresAt)
            : null
          : undefined
        const planExpiresLocaleString = (planExpiresDate && planExpiresDate.toLocaleString()) || `never`

        if (planKey && (planAutoRenews || !plans[planKey].autoRenews)) {
          if (planAutoRenews) {
            logger.info(`Your Molecule is already subscribed!`)
            logger.info(`Your ${plans[planKey].title} plan will ${planAutoRenews ? `automatically renew` : `expire`} ${planExpiresLocaleString}.`)
          } else {
            logger.info(`You already have a ${plans[planKey].title} license, so no subscription is necessary.`)
            logger.info(`Thank you!`)
          }
          return
        }

        logger.info(`Subscribing...`)

        const { props, checkoutUrl } = (await API.resource.molecule.updatePlan(molecule.id, { planKey: `stripeMonthlyMolecule`, quantity: 1 })).data

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
        } else if (props?.planKey) {
          logger.info(`Your Molecule is now subscribed! Thank you!`)
        } else {
          throw new Error(`Unexpected response. Please contact developer-support@molecule.dev so we can fix this.`)
        }
      } catch (error) {
        logger.warn(`Failed to subscribe. ${getErrorMessage(error)}`)
      }
    })
}
