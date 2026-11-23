/**
 * After `mlcl add`, a provider points at its core's API, not its own README. In the 2026-11-23 add
 * eval an agent that had read `@molecule/api-uploads` was sent on to the filesystem provider's
 * README too, and spent a model turn on it.
 */
import { stripVTControlCharacters } from 'node:util'

import { describe, expect, it } from 'vitest'

import { afterAddGuidance } from '../add-guidance.js'
import { getRawRegistry } from '../registry.js'

// chalk colours nothing off a terminal, but strip any escape codes so the assertions read the text.
const plain = (lines: string[]): string[] => lines.map((line) => stripVTControlCharacters(line))

describe('what mlcl add says about using the package', () => {
  it("sends a provider's reader to the core it implements", () => {
    const lines = plain(afterAddGuidance('@molecule/api-uploads-filesystem'))
    expect(lines).toEqual([
      'Your code calls it through @molecule/api-uploads. Read that API: npx mlcl docs @molecule/api-uploads',
    ])
  })

  it('names the environment variables a provider reads', () => {
    const secrets = getRawRegistry().packages['@molecule/api-payments-stripe']?.secrets ?? []
    expect(secrets.length).toBeGreaterThan(0)
    const [, env] = plain(afterAddGuidance('@molecule/api-payments-stripe'))
    expect(env).toBe(
      `It reads these environment variables: ${secrets.map((secret) => secret.name).join(', ')}`,
    )
  })

  it('marks an optional variable', () => {
    const [, env] = plain(afterAddGuidance('@molecule/api-activity-http'))
    expect(env).toBe('It reads these environment variables: MOLECULE_ACTIVITY_URL (optional)')
  })

  it('points a package that implements nothing at its own API', () => {
    expect(plain(afterAddGuidance('@molecule/api-uploads'))).toEqual([
      'Read its API before using it: npx mlcl docs @molecule/api-uploads',
    ])
  })
})
