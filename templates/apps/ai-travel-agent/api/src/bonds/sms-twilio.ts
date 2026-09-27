/**
 * SmsTwilio bond setup
 *
 * Wires @molecule/api-sms-twilio to @molecule/api-sms when the TWILIO_* secrets
 * are set. Without them the capture provider is bonded instead: every text the
 * agent sends is recorded and reported as sent, and nothing leaves the machine.
 * Swap in Vonage or any other `@molecule/api-sms-*` bond here.
 */

import { logger } from '@molecule/api-logger'
import { setProvider } from '@molecule/api-sms'
import { provider as capture } from '@molecule/api-sms-capture'
import { createProvider as twilio } from '@molecule/api-sms-twilio'

export function setupSmsTwilio(): void {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    setProvider(twilio())
    return
  }
  logger.info('sms: TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN not set; texts are captured, not sent')
  setProvider(capture)
}
