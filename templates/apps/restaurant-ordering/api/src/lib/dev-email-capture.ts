/**
 * E2E-only outbound-email capture for the password-reset round-trip.
 *
 * The user resource stores reset tokens HASHED (sha256) in `usersSecrets` —
 * a DB read never yields a usable token — so the only place the RAW token
 * exists is the outbound reset email. This module simulates the user's
 * inbox: the email bond wrapper (see `bonds/index.ts`) mirrors every
 * outgoing message here, and `GET /users/reset-token` (handlers/_debug.ts)
 * serves the captured token, exactly the handoff a real user gets from
 * reading their email.
 *
 * Fail-closed like the rest of the debug surface [P5TPL-1]: nothing is
 * captured unless `ENABLE_E2E_TEST_ENDPOINTS=true`, so a production app
 * never retains email contents in memory.
 *
 * @module
 */

const RESET_TOKEN_PATTERN = /\b[0-9a-f]{64}\b/

const capturedResetTokens = new Map<string, string>()

function normalizeAddress(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

/**
 * Inspect one outgoing email and, when it carries a password-reset token
 * (a 64-hex-char token in the text or HTML body), remember it for the
 * recipient. Safe to call for every message — non-matching mail is ignored.
 */
export function captureOutboundEmail(mail: { to?: unknown; text?: unknown; html?: unknown }): void {
  const to = normalizeAddress(mail.to)
  if (!to) return
  const body = `${typeof mail.text === 'string' ? mail.text : ''} ${
    typeof mail.html === 'string' ? mail.html : ''
  }`
  const match = RESET_TOKEN_PATTERN.exec(body)
  if (match) {
    capturedResetTokens.set(to, match[0])
  }
}

/**
 * The raw reset token most recently captured for `email`, or null when the
 * e2e flag is off, no reset email went out, or the transport never surfaced
 * the token.
 */
export function getCapturedResetToken(email: string): string | null {
  return capturedResetTokens.get(email.trim().toLowerCase()) ?? null
}

/** True when the e2e capture surface is armed. */
export function isE2ECaptureEnabled(): boolean {
  return process.env.ENABLE_E2E_TEST_ENDPOINTS === 'true'
}
