import { bond } from '@molecule/api-bond'
import { paymentProvider as stripePayments } from '@molecule/api-payments-stripe'
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
import { setupPermissionsCustom } from './permissions-custom.js'
import { setupRateLimitMemory } from './rate-limit-memory.js'
import { setupRealtimeSocketio } from './realtime-socketio.js'
import { setupReportingDatabase } from './reporting-database.js'
import { setupSecretsEnv } from './secrets-env.js'
import { setupServiceDevice } from './service-device.js'
import { setupServicePayment } from './service-payment.js'
import { setupTwoFactorOtplib } from './two-factor-otplib.js'
import { setupUploadsS3 } from './uploads-s3.js'

/**
 * Initialize all providers and service bonds.
 * Resolves all registered secrets before wiring providers.
 *
 * Why this file exists (and is hand-maintained, not auto-generated):
 *   - virtual-classroom is shipped via `mlcl create --template virtual-classroom`,
 *     which uses the FAST-PATH `copyTemplateInstance` flow (a flat copy of this
 *     directory). The package-driven injector that auto-wires
 *     `setupEntitlements()` / `bond('payments', ...)` is NOT run.
 *   - Without `setupEntitlements()` here, every `getEffectiveTier()` call
 *     throws "Entitlements provider not configured" → /billing/status 500.
 *   - Without `bond('payments', 'stripe', stripePayments)`, /billing/checkout
 *     and /billing/cancel return 503 ("Billing provider unavailable").
 *
 * The standalone `api/bonds.ts` is a leftover from an earlier injector flow
 * that nothing imports — see `api/src/server.ts`, which imports `setupBonds`
 * from this file. Keep both in sync until the leftover is removed.
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
    'JWT_PRIVATE_KEY',
    'JWT_PUBLIC_KEY',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'S3_BUCKET',
    'MAILGUN_API_KEY',
    'MAILGUN_DOMAIN',
  ])
  setupServiceDevice()
  setupConfigEnv()
  setupCronNodeCron()
  setupDatabasePostgresql()
  setupEmailsMailgun()
  setupMiddlewareBodyParserExpress()
  setupMiddlewareCookieParserExpress()
  setupMiddlewareCorsExpress()
  setupPermissionsCustom()
  setupRealtimeSocketio()
  // Guard per-room realtime rooms: without an onJoinRequest guard the realtime core
  // lets any client join any `room:<id>` room by name (a realtime IDOR). onJoinRequest
  // buffers, so order is not load-bearing.
  registerRealtimeJoinGuard()
  setupReportingDatabase()
  setupUploadsS3()
  setupJwtJsonwebtoken()
  setupPasswordBcrypt()
  setupTwoFactorOtplib()

  // Tier registry — must be bonded before any /billing/* request fans out
  // through `getEffectiveTier()` or any handler-level `enforceLimit()` call.
  setupEntitlements()

  // Payment provider — billing routes call `get('payments', 'stripe')`. With
  // no provider bonded, /billing/checkout returns 503 even after auth.
  bond('payments', 'stripe', stripePayments)

  // Plans + payment records — handlePaymentNotification resolves the paid
  // plan through the 'plans'/'paymentRecords' bonds; without them the Stripe
  // webhook is silently swallowed and a paying user is never upgraded.
  setupServicePayment()
}
