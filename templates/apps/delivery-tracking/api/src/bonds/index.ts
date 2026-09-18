import { resolveAll } from '@molecule/api-secrets'

import { seedGlobalCarriersIfEmpty } from '../handlers/_seed.js'
import { setupEntitlements } from '../tiers.js'
import { setupConfigEnv } from './config-env.js'
import { setupCronNodeCron } from './cron-node-cron.js'
import { setupDatabasePostgresql } from './database-postgresql.js'
import { setupEmailsMailgun } from './emails-mailgun.js'
import { setupGeolocationNominatim } from './geolocation-nominatim.js'
import { setupJwtJsonwebtoken } from './jwt-jsonwebtoken.js'
import { setupMiddlewareBodyParserExpress } from './middleware-body-parser-express.js'
import { setupMiddlewareCookieParserExpress } from './middleware-cookie-parser-express.js'
import { setupMiddlewareCorsExpress } from './middleware-cors-express.js'
import { setupPasswordBcrypt } from './password-bcrypt.js'
import { setupPaymentsStripe } from './payments-stripe.js'
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
  // Geolocation transport — tracking.ts geocode()s a shipment event's `location`
  // string into lat/lng for the map. Without a bonded provider, geocode() throws
  // (caught + logged), so events silently never get coordinates. Nominatim uses the
  // free public API by default (no key/infra), so wiring it makes geocoding work.
  setupGeolocationNominatim()
  setupMiddlewareBodyParserExpress()
  setupMiddlewareCookieParserExpress()
  setupMiddlewareCorsExpress()
  setupPaymentsStripe()
  // Realtime transport — without this, the `broadcast('shipment:<id>', …)` calls in
  // handlers/tracking.ts have NO bonded provider and are a silent no-op (the public
  // live-tracking room never receives anything). `setupRealtimeSocketio` binds
  // Socket.io and defers the attach to the API's HTTP server via the server-created
  // hook. The `shipment:<id>` room is intentionally public (the GET tracking route is
  // unauthenticated), so no `onJoinRequest` guard is registered.
  setupRealtimeSocketio()
  setupJwtJsonwebtoken()
  setupPasswordBcrypt()
  setupTwoFactorOtplib()

  // Seed the global carrier catalog (UPS/FedEx/USPS/DHL/Amazon) once the
  // database bond is wired. Carriers are global, tenant-shared reference data
  // (no user_id) — every operator expects to see the standard integrations in
  // the directory, and the per-user demo seed maps shipment.carrier_id against
  // these rows. Idempotent: a no-op once the table is populated.
  await seedGlobalCarriersIfEmpty()
}
