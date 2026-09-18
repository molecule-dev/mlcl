import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Constant-time HMAC verification.
 * Most providers send `<algo>=<hex>` (GitHub) or just hex (Slack).
 * Compare the computed and provided digests as Buffers of equal length.
 */
export function verifyHmac({
  rawBody,
  secret,
  signature,
  algorithm = 'sha256',
}: {
  rawBody: Buffer
  secret: string
  signature: string
  algorithm?: 'sha256' | 'sha1'
}): boolean {
  const expected = createHmac(algorithm, secret).update(rawBody).digest()
  const provided = Buffer.from(signature.replace(`${algorithm}=`, '').trim(), 'hex')
  // Compare DECODED buffer lengths, never the hex-string lengths: `Buffer.from(hex)`
  // silently truncates at the first invalid hex char, so a wrong-length OR
  // invalid-hex signature (e.g. 64 non-hex chars) would pass a string-length check
  // yet reach timingSafeEqual with a mismatched buffer length — and timingSafeEqual
  // THROWS (RangeError) on unequal lengths. A verifier must return false for any
  // malformed input, never throw (that turns a clean 401 into a 500).
  if (provided.length !== expected.length) return false
  return timingSafeEqual(expected, provided)
}
