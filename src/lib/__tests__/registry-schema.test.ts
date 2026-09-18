/**
 * Registry schema validation — verifies every entry in registry.json
 * conforms to the RegistryEntry Zod schema.
 *
 * When this test fails, it means a registry entry is missing required fields
 * or has invalid values. Fix the entry in registry.json directly.
 *
 * @module
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { Registry, RegistryEntry } from '../schema.js'

const __dir = dirname(fileURLToPath(import.meta.url))
const registryPath = join(__dir, '..', '..', '..', 'registry.json')
const raw = JSON.parse(readFileSync(registryPath, 'utf-8'))

describe('registry.json schema validation', () => {
  it('should conform to the Registry schema', () => {
    const result = Registry.safeParse(raw)
    if (!result.success) {
      const formatted = result.error.issues.map(
        (issue) => `  ${issue.path.join('.')}: ${issue.message}`,
      )
      expect.fail(`Registry schema validation failed:\n${formatted.join('\n')}`)
    }
  })

  it('every package entry should have all required fields', () => {
    const missing: string[] = []

    for (const [name, entry] of Object.entries(raw.packages ?? {})) {
      const result = RegistryEntry.safeParse(entry)
      if (!result.success) {
        for (const issue of result.error.issues) {
          missing.push(`${name} → ${issue.path.join('.')}: ${issue.message}`)
        }
      }
    }

    expect(missing, 'Fix these registry entries in registry.json').toEqual([])
  })

  it('every package should have a non-empty path', () => {
    const invalid: string[] = []

    for (const [name, entry] of Object.entries(raw.packages ?? {})) {
      const e = entry as Record<string, unknown>
      if (!e.path || typeof e.path !== 'string' || e.path.trim() === '') {
        invalid.push(name)
      }
    }

    expect(invalid, 'Packages missing path field').toEqual([])
  })

  it('every package should have a valid type', () => {
    const validTypes = [
      'core',
      'provider',
      'resource',
      'middleware',
      'utility',
      'infrastructure',
      'framework',
      'feature',
      'native',
      'locales',
    ]
    const invalid: string[] = []

    for (const [name, entry] of Object.entries(raw.packages ?? {})) {
      const e = entry as Record<string, unknown>
      if (!validTypes.includes(e.type as string)) {
        invalid.push(`${name}: type="${e.type}"`)
      }
    }

    expect(invalid, 'Packages with invalid type').toEqual([])
  })

  it('every package should have stack set to api or app', () => {
    const invalid: string[] = []

    for (const [name, entry] of Object.entries(raw.packages ?? {})) {
      const e = entry as Record<string, unknown>
      if (e.stack !== 'api' && e.stack !== 'app') {
        invalid.push(`${name}: stack="${e.stack}"`)
      }
    }

    expect(invalid, 'Packages missing or invalid stack field').toEqual([])
  })

  it('provider packages should declare implements', () => {
    const missing: string[] = []

    for (const [name, entry] of Object.entries(raw.packages ?? {})) {
      const e = entry as Record<string, unknown>
      if (e.type === 'provider' && !e.implements) {
        missing.push(name)
      }
    }

    expect(missing, 'Provider packages missing implements field').toEqual([])
  })

  // [mvp PKG1] A generic, swappable provider bond must never bake a first-party
  // molecule.dev endpoint into a secret `default` — that turns an unconfigured
  // consumer into a silent activity/data exfiltration channel to the SaaS. The
  // ONLY packages allowed to default to a molecule.dev host are the explicitly
  // first-party `@molecule/*-molecule` bonds (e.g. api-secrets-molecule, the
  // managed-vault provider), which are molecule.dev-specific by design and
  // naming convention. api-activity-http was mis-named `-http` (generic) yet
  // defaulted MOLECULE_ACTIVITY_URL to https://api.molecule.dev/v1/activity.
  it('no generic provider bakes a molecule.dev endpoint into a secret default', () => {
    const leaks: string[] = []

    for (const [name, entry] of Object.entries(raw.packages ?? {})) {
      const e = entry as { secrets?: Array<{ name: string; default?: string }> }
      // First-party molecule.dev SaaS bonds (suffixed `-molecule`) may target
      // molecule.dev by design; everything else must stay provider-neutral.
      const isFirstPartyMoleculeBond = name.endsWith('-molecule')
      if (isFirstPartyMoleculeBond) continue

      for (const secret of e.secrets ?? []) {
        if (secret.default && /molecule\.dev/i.test(secret.default)) {
          leaks.push(`${name} → ${secret.name} = ${secret.default}`)
        }
      }
    }

    expect(
      leaks,
      'Generic bonds must not default a secret to a molecule.dev host (silent phone-home). ' +
        'Drop the default (require explicit config) or move it to a first-party `-molecule` bond.',
    ).toEqual([])
  })
})
