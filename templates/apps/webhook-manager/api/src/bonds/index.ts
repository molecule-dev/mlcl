import { resolveAll } from '@molecule/api-secrets'

import { startDeliveryWorker } from '../handlers/_deliver.js'
import { setupEntitlements } from '../tiers.js'
import { setupConfigEnv } from './config-env.js'
import { setupDatabasePostgresql } from './database-postgresql.js'
import { setupEmailsMailgun } from './emails-mailgun.js'
import { setupEncryptionAes } from './encryption-aes.js'
import { setupHttpFetch } from './http-fetch.js'
import { setupJwtJsonwebtoken } from './jwt-jsonwebtoken.js'
import { setupMiddlewareBodyParserExpress } from './middleware-body-parser-express.js'
import { setupMiddlewareCookieParserExpress } from './middleware-cookie-parser-express.js'
import { setupMiddlewareCorsExpress } from './middleware-cors-express.js'
import { setupPasswordBcrypt } from './password-bcrypt.js'
import { setupPaymentsStripe } from './payments-stripe.js'
import { setupQueueRedis } from './queue-redis.js'
import { setupRateLimitMemory } from './rate-limit-memory.js'
import { setupSearchMeilisearch } from './search-meilisearch.js'
import { setupSecretsEnv } from './secrets-env.js'
import { setupServiceDevice } from './service-device.js'
import { setupServicePayment } from './service-payment.js'
import { setupTwoFactorOtplib } from './two-factor-otplib.js'
import { setupWebhookHttp } from './webhook-http.js'

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
    'REDIS_URL',
    'JWT_PRIVATE_KEY',
    'JWT_PUBLIC_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'MAILGUN_API_KEY',
    'MAILGUN_DOMAIN',
  ])
  setupServiceDevice()
  setupServicePayment()
  setupConfigEnv()
  setupDatabasePostgresql()
  setupEmailsMailgun()
  setupEncryptionAes()
  setupHttpFetch()
  setupMiddlewareBodyParserExpress()
  setupMiddlewareCookieParserExpress()
  setupMiddlewareCorsExpress()
  setupPaymentsStripe()
  // Redis when REDIS_URL is set; zero-credential in-process memory queue
  // otherwise (dev fallback inside @molecule/api-bonds-default-express).
  await setupQueueRedis()
  setupSearchMeilisearch()
  setupWebhookHttp()
  setupJwtJsonwebtoken()
  setupPasswordBcrypt()
  setupTwoFactorOtplib()
  setupEntitlements()
  // Queue-backed webhook delivery worker — processes the `queued` delivery
  // rows created by event fanout + replay (see handlers/_deliver.ts).
  startDeliveryWorker()
}
