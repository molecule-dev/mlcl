import { resolveAll } from '@molecule/api-secrets'

import { setupEntitlements } from '../tiers.js'
import { setupAiAnthropic } from './ai-anthropic.js'
import { setupAiEmbeddingsOpenai } from './ai-embeddings-openai.js'
import { setupAiVectorStorePgvector } from './ai-vector-store-pgvector.js'
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
import { setupRateLimitMemory } from './rate-limit-memory.js'
import { setupResourcePaymentPlans } from './resource-payment-plans.js'
import { setupSearchMeilisearch } from './search-meilisearch.js'
import { setupSecretsEnv } from './secrets-env.js'
import { setupServiceDevice } from './service-device.js'
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
  setupApiAnalyticsDefault()
  // Secrets provider must be bonded first so resolveAll can load .env values
  setupSecretsEnv()

  await resolveAll([
    'ANTHROPIC_API_KEY',
    'DATABASE_URL',
    'JWT_PRIVATE_KEY',
    'JWT_PUBLIC_KEY',
    'MAILGUN_API_KEY',
    'MAILGUN_DOMAIN',
  ])
  setupServiceDevice()
  setupAiAnthropic()
  setupAiEmbeddingsOpenai()
  setupAiVectorStorePgvector()
  setupConfigEnv()
  setupDatabasePostgresql()
  setupEmailsMailgun()
  setupEntitlements()
  setupMiddlewareBodyParserExpress()
  setupMiddlewareCookieParserExpress()
  setupMiddlewareCorsExpress()
  setupSearchMeilisearch()
  setupJwtJsonwebtoken()
  setupPasswordBcrypt()
  setupTwoFactorOtplib()
  setupPaymentsStripe()
  setupResourcePaymentPlans()
}
