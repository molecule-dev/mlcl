import { setOrderMerchantAuthorizer } from '@molecule/api-resource-order'
import { resolveAll } from '@molecule/api-secrets'

import { storeOrderMerchantAuthorizer } from '../order-authorizer.js'
import { setupEntitlements } from '../tiers.js'
import { setupApiAnalyticsDefault } from './analytics-default.js'
import { setupConfigEnv } from './config-env.js'
import { setupDatabasePostgresql } from './database-postgresql.js'
import { setupEmailsMailgun } from './emails-mailgun.js'
import { setupImageSharp } from './image-sharp.js'
import { setupJwtJsonwebtoken } from './jwt-jsonwebtoken.js'
import { setupMiddlewareBodyParserExpress } from './middleware-body-parser-express.js'
import { setupMiddlewareCookieParserExpress } from './middleware-cookie-parser-express.js'
import { setupMiddlewareCorsExpress } from './middleware-cors-express.js'
import { setupPasswordBcrypt } from './password-bcrypt.js'
import { setupPaymentsStripe } from './payments-stripe.js'
import { setupRateLimitMemory } from './rate-limit-memory.js'
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
  setupApiAnalyticsDefault()
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

  // Bond the per-app tier registry so enforceLimit() middleware on
  // product / cart / order routes can resolve the user's plan + limits.
  // Without this, every route guarded by enforceLimit throws
  // 'Entitlements provider not configured' at first request.
  setupEntitlements()

  setupServiceDevice()
  setupServicePayment()
  setupConfigEnv()
  setupDatabasePostgresql()
  setupEmailsMailgun()
  setupImageSharp()
  setupMiddlewareBodyParserExpress()
  setupMiddlewareCookieParserExpress()
  setupMiddlewareCorsExpress()
  setupPaymentsStripe()
  setupSearchMeilisearch()
  setupUploadsS3()
  setupJwtJsonwebtoken()
  setupPasswordBcrypt()
  setupTwoFactorOtplib()

  // Register the order merchant authorizer. `@molecule/api-resource-order`
  // fails closed on every merchant lifecycle op (refund, merchant-state status
  // change, cancelling a progressed order) until the app declares who the
  // MERCHANT is — the order row records only the buyer. For this single-merchant
  // store the merchant is the store admin/owner, so any admin may drive any
  // order's lifecycle and a buyer never can.
  setOrderMerchantAuthorizer(storeOrderMerchantAuthorizer)
}
