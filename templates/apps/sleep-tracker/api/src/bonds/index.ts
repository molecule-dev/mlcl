import { resolveAll } from '@molecule/api-secrets'

import { setupEntitlements } from '../tiers.js'
import { setupConfigEnv } from './config-env.js'
import { setupCronNodeCron } from './cron-node-cron.js'
import { setupDatabasePostgresql } from './database-postgresql.js'
import { setupEmailsMailgun } from './emails-mailgun.js'
import { setupImportExportCsv } from './import-export-csv.js'
import { setupJwtJsonwebtoken } from './jwt-jsonwebtoken.js'
import { setupMiddlewareBodyParserExpress } from './middleware-body-parser-express.js'
import { setupMiddlewareCookieParserExpress } from './middleware-cookie-parser-express.js'
import { setupMiddlewareCorsExpress } from './middleware-cors-express.js'
import { setupPasswordBcrypt } from './password-bcrypt.js'
import { setupPaymentsStripe } from './payments-stripe.js'
import { setupPushNotificationsWebPush } from './push-notifications-web-push.js'
import { setupRateLimitMemory } from './rate-limit-memory.js'
import { setupReportingDatabase } from './reporting-database.js'
import { setupSecretsEnv } from './secrets-env.js'
import { setupServiceDevice } from './service-device.js'
import { setupServicePayment } from './service-payment.js'
import { setupTwoFactorOtplib } from './two-factor-otplib.js'

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
    'VAPID_PUBLIC_KEY',
    'VAPID_PRIVATE_KEY',
    'VAPID_EMAIL',
    'JWT_PRIVATE_KEY',
    'JWT_PUBLIC_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'MAILGUN_API_KEY',
    'MAILGUN_DOMAIN',
  ])

  // Entitlements provider must be bonded before any handler/middleware that
  // calls getEffectiveTier() / enforceLimit() reads it. Wired here so the
  // tier registry is available to billing routes, sleep-log limit checks,
  // and the premium-coaching gate.
  setupEntitlements()

  setupServiceDevice()
  setupConfigEnv()
  setupCronNodeCron()
  setupDatabasePostgresql()
  setupEmailsMailgun()
  setupImportExportCsv()
  setupMiddlewareBodyParserExpress()
  setupMiddlewareCookieParserExpress()
  setupMiddlewareCorsExpress()
  setupPaymentsStripe()
  // Plans + payment records — handlePaymentNotification resolves the paid
  // plan through the 'plans'/'paymentRecords' bonds; without them the Stripe
  // webhook is silently swallowed and a paying user is never upgraded.
  setupServicePayment()
  setupPushNotificationsWebPush()
  setupReportingDatabase()
  setupJwtJsonwebtoken()
  setupPasswordBcrypt()
  setupTwoFactorOtplib()
}
