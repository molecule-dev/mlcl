import { resolveAll } from '@molecule/api-secrets'

import { setupEntitlements } from '../tiers.js'
import { setupApiAnalyticsDefault } from './analytics-default.js'
import { setupConfigEnv } from './config-env.js'
import { setupCronNodeCron } from './cron-node-cron.js'
import { setupDatabasePostgresql } from './database-postgresql.js'
import { setupEmailsMailgun } from './emails-mailgun.js'
import { setupJwtJsonwebtoken } from './jwt-jsonwebtoken.js'
import { setupMiddlewareBodyParserExpress } from './middleware-body-parser-express.js'
import { setupMiddlewareCookieParserExpress } from './middleware-cookie-parser-express.js'
import { setupMiddlewareCorsExpress } from './middleware-cors-express.js'
import { setupPasswordBcrypt } from './password-bcrypt.js'
import { setupPaymentsStripe } from './payments-stripe.js'
import { setupPermissionsCustom } from './permissions-custom.js'
import { setupPushNotificationsWebPush } from './push-notifications-web-push.js'
import { setupRateLimitMemory } from './rate-limit-memory.js'
import { setupReportingDatabase } from './reporting-database.js'
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
    'VAPID_PUBLIC_KEY',
    'VAPID_PRIVATE_KEY',
    'VAPID_EMAIL',
    'JWT_PRIVATE_KEY',
    'JWT_PUBLIC_KEY',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'S3_BUCKET',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
  ])

  // Wire the LMS tier registry into @molecule/api-entitlements so
  // enforceLimit() middleware can resolve tier limits at request time.
  // Must be bonded BEFORE billing routes so /api/billing/status and
  // /api/billing/checkout can resolve tier metadata for the user.
  setupEntitlements()

  setupServiceDevice()
  setupServicePayment()
  setupConfigEnv()
  setupCronNodeCron()
  setupDatabasePostgresql()
  setupEmailsMailgun()
  setupMiddlewareBodyParserExpress()
  setupMiddlewareCookieParserExpress()
  setupMiddlewareCorsExpress()
  setupPaymentsStripe()
  setupPermissionsCustom()
  setupPushNotificationsWebPush()
  setupReportingDatabase()
  setupSearchMeilisearch()
  setupUploadsS3()
  setupJwtJsonwebtoken()
  setupPasswordBcrypt()
  setupTwoFactorOtplib()
}
