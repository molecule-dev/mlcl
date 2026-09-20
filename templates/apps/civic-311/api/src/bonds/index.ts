import { resolveAll } from '@molecule/api-secrets'

import { setupEntitlements } from '../tiers.js'
import { setupApiAnalyticsDefault } from './analytics-default.js'
import { setupConfigEnv } from './config-env.js'
import { setupDatabasePostgresql } from './database-postgresql.js'
import { setupEmailsMailgun } from './emails-mailgun.js'
import { setupJwtJsonwebtoken } from './jwt-jsonwebtoken.js'
import { setupMiddlewareBodyParserExpress } from './middleware-body-parser-express.js'
import { setupMiddlewareCookieParserExpress } from './middleware-cookie-parser-express.js'
import { setupMiddlewareCorsExpress } from './middleware-cors-express.js'
import { setupPasswordBcrypt } from './password-bcrypt.js'
import { setupPaymentsStripe } from './payments-stripe.js'
import { setupPermissionsCustom } from './permissions-custom.js'
import { setupRateLimitMemory } from './rate-limit-memory.js'
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
    'JWT_PRIVATE_KEY',
    'JWT_PUBLIC_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
  ])
  setupEntitlements()
  setupServiceDevice()
  setupServicePayment()
  setupConfigEnv()
  setupDatabasePostgresql()
  setupEmailsMailgun()
  setupMiddlewareBodyParserExpress()
  setupMiddlewareCookieParserExpress()
  setupMiddlewareCorsExpress()
  setupPasswordBcrypt()
  setupPaymentsStripe()
  setupPermissionsCustom()
  // Issue photos. setupUploadsS3 wires the S3 uploads provider when the
  // AWS_* env is present and falls back to the zero-credential filesystem
  // provider in development — so photo upload works out of the box with no
  // credentials, and production fails loudly instead of silently swapping.
  setupUploadsS3()
  setupJwtJsonwebtoken()
  setupTwoFactorOtplib()

  // Seed the Riverton demo community (citizens, issues, timelines,
  // confirmations, watch areas) if the issues table is empty. Idempotent;
  // safe to re-run on every boot. Explore / report flows need rows present
  // for the demo UI and e2e tests.
  try {
    const { seedGlobalCommunityIfEmpty } = await import('../handlers/_seed.js')
    const result = await seedGlobalCommunityIfEmpty()
    if (result.issuesCreated > 0) {
      console.log(`[civic-311 seed] ${JSON.stringify(result)}`)
    }
  } catch (error) {
    console.warn('[civic-311 seed] failed:', (error as Error).message)
  }
}
