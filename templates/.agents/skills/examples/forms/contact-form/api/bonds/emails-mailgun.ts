/**
 * EmailsMailgun bond setup
 *
 * Wires @molecule/api-emails-mailgun to @molecule/api-emails as the active transport.
 * Always wire via setTransport() (the core's canonical accessor) — NOT bond('email'/'emails').
 * The emails core registers under the bond key 'email' (singular); a bond('emails', ...) call
 * registers under the wrong key, so sendMail() never finds the transport and every send fails
 * silently. setTransport() uses the correct key internally, so it can never drift.
 */

import { setTransport } from '@molecule/api-emails'
import { provider } from '@molecule/api-emails-mailgun'

export function setupEmails(): void {
  setTransport(provider)
}
