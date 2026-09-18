import { resolveAll } from '@molecule/api-secrets'

import { startStatusProbes } from '../lib/status-probes.js'
import { setupEntitlements } from '../tiers.js'
import { setupConfigEnv } from './config-env.js'
import { setupCronNodeCron } from './cron-node-cron.js'
import { setupDatabasePostgresql } from './database-postgresql.js'
import { setupEmailsMailgun } from './emails-mailgun.js'
import { setupHttpFetch } from './http-fetch.js'
import { setupJwtJsonwebtoken } from './jwt-jsonwebtoken.js'
import { setupMiddlewareBodyParserExpress } from './middleware-body-parser-express.js'
import { setupMiddlewareCookieParserExpress } from './middleware-cookie-parser-express.js'
import { setupMiddlewareCorsExpress } from './middleware-cors-express.js'
import { setupMonitoringDefault } from './monitoring-default.js'
import { setupNotificationsWebhook } from './notifications-webhook.js'
import { setupPasswordBcrypt } from './password-bcrypt.js'
import { setupPaymentsStripe } from './payments-stripe.js'
import { setupRateLimitMemory } from './rate-limit-memory.js'
import { setupSchedulerDefault } from './scheduler-default.js'
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
    'WEBHOOK_URL',
    'WEBHOOK_SECRET',
    'JWT_PRIVATE_KEY',
    'JWT_PUBLIC_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
  ])

  // Bond the per-app tier registry so getEffectiveTier() in billing
  // routes (and any enforceLimit() middleware) can resolve the user's
  // plan + limits. Without this the provider throws
  // 'Entitlements provider not configured' on first request.
  setupEntitlements()

  setupMonitoringDefault()
  setupServiceDevice()
  setupServicePayment()
  setupConfigEnv()
  setupCronNodeCron()
  setupDatabasePostgresql()
  setupEmailsMailgun()
  setupHttpFetch()
  setupMiddlewareBodyParserExpress()
  setupMiddlewareCookieParserExpress()
  setupMiddlewareCorsExpress()
  setupNotificationsWebhook()
  setupPaymentsStripe()
  setupSchedulerDefault()
  setupJwtJsonwebtoken()
  setupPasswordBcrypt()
  setupTwoFactorOtplib()

  // Start the recurring component monitor probes LAST — the task needs the
  // database + scheduler bonds above. This is what makes `monitor_url` real:
  // without it the scheduler is bonded but nothing ever recurs. Interval is
  // env-tunable (STATUS_PROBE_INTERVAL_MS, default 60s; 0 disables) — see
  // ../lib/status-probes.ts.
  startStatusProbes()
}
