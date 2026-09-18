import { beforeEach, describe, expect, it, vi } from 'vitest'

// The active environment's variables ("swap into requests at send time") were never applied — the
// execute + monitor-run paths fired {{VAR}} placeholders literally. These helpers load the active
// environment's enabled variables and substitute {{KEY}} into a string.

const db = { findMany: vi.fn() }
vi.mock('@molecule/api-database', () => ({ findMany: (...a: unknown[]) => db.findMany(...a) }))
const decrypt = vi.fn()
vi.mock('@molecule/api-encryption', () => ({ decrypt: (...a: unknown[]) => decrypt(...a) }))

import {
  loadActiveEnvVars,
  substituteEnvVars,
  substituteEnvVarsInHeaders,
} from '../lib/env-vars.js'

beforeEach(() => vi.clearAllMocks())

describe('substituteEnvVars', () => {
  const vars = { HOST: 'api.example.com', TOKEN: 'secret123' }

  it('replaces {{KEY}} tokens, with or without inner whitespace', () => {
    expect(substituteEnvVars('https://{{HOST}}/x?t={{ TOKEN }}', vars)).toBe(
      'https://api.example.com/x?t=secret123',
    )
  })

  it('leaves unknown placeholders untouched', () => {
    expect(substituteEnvVars('{{HOST}}/{{MISSING}}', vars)).toBe('api.example.com/{{MISSING}}')
  })

  it('returns the text unchanged when there are no variables', () => {
    expect(substituteEnvVars('https://{{HOST}}/x', {})).toBe('https://{{HOST}}/x')
  })

  it('substitutes header values in place, leaving keys alone', () => {
    const headers = { Authorization: 'Bearer {{TOKEN}}', 'X-Host': '{{HOST}}' }
    substituteEnvVarsInHeaders(headers, vars)
    expect(headers).toEqual({ Authorization: 'Bearer secret123', 'X-Host': 'api.example.com' })
  })
})

describe('loadActiveEnvVars', () => {
  it('returns enabled variables from the active environment as a key→value map', async () => {
    db.findMany.mockResolvedValue([{ variables: 'ENC', is_active: true }])
    decrypt.mockResolvedValue(
      JSON.stringify([
        { key: 'HOST', value: 'api.example.com', enabled: true },
        { key: 'TOKEN', value: 'secret123' },
        { key: 'OFF', value: 'nope', enabled: false },
      ]),
    )
    const vars = await loadActiveEnvVars('u1')
    expect(vars).toEqual({ HOST: 'api.example.com', TOKEN: 'secret123' }) // OFF excluded
  })

  it('returns an empty map when there is no active environment', async () => {
    db.findMany.mockResolvedValue([])
    expect(await loadActiveEnvVars('u1')).toEqual({})
    expect(decrypt).not.toHaveBeenCalled()
  })

  it('returns an empty map (not a throw) when decryption fails', async () => {
    db.findMany.mockResolvedValue([{ variables: 'ENC', is_active: true }])
    decrypt.mockRejectedValue(new Error('bad key'))
    expect(await loadActiveEnvVars('u1')).toEqual({})
  })
})
