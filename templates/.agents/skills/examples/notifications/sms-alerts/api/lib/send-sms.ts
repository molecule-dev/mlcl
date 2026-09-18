import { getLogger } from '@molecule/api-bond'
import { consume } from '@molecule/api-rate-limit'
import { send } from '@molecule/api-sms'

const logger = getLogger()

export type SendSmsResult = { ok: boolean; id?: string; error?: string }

/**
 * The single, reusable path for sending an SMS. Call it from any feature/event
 * that needs to text a user (alerts, reminders, confirmations).
 *
 * SMS is METERED (every message costs money) and a spam/abuse vector, so this
 * wrapper enforces the two rules the core `@molecule/api-sms` docs call out:
 *
 * - **`to` must be E.164** (`+<country><number>`, e.g. `+15551234567`). Providers
 *   reject anything else; validate here so a bad number fails fast, not as an
 *   opaque provider error.
 * - **Throttle per recipient.** A loop or abuse can otherwise run up the bill.
 *
 * The CALLER is responsible for the other rule: `to` must be a number from your
 * OWN trusted server-side data (the authenticated user's stored number, a
 * record's contact) — NEVER a value from the request body. Texting an arbitrary
 * caller-supplied number is an open SMS relay (spam + cost abuse). See the
 * handler in this example.
 */
export async function sendSms(to: string, message: string): Promise<SendSmsResult> {
  if (!/^\+[1-9]\d{6,14}$/.test(to)) {
    return { ok: false, error: 'Recipient must be an E.164 number, e.g. +15551234567.' }
  }

  const rl = await consume(`sms:${to}`)
  if (!rl.allowed) {
    return { ok: false, error: 'Too many messages to this number — try again shortly.' }
  }

  try {
    const result = await send(to, message)
    // 'failed' is a terminal provider status; treat it as a failed send, not ok.
    return result.status === 'failed'
      ? { ok: false, id: result.id, error: 'The SMS provider rejected the message.' }
      : { ok: true, id: result.id }
  } catch (error) {
    logger.error('SMS send failed', { error })
    return { ok: false, error: error instanceof Error ? error.message : 'SMS send failed' }
  }
}
