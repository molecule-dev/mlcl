import { Command } from 'commander'
import { userLoggedIn } from '../utilities/userLoggedIn.js'
import { repoConfig } from '../repoConfig.js'
import * as API from '../API/index.js'
import { logger } from '../logger.js'
import { getErrorMessage } from '../utilities/getErrorMessage.js'
import { plans } from '../API/resource/payment/plans.js'

/**
 * Adds the `unsubscribe` command to the program.
 */
export const unsubscribe = (program: Command) => {
  program.command(`unsubscribe`)
    .description(`cancels your Molecule's subscription`)
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

        if (!planAutoRenews) {
          if (planKey && !plans[planKey].autoRenews) {
            logger.info(`You already have a ${plans[planKey].title} license, so there is nothing to unsubscribe.`)
            logger.info(`Thank you!`)
          } else {
            logger.info(`Your Molecule is not subscribed.`)
          }
          return
        }

        logger.info(`Unsubscribing...`)

        const { props } = (await API.resource.molecule.updatePlan(molecule.id, { planKey: `` })).data

        if (props?.planAutoRenews === false) {
          logger.info(`Your Molecule has been unsubscribed and will expire ${planExpiresLocaleString}.`)
        } else {
          throw new Error(`Unexpected response. Please contact developer-support@molecule.dev so we can fix this.`)
        }
      } catch (error) {
        logger.warn(`Failed to unsubscribe. ${getErrorMessage(error)}`)
      }
    })
}
