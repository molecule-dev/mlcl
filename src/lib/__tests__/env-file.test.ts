import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, describe, expect, it } from 'vitest'

import {
  appendSecretsToEnvFile,
  filterEnvSecrets,
  parseEnvKeys,
  renderEnvSecretLines,
  resolveDatabaseUrlValue,
} from '../env-file.js'
import type { MoleculeSecret } from '../schema.js'

// ---------------------------------------------------------------------------
// Temp directory management
// ---------------------------------------------------------------------------
const tempDirs: string[] = []

async function createTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'mlcl-test-env-file-'))
  tempDirs.push(dir)
  return dir
}

afterAll(async () => {
  for (const dir of tempDirs) {
    await rm(dir, { recursive: true, force: true })
  }
})

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const stripeSecrets: MoleculeSecret[] = [
  {
    name: 'STRIPE_SECRET_KEY',
    required: true,
    label: 'Stripe secret key',
    setupUrl: 'https://dashboard.stripe.com/apikeys',
    instructions: 'Stripe Dashboard → Developers → API keys.',
    example: 'sk_test_...',
  },
  {
    name: 'STRIPE_WEBHOOK_SECRET',
    required: true,
    label: 'Stripe webhook signing secret',
    setupUrl: 'https://dashboard.stripe.com/webhooks',
    example: 'whsec_...',
  },
]

describe('parseEnvKeys', () => {
  it('parses active assignment keys', () => {
    const keys = parseEnvKeys('PORT=4000\nDATABASE_URL=postgres://x\nEMPTY=\n')
    expect(keys).toEqual(new Set(['PORT', 'DATABASE_URL', 'EMPTY']))
  })

  it('treats commented-out assignments as present', () => {
    const keys = parseEnvKeys('# STRIPE_SECRET_KEY=sk_test_abc\n#DEBUG=1\n')
    expect(keys.has('STRIPE_SECRET_KEY')).toBe(true)
    expect(keys.has('DEBUG')).toBe(true)
  })

  it('ignores guidance comments and blank lines', () => {
    const keys = parseEnvKeys(
      '# Stripe secret key — Stripe Dashboard → Developers → API keys.\n' +
        '# Get it here: https://dashboard.stripe.com/apikeys?project=x\n' +
        '# Example: sk_test_...\n\n',
    )
    expect(keys.size).toBe(0)
  })

  it('supports export-prefixed assignments', () => {
    const keys = parseEnvKeys('export NODE_ENV=production\n')
    expect(keys).toEqual(new Set(['NODE_ENV']))
  })
})

describe('filterEnvSecrets', () => {
  const secrets: MoleculeSecret[] = [
    { name: 'STRIPE_SECRET_KEY', required: true },
    { name: 'VITE_SENTRY_DSN', required: false },
    { name: 'STRIPE_SECRET_KEY', required: true },
    { name: 'PORT', required: false, default: '4000' },
  ]

  it('keeps only non-VITE secrets for api projects, deduplicated', () => {
    const result = filterEnvSecrets(secrets, 'api')
    expect(result.map((s) => s.name)).toEqual(['STRIPE_SECRET_KEY', 'PORT'])
  })

  it('keeps only VITE_ secrets for app projects', () => {
    const result = filterEnvSecrets(secrets, 'app')
    expect(result.map((s) => s.name)).toEqual(['VITE_SENTRY_DSN'])
  })

  it('skips excluded keys', () => {
    const result = filterEnvSecrets(secrets, 'api', ['PORT'])
    expect(result.map((s) => s.name)).toEqual(['STRIPE_SECRET_KEY'])
  })

  it('routes browser-side VITE_ analytics keys to app projects and API twins to api projects', () => {
    // Real-world shape: a full-stack project selecting BOTH analytics bonds.
    // The app bond registers VITE_-prefixed browser credentials (the names the
    // scaffolded bond files read via import.meta.env); the api bond registers
    // the server-side twins. Each project type's .env gets exactly its own —
    // without the VITE_ prefix an app-side credential could NEVER reach the
    // browser (Vite only embeds VITE_* and this filter drops the rest).
    const analyticsSecrets: MoleculeSecret[] = [
      { name: 'VITE_POSTHOG_KEY', required: true }, // @molecule/app-analytics-posthog
      { name: 'VITE_POSTHOG_HOST', required: false }, // @molecule/app-analytics-posthog
      { name: 'VITE_MIXPANEL_TOKEN', required: true }, // @molecule/app-analytics-mixpanel
      { name: 'POSTHOG_API_KEY', required: true }, // @molecule/api-analytics-posthog
      { name: 'POSTHOG_HOST', required: false }, // @molecule/api-analytics-posthog
      { name: 'MIXPANEL_TOKEN', required: true }, // @molecule/api-analytics-mixpanel
    ]
    expect(filterEnvSecrets(analyticsSecrets, 'app').map((s) => s.name)).toEqual([
      'VITE_POSTHOG_KEY',
      'VITE_POSTHOG_HOST',
      'VITE_MIXPANEL_TOKEN',
    ])
    expect(filterEnvSecrets(analyticsSecrets, 'api').map((s) => s.name)).toEqual([
      'POSTHOG_API_KEY',
      'POSTHOG_HOST',
      'MIXPANEL_TOKEN',
    ])
  })
})

describe('resolveDatabaseUrlValue', () => {
  it('binds the myapp placeholder to a db-safe project name', () => {
    expect(
      resolveDatabaseUrlValue('postgres://molecule:molecule@127.0.0.1:5432/myapp', 'my-blog'),
    ).toBe('postgres://molecule:molecule@127.0.0.1:5432/my_blog')
  })

  it('falls back to a local-Docker default when no registry default exists', () => {
    expect(resolveDatabaseUrlValue('', 'my-blog')).toBe(
      'postgres://molecule:molecule@127.0.0.1:5432/my_blog',
    )
  })
})

describe('renderEnvSecretLines', () => {
  it('renders the same commented block generateEnvFile scaffolds', () => {
    const lines = renderEnvSecretLines(stripeSecrets[0], '', {
      generated: false,
      generatedBy: 'mlcl create',
    })
    expect(lines).toEqual([
      '# Stripe secret key — Stripe Dashboard → Developers → API keys.',
      '# Get it here: https://dashboard.stripe.com/apikeys',
      '# Example: sk_test_...',
      'STRIPE_SECRET_KEY=',
    ])
  })

  it('marks optional secrets and omits the example when a value exists', () => {
    const lines = renderEnvSecretLines(
      {
        name: 'POSTHOG_HOST',
        required: false,
        label: 'PostHog host',
        instructions: 'Origin of your PostHog instance.',
        example: 'https://us.i.posthog.com',
        default: 'https://us.i.posthog.com',
      },
      'https://us.i.posthog.com',
      { generated: false, generatedBy: 'mlcl create' },
    )
    expect(lines).toEqual([
      '# PostHog host (optional) — Origin of your PostHog instance.',
      'POSTHOG_HOST=https://us.i.posthog.com',
    ])
  })

  it('attributes auto-generated values to the invoking command and drops setup guidance', () => {
    const lines = renderEnvSecretLines(
      {
        name: 'ENCRYPTION_KEY',
        required: true,
        label: 'Encryption key',
        setupUrl: 'https://example.com',
        generate: 'random-hex-32',
      },
      'abc123',
      { generated: true, generatedBy: 'mlcl inject' },
    )
    expect(lines).toEqual([
      '# Encryption key',
      '# Auto-generated by mlcl inject — no setup needed.',
      'ENCRYPTION_KEY=abc123',
    ])
  })
})

describe('appendSecretsToEnvFile', () => {
  it('creates .env with a header when the file does not exist', async () => {
    const dir = await createTempDir()
    const result = await appendSecretsToEnvFile(dir, stripeSecrets, 'api')

    expect(result.created).toBe(true)
    expect(result.appended.map((s) => s.name)).toEqual([
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
    ])
    expect(result.skipped).toEqual([])

    const content = await readFile(join(dir, '.env'), 'utf-8')
    expect(content.startsWith('# Environment variables\n# Generated by mlcl inject\n\n')).toBe(true)
    expect(content).toContain('# Stripe secret key — Stripe Dashboard → Developers → API keys.')
    expect(content).toContain('# Get it here: https://dashboard.stripe.com/apikeys')
    expect(content).toContain('# Example: sk_test_...')
    expect(content).toContain('STRIPE_SECRET_KEY=\n')
    expect(content).toContain('STRIPE_WEBHOOK_SECRET=\n')
    expect(content.endsWith('\n')).toBe(true)
  })

  it('appends only missing keys and preserves existing content byte-for-byte', async () => {
    const dir = await createTempDir()
    const existing = '# Environment variables\nPORT=4000\nSTRIPE_SECRET_KEY=sk_live_keepme\n'
    await writeFile(join(dir, '.env'), existing)

    const result = await appendSecretsToEnvFile(dir, stripeSecrets, 'api')

    expect(result.created).toBe(false)
    expect(result.appended.map((s) => s.name)).toEqual(['STRIPE_WEBHOOK_SECRET'])
    expect(result.skipped).toEqual(['STRIPE_SECRET_KEY'])

    const content = await readFile(join(dir, '.env'), 'utf-8')
    expect(content.startsWith(existing)).toBe(true)
    // The existing value was not overwritten and the key appears exactly once
    expect(content).toContain('STRIPE_SECRET_KEY=sk_live_keepme')
    expect(content.match(/^STRIPE_SECRET_KEY=/gm)).toHaveLength(1)
    expect(content).toContain('# Stripe webhook signing secret')
    expect(content).toContain('STRIPE_WEBHOOK_SECRET=\n')
  })

  it('is idempotent — a re-run appends nothing new', async () => {
    const dir = await createTempDir()
    await appendSecretsToEnvFile(dir, stripeSecrets, 'api')
    const afterFirst = await readFile(join(dir, '.env'), 'utf-8')

    const result = await appendSecretsToEnvFile(dir, stripeSecrets, 'api')
    const afterSecond = await readFile(join(dir, '.env'), 'utf-8')

    expect(result.appended).toEqual([])
    expect(result.skipped).toEqual(['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'])
    expect(afterSecond).toBe(afterFirst)
  })

  it('auto-generates generate-marked secrets with real values', async () => {
    const dir = await createTempDir()
    const secrets: MoleculeSecret[] = [
      { name: 'ENCRYPTION_KEY', required: true, generate: 'random-hex-32' },
      { name: 'VAPID_PUBLIC_KEY', required: true, generate: 'vapid-public' },
      { name: 'VAPID_PRIVATE_KEY', required: true, generate: 'vapid-private' },
      { name: 'JWT_PRIVATE_KEY', required: true, generate: 'rsa-keypair-private' },
      { name: 'JWT_PUBLIC_KEY', required: true, generate: 'rsa-keypair-public' },
    ]
    const result = await appendSecretsToEnvFile(dir, secrets, 'api')

    expect(result.appended.every((s) => s.generated)).toBe(true)

    const content = await readFile(join(dir, '.env'), 'utf-8')
    expect(content).toMatch(/^ENCRYPTION_KEY=[0-9a-f]{64}$/m)
    expect(content).toMatch(/^VAPID_PUBLIC_KEY=[A-Za-z0-9_-]{80,}$/m)
    expect(content).toMatch(/^VAPID_PRIVATE_KEY=[A-Za-z0-9_-]{40,}$/m)
    // PEM values are single-line with literal \n escapes (normalizePem-compatible)
    expect(content).toMatch(/^JWT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\\n/m)
    expect(content).toMatch(/^JWT_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----\\n/m)
    expect(content).toContain('# Auto-generated by mlcl inject — no setup needed.')
    expect(content).not.toContain('# Get it here:')
  })

  it('treats a commented-out assignment as present and never re-appends it', async () => {
    const dir = await createTempDir()
    await writeFile(join(dir, '.env'), '# STRIPE_SECRET_KEY=sk_test_disabled\n')

    const result = await appendSecretsToEnvFile(dir, [stripeSecrets[0]], 'api')

    expect(result.appended).toEqual([])
    expect(result.skipped).toEqual(['STRIPE_SECRET_KEY'])
    const content = await readFile(join(dir, '.env'), 'utf-8')
    expect(content).toBe('# STRIPE_SECRET_KEY=sk_test_disabled\n')
  })

  it('filters secrets by project type (app keeps only VITE_ vars)', async () => {
    const dir = await createTempDir()
    const secrets: MoleculeSecret[] = [
      { name: 'STRIPE_SECRET_KEY', required: true },
      { name: 'VITE_SENTRY_DSN', required: false, label: 'Sentry DSN' },
    ]
    const result = await appendSecretsToEnvFile(dir, secrets, 'app')

    expect(result.appended.map((s) => s.name)).toEqual(['VITE_SENTRY_DSN'])
    const content = await readFile(join(dir, '.env'), 'utf-8')
    expect(content).toContain('VITE_SENTRY_DSN=')
    expect(content).not.toContain('STRIPE_SECRET_KEY')
  })

  it('binds DATABASE_URL to the project name when appended', async () => {
    const dir = await createTempDir()
    const secrets: MoleculeSecret[] = [
      {
        name: 'DATABASE_URL',
        required: true,
        default: 'postgres://molecule:molecule@127.0.0.1:5432/myapp',
      },
    ]
    await appendSecretsToEnvFile(dir, secrets, 'api', 'my-blog')

    const content = await readFile(join(dir, '.env'), 'utf-8')
    expect(content).toContain('DATABASE_URL=postgres://molecule:molecule@127.0.0.1:5432/my_blog')
  })

  it('separates the appended block from a file that lacks a trailing newline', async () => {
    const dir = await createTempDir()
    await writeFile(join(dir, '.env'), 'PORT=4000')

    await appendSecretsToEnvFile(dir, [stripeSecrets[1]], 'api')

    const content = await readFile(join(dir, '.env'), 'utf-8')
    expect(content.startsWith('PORT=4000\n\n')).toBe(true)
    expect(content).toContain('STRIPE_WEBHOOK_SECRET=')
  })

  it('attributes the created-file header and generated values to options.generatedBy', async () => {
    const dir = await createTempDir()
    const secrets: MoleculeSecret[] = [
      ...stripeSecrets,
      { name: 'SESSION_SECRET', required: true, generate: 'random-hex-32' },
    ]

    await appendSecretsToEnvFile(dir, secrets, 'api', 'my-app', { generatedBy: 'mlcl swap' })

    const content = await readFile(join(dir, '.env'), 'utf-8')
    expect(content).toContain('# Generated by mlcl swap')
    expect(content).toContain('# Auto-generated by mlcl swap — no setup needed.')
    expect(content).not.toContain('mlcl inject')
  })

  it('dry-run reports what a real run would append without touching the filesystem', async () => {
    const dir = await createTempDir()
    await writeFile(join(dir, '.env'), 'STRIPE_SECRET_KEY=sk_live_set\n')
    const secrets: MoleculeSecret[] = [
      ...stripeSecrets,
      { name: 'SESSION_SECRET', required: true, generate: 'random-hex-32' },
    ]

    const preview = await appendSecretsToEnvFile(dir, secrets, 'api', 'my-app', { dryRun: true })

    expect(preview.appended.map((s) => s.name)).toEqual(['STRIPE_WEBHOOK_SECRET', 'SESSION_SECRET'])
    expect(preview.appended.find((s) => s.name === 'SESSION_SECRET')?.generated).toBe(true)
    expect(preview.skipped).toEqual(['STRIPE_SECRET_KEY'])
    // The file is untouched — byte-for-byte.
    expect(await readFile(join(dir, '.env'), 'utf-8')).toBe('STRIPE_SECRET_KEY=sk_live_set\n')
  })

  it('dry-run against a missing .env reports created=true and creates nothing', async () => {
    const dir = await createTempDir()

    const preview = await appendSecretsToEnvFile(dir, stripeSecrets, 'api', 'my-app', {
      dryRun: true,
    })

    expect(preview.created).toBe(true)
    expect(preview.appended).toHaveLength(2)
    await expect(readFile(join(dir, '.env'), 'utf-8')).rejects.toThrow()
  })
})
