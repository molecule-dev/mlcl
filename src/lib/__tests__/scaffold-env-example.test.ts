/**
 * `generateEnvFile` used to write its generated key-name `.env.example`
 * unconditionally — clobbering the curated example the copy step had just
 * PRESERVED for the two templates that ship one (static-site /
 * static-site-thin document VITE_SITE_URL / BASE_PATH there). Every scaffolded
 * copy lost that schema doc, and the generated replacement lists only
 * registry-declared secrets, so the lost keys came back nowhere. The example
 * is now written only into an absence — the same never-clobber policy as
 * ensureRootNpmrc / ensureAgentsMd.
 *
 * @module
 */

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { getRawRegistry } from '../registry.js'
import { generateEnvFile } from '../scaffold.js'

let dir: string | null = null
afterEach(async () => {
  if (dir) await rm(dir, { recursive: true, force: true })
  dir = null
})

describe('generateEnvFile .env.example', () => {
  it('preserves an existing .env.example — a template ships a curated one', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-env-example-'))
    // What copyTemplateInstance copied out of templates/apps/static-site/app:
    // a hand-written schema reference the generated key list knows nothing of.
    const curated = [
      '# Environment variables for the static site.',
      '# Copy to .env; nothing here is secret.',
      '',
      'VITE_SITE_URL=http://localhost:3000',
      '',
    ].join('\n')
    await writeFile(join(dir, '.env.example'), curated)

    await generateEnvFile(dir, [{ name: 'STRIPE_SECRET_KEY', required: true }], 'app')

    // The curated example is intact, byte-for-byte…
    expect(await readFile(join(dir, '.env.example'), 'utf-8')).toBe(curated)
    // …while the real .env is still generated.
    const env = await readFile(join(dir, '.env'), 'utf-8')
    expect(env).toContain('VITE_API_URL=')
    expect(env).not.toContain('VITE_SITE_URL')
  })

  it('writes the generated key-name example when none exists', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-env-example-'))

    await generateEnvFile(
      dir,
      [
        { name: 'STRIPE_SECRET_KEY', required: true },
        { name: 'MAILGUN_API_KEY', required: false },
      ],
      'api',
    )

    const example = await readFile(join(dir, '.env.example'), 'utf-8')
    expect(example).toContain('STRIPE_SECRET_KEY=')
    // Key names ONLY, for EVERY declared secret: the generated example is the
    // doc a user copies, and it must never carry a value — not a placeholder,
    // not a default. (A `sk_`-literal negative here could practically never
    // fail: the example only carries values if the generator started writing
    // them, and then only for whatever default it picked.)
    for (const secret of ['STRIPE_SECRET_KEY', 'MAILGUN_API_KEY']) {
      expect(example).toMatch(new RegExp(`^${secret}=$`, 'm'))
      expect(example).not.toMatch(new RegExp(`^${secret}=.+`, 'm'))
    }
  })

  // A clone has `.env.example` and no `.env`. Its bare `JWT_PRIVATE_KEY=` and `JWT_PUBLIC_KEY=` read
  // as keys nothing explains, and two blind reviews in a row (harness smoke runs 3 and 4) said a
  // clone needs RSA keys before it starts, while `@molecule/api-jwt` generates a pair on first boot.
  it("writes each key under the registry's guidance for it", async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-env-example-'))
    const jwt = getRawRegistry().packages['@molecule/api-jwt-jsonwebtoken']?.secrets ?? []
    expect(jwt.map((secret) => secret.name)).toEqual(['JWT_PRIVATE_KEY', 'JWT_PUBLIC_KEY'])

    await generateEnvFile(
      dir,
      [
        ...jwt,
        {
          name: 'STRIPE_SECRET_KEY',
          required: true,
          label: 'Stripe secret key',
          setupUrl: 'https://dashboard.stripe.com/apikeys',
        },
        { name: 'PLAIN_KEY', required: false },
      ],
      'api',
    )

    const lines = (await readFile(join(dir, '.env.example'), 'utf-8')).split('\n')
    const above = (name: string): string[] =>
      lines
        .slice(0, lines.indexOf(`${name}=`))
        .reverse()
        .slice(0, 2)
        .reverse()
    expect(above('JWT_PRIVATE_KEY').at(-1)).toBe(`# ${jwt[0]!.instructions}`)
    expect(above('JWT_PRIVATE_KEY').at(-1)).toContain('self-generates key files on first boot')
    expect(above('JWT_PUBLIC_KEY').at(-1)).toBe(`# ${jwt[1]!.instructions}`)
    // With no instructions, the label names it, and the page to get it from follows.
    expect(above('STRIPE_SECRET_KEY')).toEqual([
      '# Stripe secret key',
      '# https://dashboard.stripe.com/apikeys',
    ])
    expect(lines).toContain('PLAIN_KEY=')
    expect(lines.at(-1)).toBe('')
  })
})
