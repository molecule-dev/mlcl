/**
 * The translations of every installed API locale bond. `mlcl add <package> --inject` (or
 * `mlcl inject`) rewrites this file with each package's locale bond.
 */
import { registerLocaleModule } from '@molecule/api-i18n'
import * as aiLocales from '@molecule/api-locales-ai'
import * as bodyParserLocales from '@molecule/api-locales-body-parser'
import * as cacheLocales from '@molecule/api-locales-cache'
import * as configLocales from '@molecule/api-locales-config'
import * as databaseLocales from '@molecule/api-locales-database'
import * as deviceLocales from '@molecule/api-locales-device'
import * as emailsLocales from '@molecule/api-locales-emails'
import * as paymentLocales from '@molecule/api-locales-payment'
import * as paymentsStripeLocales from '@molecule/api-locales-payments-stripe'
import * as queueLocales from '@molecule/api-locales-queue'
import * as resourceLocales from '@molecule/api-locales-resource'
import * as secretsLocales from '@molecule/api-locales-secrets'
import * as tagLocales from '@molecule/api-locales-tag'
import * as uploadsLocales from '@molecule/api-locales-uploads'
import * as userLocales from '@molecule/api-locales-user'
import * as userPaymentsLocales from '@molecule/api-locales-user-payments'

const localeModules = [
  aiLocales,
  bodyParserLocales,
  cacheLocales,
  configLocales,
  databaseLocales,
  deviceLocales,
  emailsLocales,
  paymentLocales,
  paymentsStripeLocales,
  queueLocales,
  resourceLocales,
  secretsLocales,
  tagLocales,
  uploadsLocales,
  userLocales,
  userPaymentsLocales,
]

/**
 * Registers every installed locale bond's translations. Called first from bonds/index.ts, so
 * a message raised while the other bonds are wired is already translated.
 */
export function setupLocales(): void {
  for (const locales of localeModules) registerLocaleModule(locales)
}
