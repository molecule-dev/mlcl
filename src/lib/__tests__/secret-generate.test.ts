import { constants, createECDH, createSign, createVerify } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import type { MoleculeSecret } from '../schema.js'
import { generateSecretValues, generateVapidKeys } from '../secret-generate.js'

const secret = (name: string, generate?: MoleculeSecret['generate']): MoleculeSecret => ({
  name,
  required: true,
  ...(generate ? { generate } : {}),
})

describe('generateVapidKeys', () => {
  it('generates web-push-compatible base64url keys', () => {
    const { publicKey, privateKey } = generateVapidKeys()

    const pub = Buffer.from(publicKey, 'base64url')
    const priv = Buffer.from(privateKey, 'base64url')

    // Uncompressed P-256 point: 65 bytes starting with 0x04
    expect(pub).toHaveLength(65)
    expect(pub[0]).toBe(0x04)
    // Private scalar: exactly 32 bytes (left-padded when needed)
    expect(priv).toHaveLength(32)
    // base64url alphabet only (no +, /, =)
    expect(publicKey).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(privateKey).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('generates a fresh pair per call', () => {
    expect(generateVapidKeys().publicKey).not.toBe(generateVapidKeys().publicKey)
  })
})

describe('generateSecretValues', () => {
  it('skips secrets without a generate kind', () => {
    const values = generateSecretValues([secret('STRIPE_SECRET_KEY')])
    expect(values.size).toBe(0)
  })

  it('generates 64-char hex for random-hex-32', () => {
    const values = generateSecretValues([secret('ENCRYPTION_KEY', 'random-hex-32')])
    expect(values.get('ENCRYPTION_KEY')).toMatch(/^[0-9a-f]{64}$/)
  })

  it('generates a matching RSA keypair across both halves', () => {
    const values = generateSecretValues([
      secret('JWT_PRIVATE_KEY', 'rsa-keypair-private'),
      secret('JWT_PUBLIC_KEY', 'rsa-keypair-public'),
    ])

    const unescape = (v: string): string => v.replace(/\\n/g, '\n')
    const privatePem = unescape(values.get('JWT_PRIVATE_KEY')!)
    const publicPem = unescape(values.get('JWT_PUBLIC_KEY')!)

    expect(privatePem).toContain('-----BEGIN PRIVATE KEY-----')
    expect(publicPem).toContain('-----BEGIN PUBLIC KEY-----')
    // env-safe: single line until unescaped
    expect(values.get('JWT_PRIVATE_KEY')).not.toContain('\n')

    // The two halves belong to the SAME keypair: sign with one, verify with the other
    const signer = createSign('RSA-SHA256')
    signer.update('molecule')
    const signature = signer.sign({ key: privatePem, padding: constants.RSA_PKCS1_PADDING })
    const verifier = createVerify('RSA-SHA256')
    verifier.update('molecule')
    expect(
      verifier.verify({ key: publicPem, padding: constants.RSA_PKCS1_PADDING }, signature),
    ).toBe(true)
  })

  it('generates a matching VAPID pair across both halves', () => {
    const values = generateSecretValues([
      secret('VAPID_PUBLIC_KEY', 'vapid-public'),
      secret('VAPID_PRIVATE_KEY', 'vapid-private'),
    ])
    // Re-deriving the public key from the private scalar must give the stored public key
    const ecdh = createECDH('prime256v1')
    ecdh.setPrivateKey(Buffer.from(values.get('VAPID_PRIVATE_KEY')!, 'base64url'))
    expect(ecdh.getPublicKey().toString('base64url')).toBe(values.get('VAPID_PUBLIC_KEY'))
  })
})
