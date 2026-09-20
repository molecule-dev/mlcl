/**
 * EmailsMailgun bond setup
 *
 * Wires @molecule/api-emails-mailgun to @molecule/api-emails as the
 * outgoing transport. Required for password-reset, invite, and any
 * other transactional email flow the user-resource handlers trigger.
 */

import { setTransport } from '@molecule/api-emails'
import { provider } from '@molecule/api-emails-mailgun'

export function setupEmailsMailgun(): void {
  setTransport(provider)
}
