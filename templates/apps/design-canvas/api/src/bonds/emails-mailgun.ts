/**
 * EmailsMailgun bond setup
 *
 * Wires @molecule/api-emails-mailgun to @molecule/api-emails so the
 * forgot-password / reset-password handlers (which call sendMail through
 * the @molecule/api-emails interface) actually deliver email.
 */

import { setTransport } from '@molecule/api-emails'
import { provider } from '@molecule/api-emails-mailgun'

export function setupEmailsMailgun(): void {
  setTransport(provider)
}
