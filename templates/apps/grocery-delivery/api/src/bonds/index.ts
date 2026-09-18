import { logger } from '@molecule/api-logger'
import { setOrderMerchantAuthorizer } from '@molecule/api-resource-order'
import { resolveAll } from '@molecule/api-secrets'

import { seedGlobalCatalogIfEmpty } from '../handlers/_seed.js'
import { isStoreOperator } from '../lib/store-operator.js'
import { setupEntitlements } from '../tiers.js'
import { setupConfigEnv } from './config-env.js'
import { setupCronNodeCron } from './cron-node-cron.js'
import { setupDatabasePostgresql } from './database-postgresql.js'
import { setupEmailsMailgun } from './emails-mailgun.js'
import { setupGeolocationGoogle } from './geolocation-google.js'
import { setupImageSharp } from './image-sharp.js'
import { setupJwtJsonwebtoken } from './jwt-jsonwebtoken.js'
import { setupMiddlewareBodyParserExpress } from './middleware-body-parser-express.js'
import { setupMiddlewareCookieParserExpress } from './middleware-cookie-parser-express.js'
import { setupMiddlewareCorsExpress } from './middleware-cors-express.js'
import { setupPasswordBcrypt } from './password-bcrypt.js'
import { setupPaymentsStripe } from './payments-stripe.js'
import { setupRateLimitMemory } from './rate-limit-memory.js'
import { setupRealtimeSocketio } from './realtime-socketio.js'
import { setupSearchMeilisearch } from './search-meilisearch.js'
import { setupSecretsEnv } from './secrets-env.js'
import { setupServiceDevice } from './service-device.js'
import { setupServicePayment } from './service-payment.js'
import { setupTwoFactorOtplib } from './two-factor-otplib.js'
import { setupUploadsS3 } from './uploads-s3.js'

/**
 * Initialize all providers and service bonds.
 * Resolves all registered secrets before wiring providers.
 */
export async function setupBonds(): Promise<void> {
  // Bond the rate-limit provider so the user resource's auth routes (login,
  // forgot/reset password, OAuth) are actually throttled — the rateLimitAuth
  // authorizer degrades OPEN without one. Swap to -redis for multi-replica prod.
  await setupRateLimitMemory()
  // Secrets provider must be bonded first so resolveAll can load .env values
  setupSecretsEnv()

  await resolveAll([
    'DATABASE_URL',
    'MAILGUN_API_KEY',
    'MAILGUN_DOMAIN',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'JWT_PRIVATE_KEY',
    'JWT_PUBLIC_KEY',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'S3_BUCKET',
  ])
  setupServiceDevice()
  setupServicePayment()
  setupConfigEnv()
  setupCronNodeCron()
  setupDatabasePostgresql()
  setupEmailsMailgun()
  setupGeolocationGoogle()
  setupImageSharp()
  setupMiddlewareBodyParserExpress()
  setupMiddlewareCookieParserExpress()
  setupMiddlewareCorsExpress()
  setupPaymentsStripe()
  setupRealtimeSocketio()
  setupSearchMeilisearch()
  setupUploadsS3()
  setupJwtJsonwebtoken()
  setupPasswordBcrypt()
  setupTwoFactorOtplib()
  setupEntitlements()

  // The order resource (@molecule/api-resource-order) fails CLOSED on merchant
  // lifecycle ops — refunds, transitions into a forward/merchant state, and
  // cancelling an already-progressed order — until the app declares who may act
  // as the merchant. Grocery-delivery is a SINGLE-merchant app: one store, run
  // by its operator(s), so ANY store operator (admin) is the merchant for EVERY
  // order and the order row itself is not consulted. The order handlers consult
  // this via `canDriveOrderLifecycle`; buyers keep only owner-scoped actions
  // (create/list/read + cancelling their OWN still-pending order).
  setOrderMerchantAuthorizer((_orderRow, userId) => isStoreOperator(userId))

  // Seed shared catalog rows if empty. Idempotent; safe to re-run on
  // every boot. Listing endpoints need rows to be present for the
  // demo UI and e2e tests.
  try {
    const result = await seedGlobalCatalogIfEmpty()
    logger.info?.(`seed ok: ${JSON.stringify(result)}`)
  } catch (error) {
    logger.warn?.(`seed failed: ${(error as Error).message}`)
  }
}
