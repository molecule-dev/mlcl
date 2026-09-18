import { resolveAll } from '@molecule/api-secrets'

import { registerRealtimeJoinGuard } from '../lib/realtime-guard.js'
import { setupAnalyticsNoop } from './analytics-noop.js'
import { setupConfigEnv } from './config-env.js'
import { setupDatabasePostgresql } from './database-postgresql.js'
import { setupEmailsMailgun } from './emails-mailgun.js'
import { setupJwtJsonwebtoken } from './jwt-jsonwebtoken.js'
import { setupLoggerConsole } from './logger-console.js'
import { setupMiddlewareBodyParserExpress } from './middleware-body-parser-express.js'
import { setupMiddlewareCookieParserExpress } from './middleware-cookie-parser-express.js'
import { setupMiddlewareCorsExpress } from './middleware-cors-express.js'
import { setupPasswordBcrypt } from './password-bcrypt.js'
import { setupPaymentsStripe } from './payments-stripe.js'
import { setupPermissionsCustom } from './permissions-custom.js'
import { setupRateLimitMemory } from './rate-limit-memory.js'
import { setupRealtimeSocketio } from './realtime-socketio.js'
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
  setupSecretsEnv()
  setupLoggerConsole()
  setupAnalyticsNoop()

  await resolveAll([
    'DATABASE_URL',
    'JWT_PRIVATE_KEY',
    'JWT_PUBLIC_KEY',
    'MAILGUN_API_KEY',
    'MAILGUN_DOMAIN',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
  ])

  // Note: setupEntitlements() is called from server.ts after setupBonds()
  // returns, since the entitlements registry is a per-app concern that
  // doesn't depend on bond providers.

  setupServiceDevice()
  setupServicePayment()
  setupConfigEnv()
  setupDatabasePostgresql()
  setupEmailsMailgun()
  setupMiddlewareBodyParserExpress()
  setupMiddlewareCookieParserExpress()
  setupMiddlewareCorsExpress()
  setupPaymentsStripe()
  setupPermissionsCustom()
  setupRealtimeSocketio()
  // Guard per-project realtime rooms: without an onJoinRequest guard the realtime
  // core lets any client join any room by name (a realtime IDOR). Registered after
  // the realtime bond, but onJoinRequest buffers so order is not load-bearing.
  registerRealtimeJoinGuard()
  setupSearchMeilisearch()
  setupJwtJsonwebtoken()
  setupPasswordBcrypt()
  setupTwoFactorOtplib()
}
