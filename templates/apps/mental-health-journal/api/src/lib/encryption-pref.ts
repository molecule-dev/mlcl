/**
 * Whether a journal entry's body should be stored encrypted-at-rest.
 *
 * Honors the user's `privacy.encryption` preference (Settings → Privacy,
 * default on) in addition to the AES provider being bonded. The entry write
 * path used to gate encryption on the provider alone, so toggling the
 * preference off did nothing — and it stored the plaintext `body` even while
 * also writing `body_encrypted`. Callers store the body encrypted XOR plaintext
 * based on this predicate, so the toggle actually controls encryption-at-rest.
 *
 * @module
 */

/**
 * True when the entry body should be encrypted: the AES provider is bonded AND
 * the user has not turned encryption off. Defaults to encrypt when the
 * preference is unset (the app default is `encryption: true`).
 */
export function shouldEncryptEntry(
  preferences: Record<string, unknown> | null | undefined,
  providerBonded: boolean,
): boolean {
  const privacy = (preferences?.privacy ?? {}) as { encryption?: unknown }
  return providerBonded && privacy.encryption !== false
}
