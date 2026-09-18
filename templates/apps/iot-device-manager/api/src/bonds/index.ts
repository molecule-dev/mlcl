import { resolveAll } from '@molecule/api-secrets'

import { registerRealtimeJoinGuard } from '../lib/realtime-guard.js'
import { setupEntitlements } from '../tiers.js'
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
import { setupPushNotificationsWebPush } from './push-notifications-web-push.js'
import { setupRateLimitMemory } from './rate-limit-memory.js'
import { setupRealtimeSocketio } from './realtime-socketio.js'
import { setupReportingDatabase } from './reporting-database.js'
import { setupSearchMeilisearch } from './search-meilisearch.js'
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
    'MAILGUN_API_KEY',
    'MAILGUN_DOMAIN',
    'MEILISEARCH_HOST',
    'MEILISEARCH_API_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'VAPID_PUBLIC_KEY',
    'VAPID_PRIVATE_KEY',
    'VAPID_EMAIL',
    'JWT_PRIVATE_KEY',
    'JWT_PUBLIC_KEY',
  ])
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
  setupPushNotificationsWebPush()
  setupRealtimeSocketio()
  // Guard per-device realtime rooms: without an onJoinRequest guard the realtime
  // core lets any client join any room by name (a realtime IDOR — another owner's
  // telemetry/commands/logs). Registered after the realtime bond, but
  // onJoinRequest buffers so order is not load-bearing.
  registerRealtimeJoinGuard()
  setupReportingDatabase()
  setupSearchMeilisearch()
  setupJwtJsonwebtoken()
  setupPasswordBcrypt()
  setupTwoFactorOtplib()
}
