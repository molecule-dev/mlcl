/**
 * EmailsMailgun bond setup
 *
 * Wires @molecule/api-emails-mailgun as the active email transport so
 * resource-user flows (forgot-password, plan-change receipts, comment
 * notifications, etc.) can deliver real mail in dev and production.
 */

import { setTransport } from '@molecule/api-emails'
import { provider } from '@molecule/api-emails-mailgun'

export function setupEmailsMailgun(): void {
  setTransport(provider)
}
