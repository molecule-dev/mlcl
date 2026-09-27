import { logger } from '@molecule/api-logger'
import { resolveAll } from '@molecule/api-secrets'

import { seedGlobalFlightsIfEmpty } from '../handlers/_seed.js'
import { scheduleDelayWatch } from '../lib/delay-watch.js'
import { setupEntitlements } from '../tiers.js'
import { setupAiAgentsLlm } from './ai-agents-llm.js'
import { setupAiAnthropic } from './ai-anthropic.js'
// ElevenLabs setup is intentionally not registered: its `setProvider` is a
// singleton that's silently overwritten by ai-speech-openai's `setProvider`
// later in this list. Without OpenAI's Whisper transcription would also
// stop working. ElevenLabs voices stay reachable through the optional
// `provider: 'elevenlabs'` field on /api/speech/synthesize.
import { setupAiSpeechOpenai } from './ai-speech-openai.js'
import { setupConfigEnv } from './config-env.js'
import { setupCronNodeCron } from './cron-node-cron.js'
import { setupDatabasePostgresql } from './database-postgresql.js'
import { setupEmailsMailgun } from './emails-mailgun.js'
import { setupFlightsAmadeus } from './flights-amadeus.js'
import { setupJwtJsonwebtoken } from './jwt-jsonwebtoken.js'
import { setupMiddlewareBodyParserExpress } from './middleware-body-parser-express.js'
import { setupMiddlewareCookieParserExpress } from './middleware-cookie-parser-express.js'
import { setupMiddlewareCorsExpress } from './middleware-cors-express.js'
import { setupPasswordBcrypt } from './password-bcrypt.js'
import { setupPaymentsStripe } from './payments-stripe.js'
import { setupRateLimitMemory } from './rate-limit-memory.js'
import { setupSecretsEnv } from './secrets-env.js'
import { setupServiceDevice } from './service-device.js'
import { setupServicePayment } from './service-payment.js'
import { setupSmsTwilio } from './sms-twilio.js'
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
    'DATABASE_URL',
    'MAILGUN_API_KEY',
    'MAILGUN_DOMAIN',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'JWT_PRIVATE_KEY',
    'JWT_PUBLIC_KEY',
  ])
  setupEntitlements()
  setupServiceDevice()
  setupServicePayment()
  setupAiAnthropic()
  setupAiAgentsLlm()
  setupAiSpeechOpenai()
  setupConfigEnv()
  setupDatabasePostgresql()
  setupEmailsMailgun()
  setupFlightsAmadeus()
  setupSmsTwilio()
  setupCronNodeCron()
  setupMiddlewareBodyParserExpress()
  setupMiddlewareCookieParserExpress()
  setupMiddlewareCorsExpress()
  setupPaymentsStripe()
  setupJwtJsonwebtoken()
  setupPasswordBcrypt()
  setupTwoFactorOtplib()

  // The inventory the agent searches without a flights provider. Idempotent.
  try {
    await seedGlobalFlightsIfEmpty()
  } catch (error) {
    logger.warn('flight inventory seed skipped', { error })
  }
  // Rebook delayed flights every ten minutes.
  try {
    await scheduleDelayWatch()
  } catch (error) {
    logger.warn('delay watch not scheduled', { error })
  }
}
