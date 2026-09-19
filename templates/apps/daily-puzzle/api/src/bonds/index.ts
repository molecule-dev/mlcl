import { logger } from '@molecule/api-logger'
import { resolveAll } from '@molecule/api-secrets'

import { seedGlobalPuzzleDataIfEmpty } from '../handlers/_seed.js'
import { setupEntitlements } from '../tiers.js'
import { setupConfigEnv } from './config-env.js'
import { setupDatabasePostgresql } from './database-postgresql.js'
import { setupEmailsMailgun } from './emails-mailgun.js'
import { setupJwtJsonwebtoken } from './jwt-jsonwebtoken.js'
import { setupMiddlewareBodyParserExpress } from './middleware-body-parser-express.js'
import { setupMiddlewareCookieParserExpress } from './middleware-cookie-parser-express.js'
import { setupMiddlewareCorsExpress } from './middleware-cors-express.js'
import { setupPasswordBcrypt } from './password-bcrypt.js'
import { setupPaymentsStripe } from './payments-stripe.js'
import { setupRateLimitMemory } from './rate-limit-memory.js'
import { setupReportingDatabase } from './reporting-database.js'
import { setupSecretsEnv } from './secrets-env.js'
import { setupServiceDevice } from './service-device.js'
import { setupServicePayment } from './service-payment.js'
import { setupTwoFactorOtplib } from './two-factor-otplib.js'

/**
 * Initialize all providers and service bonds.
 * Resolves all registered secrets before wiring providers.
 *
 * Deliberately NO cron bond: the daily puzzle is created lazily on first
 * play with a deterministic date-hash word pick, so there is no scheduled
 * job to run (see handlers/puzzles.ts getOrCreatePuzzle).
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
    'MAILGUN_API_KEY',
    'MAILGUN_DOMAIN',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
  ])

  // Bond the per-app tier registry so getEffectiveTier() / enforceLimit()
  // can resolve the user's plan + limits. Without this, /api/billing/status
  // throws 'Entitlements provider not configured'.
  setupEntitlements()

  setupServiceDevice()
  setupServicePayment()
  setupConfigEnv()
  setupDatabasePostgresql()
  setupEmailsMailgun()
  setupMiddlewareBodyParserExpress()
  setupMiddlewareCookieParserExpress()
  setupMiddlewareCorsExpress()
  setupPaymentsStripe()
  setupReportingDatabase()
  setupJwtJsonwebtoken()
  setupPasswordBcrypt()
  setupTwoFactorOtplib()

  // Seed the dictionary + demo leaderboard rows if empty. Idempotent; safe
  // to re-run on every boot. Wrapped per the fleet rule so a failed seed
  // never breaks boot — the puzzles handler re-tries via ensureSeed().
  try {
    await seedGlobalPuzzleDataIfEmpty()
    logger.info?.('seed ok: daily-puzzle dictionary + demo players checked')
  } catch (error) {
    logger.warn?.(`seed failed: ${(error as Error).message}`)
  }
}
