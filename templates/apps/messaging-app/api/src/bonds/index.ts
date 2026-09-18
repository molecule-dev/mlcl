import { resolveAll } from '@molecule/api-secrets'

import { registerRealtimeJoinGuard } from '../lib/realtime-guard.js'
import { setupEntitlements } from '../tiers.js'
import { setupConfigEnv } from './config-env.js'
import { setupDatabasePostgresql } from './database-postgresql.js'
import { setupEmailsMailgun } from './emails-mailgun.js'
import { setupEncryptionAes } from './encryption-aes.js'
import { setupJwtJsonwebtoken } from './jwt-jsonwebtoken.js'
import { setupMiddlewareBodyParserExpress } from './middleware-body-parser-express.js'
import { setupMiddlewareCookieParserExpress } from './middleware-cookie-parser-express.js'
import { setupMiddlewareCorsExpress } from './middleware-cors-express.js'
import { setupPasswordBcrypt } from './password-bcrypt.js'
import { setupPaymentsStripe } from './payments-stripe.js'
import { setupPushNotificationsWebPush } from './push-notifications-web-push.js'
import { setupRateLimitMemory } from './rate-limit-memory.js'
import { setupRealtimeSocketio } from './realtime-socketio.js'
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
  setupDatabasePostgresql()
  // Encryption transport — messages.ts/search.ts/_seed.ts encrypt() and decrypt()
  // message bodies. Without a bonded provider, encrypt()/decrypt() THROW ("Encryption
  // provider not configured"), so every message send/read 500s. The AES provider reads
  // ENCRYPTION_KEY (auto-generated in .env from the api-encryption-aes declaration) on
  // first use.
  setupEncryptionAes()
  setupEmailsMailgun()
  setupMiddlewareBodyParserExpress()
  setupMiddlewareCookieParserExpress()
  setupMiddlewareCorsExpress()
  setupPaymentsStripe()
  setupPushNotificationsWebPush()
  setupRealtimeSocketio()
  // Realtime join guard — the authorization boundary for live subscriptions.
  // Conversations are participant-scoped, so socket clients may only join a
  // `conversation:<id>` room after proving (bearer JWT or session cookie +
  // conversation_participants row) they belong to that conversation; with no
  // guard registered ALL joins would be allowed. Safe here: the realtime core
  // buffers guards registered before the bond is wired.
  registerRealtimeJoinGuard()
  setupJwtJsonwebtoken()
  setupPasswordBcrypt()
  setupTwoFactorOtplib()
}
