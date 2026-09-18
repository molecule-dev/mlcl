/**
 * EmailsMailgun bond setup
 *
 * Wires @molecule/api-emails-mailgun to @molecule/api-emails as the
 * default transport. Required by transactional emails (collaboration
 * invites, payment receipts).
 */

import { setTransport } from '@molecule/api-emails'
import { provider } from '@molecule/api-emails-mailgun'

export function setupEmailsMailgun(): void {
  setTransport(provider)
}
