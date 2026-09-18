import { resolveAll } from '@molecule/api-secrets'

import { setupEntitlements } from '../tiers.js'
import { setupAiAnthropic } from './ai-anthropic.js'
import { setupConfigEnv } from './config-env.js'
import { setupDatabasePostgresql } from './database-postgresql.js'
import { setupEmailsMailgun } from './emails-mailgun.js'
import { setupEncryptionAes } from './encryption-aes.js'
import { setupJwtJsonwebtoken } from './jwt-jsonwebtoken.js'
import { setupMiddlewareBodyParserExpress } from './middleware-body-parser-express.js'
import { setupMiddlewareCookieParserExpress } from './middleware-cookie-parser-express.js'
import { setupMiddlewareCorsExpress } from './middleware-cors-express.js'
import { setupOauthGithub } from './oauth-github.js'
import { setupPasswordBcrypt } from './password-bcrypt.js'
import { setupPaymentsStripe } from './payments-stripe.js'
import { setupRateLimitMemory } from './rate-limit-memory.js'
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
    'ANTHROPIC_API_KEY',
    'DATABASE_URL',
    'ENCRYPTION_KEY',
    'MAILGUN_API_KEY',
    'MAILGUN_DOMAIN',
    'OAUTH_GITHUB_CLIENT_ID',
    'OAUTH_GITHUB_CLIENT_SECRET',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'JWT_PRIVATE_KEY',
    'JWT_PUBLIC_KEY',
  ])
  setupEntitlements()
  setupServiceDevice()
  setupServicePayment()
  setupAiAnthropic()
  setupConfigEnv()
  setupDatabasePostgresql()
  setupEmailsMailgun()
  // Encryption — api-credentials.ts encrypts user OAuth tokens at rest.
  // Without a bonded provider, encrypt() throws ("Encryption provider not
  // configured"), so every token save 500s. The AES provider reads ENCRYPTION_KEY
  // (auto-generated in .env from the api-encryption-aes declaration) on first use.
  setupEncryptionAes()
  setupMiddlewareBodyParserExpress()
  setupMiddlewareCookieParserExpress()
  setupMiddlewareCorsExpress()
  setupOauthGithub()
  setupPaymentsStripe()
  setupWebhookHttp()
  setupJwtJsonwebtoken()
  setupPasswordBcrypt()
  setupTwoFactorOtplib()
}
