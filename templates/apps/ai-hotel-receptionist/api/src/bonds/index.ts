import { provider as llmAgentsProvider } from '@molecule/api-ai-agents-llm'
import { bond } from '@molecule/api-bond'
import { logger } from '@molecule/api-logger'
import { resolveAll } from '@molecule/api-secrets'

import { seedGlobalPmsIfEmpty } from '../handlers/_seed.js'
import { setupEntitlements } from '../tiers.js'
import { setupAiAnthropic } from './ai-anthropic.js'
import { setupAiSpeechOpenai } from './ai-speech-openai.js'
import { setupConfigEnv } from './config-env.js'
import { setupDatabasePostgresql } from './database-postgresql.js'
import { setupEmailsMailgun } from './emails-mailgun.js'
import { setupJwtJsonwebtoken } from './jwt-jsonwebtoken.js'
import { setupMiddlewareBodyParserExpress } from './middleware-body-parser-express.js'
import { setupMiddlewareCookieParserExpress } from './middleware-cookie-parser-express.js'
import { setupMiddlewareCorsExpress } from './middleware-cors-express.js'
import { setupPasswordBcrypt } from './password-bcrypt.js'
import { setupRateLimitMemory } from './rate-limit-memory.js'
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
  // Secrets provider must be bonded first so resolveAll can load .env values
  setupSecretsEnv()

  await resolveAll([
    'ANTHROPIC_API_KEY',
    'OPENAI_API_KEY',
    'DATABASE_URL',
    'MAILGUN_API_KEY',
    'MAILGUN_DOMAIN',
    'JWT_PRIVATE_KEY',
    'JWT_PUBLIC_KEY',
  ])
  setupEntitlements()
  setupServiceDevice()
  setupAiAnthropic()
  // The voice receptionist's tool-calling loop runs on the agents bond —
  // the llm provider composes the Anthropic chat bond above. When the key
  // is absent the run() call fails per turn and calls.ts falls back to the
  // scripted engine, so this bond stays unconditional.
  bond('ai-agents', llmAgentsProvider)
  setupAiSpeechOpenai()
  setupConfigEnv()
  setupDatabasePostgresql()
  setupEmailsMailgun()
  setupMiddlewareBodyParserExpress()
  setupMiddlewareCookieParserExpress()
  setupMiddlewareCorsExpress()
  setupJwtJsonwebtoken()
  setupPasswordBcrypt()
  setupTwoFactorOtplib()

  // Seed the demo property (room types, rooms, rate plans, guests, voice
  // agents, sample reservations + calls) if empty. Idempotent; safe to
  // re-run on every boot. Listing endpoints need rows to be present for the
  // demo UI and e2e tests.
  try {
    const result = await seedGlobalPmsIfEmpty()
    logger.info?.(`seed ok: ${JSON.stringify(result)}`)
  } catch (error) {
    logger.warn?.(`seed failed: ${(error as Error).message}`)
  }
}
