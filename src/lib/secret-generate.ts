/**
 * Auto-generation of generatable secrets at scaffold time.
 *
 * Secrets marked with `generate` in the registry (JWT RSA keypair, Web Push
 * VAPID keypair, random hex keys) never require user setup — they are
 * generated here and written into the scaffolded `.env` so the app is fully
 * functional out of the box. Keypair kinds are generated once per call and
 * shared across their two halves.
 *
 * @module
 */

import { createECDH, generateKeyPairSync, randomBytes } from 'node:crypto'

import type { MoleculeSecret } from './schema.js'

/**
 * PEM values span multiple lines, but `.env` values are single-line. Encode
 * newlines as literal `\n` — consumers normalize them back (e.g.
 * `@molecule/api-jwt`'s `normalizePem`, which exists precisely because
 * `--env-file`/dotenv readers keep the backslash-escapes literal).
 */
const escapeEnvMultiline = (value: string): string => value.trimEnd().replace(/\n/g, '\\n')

/**
 * Generates a Web Push VAPID key pair (P-256), base64url-encoded the way the
 * `web-push` library expects: 65-byte uncompressed public point, 32-byte
 * private scalar (left-padded when the scalar has leading zero bytes).
 *
 * @returns The base64url-encoded `publicKey` and `privateKey`.
 */
export const generateVapidKeys = (): { publicKey: string; privateKey: string } => {
  const ecdh = createECDH('prime256v1')
  ecdh.generateKeys()
  const priv = ecdh.getPrivateKey()
  const padded = priv.length < 32 ? Buffer.concat([Buffer.alloc(32 - priv.length), priv]) : priv
  return {
    publicKey: ecdh.getPublicKey().toString('base64url'),
    privateKey: padded.toString('base64url'),
  }
}

/**
 * Generates values for every auto-generatable secret in the list.
 *
 * @param secrets - Secrets to inspect; entries without `generate` are skipped.
 * @returns Map of secret name → generated value (env-safe, single line).
 */
export function generateSecretValues(secrets: MoleculeSecret[]): Map<string, string> {
  const out = new Map<string, string>()
  let rsa: { publicKey: string; privateKey: string } | undefined
  let vapid: { publicKey: string; privateKey: string } | undefined

  for (const secret of secrets) {
    switch (secret.generate) {
      case 'rsa-keypair-private':
      case 'rsa-keypair-public': {
        rsa ??= generateKeyPairSync('rsa', {
          modulusLength: 2048,
          publicKeyEncoding: { type: 'spki', format: 'pem' },
          privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        })
        out.set(
          secret.name,
          escapeEnvMultiline(
            secret.generate === 'rsa-keypair-private' ? rsa.privateKey : rsa.publicKey,
          ),
        )
        break
      }
      case 'vapid-public':
      case 'vapid-private': {
        vapid ??= generateVapidKeys()
        out.set(
          secret.name,
          secret.generate === 'vapid-public' ? vapid.publicKey : vapid.privateKey,
        )
        break
      }
      case 'random-hex-32': {
        out.set(secret.name, randomBytes(32).toString('hex'))
        break
      }
      case undefined:
        break
    }
  }

  return out
}
