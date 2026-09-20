/**
 * EmailsMailgun bond setup
 *
 * Wires @molecule/api-emails-mailgun as the active email transport so
 * forgot-password / verification / digest emails are actually delivered
 * via the real provider in development and production.
 */

import { setTransport } from '@molecule/api-emails'
import { provider } from '@molecule/api-emails-mailgun'

export function setupEmailsMailgun(): void {
  setTransport(provider)
}
