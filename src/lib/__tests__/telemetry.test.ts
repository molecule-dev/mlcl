import { afterEach, describe, expect, it } from 'vitest'

import { publicPackageNames, telemetryEnabled, telemetryUrl } from '../telemetry.js'

describe('telemetry privacy', () => {
  const saved = { ...process.env }
  afterEach(() => {
    process.env = { ...saved }
  })

  it('keeps public @molecule package names and drops anything a person could have named privately', () => {
    expect(
      publicPackageNames(
        '@molecule/api-logger-pino, @acme/secret-billing ,left-pad,@molecule/app-ui',
      ),
    ).toBe('@molecule/api-logger-pino,@molecule/app-ui')
    expect(publicPackageNames('@acme/secret-billing')).toBeUndefined()
    expect(publicPackageNames(undefined)).toBeUndefined()
  })

  it('posts to the ingestion route under the API root the rest of the CLI uses', () => {
    delete process.env.MOLECULE_ENV
    delete process.env.MOLECULE_API_URL
    delete process.env.MOLECULE_TELEMETRY_URL
    expect(telemetryUrl()).toBe('https://api.molecule.dev/api/v1/telemetry/cli')
    process.env.MOLECULE_API_URL = 'http://127.0.0.1:4999/api'
    expect(telemetryUrl()).toBe('http://127.0.0.1:4999/api/v1/telemetry/cli')
    process.env.MOLECULE_TELEMETRY_URL = 'https://collector.example/x'
    expect(telemetryUrl()).toBe('https://collector.example/x')
    delete process.env.MOLECULE_TELEMETRY_URL
    delete process.env.MOLECULE_API_URL
  })

  it('is off for MOLECULE_TELEMETRY=0 and for the standard DO_NOT_TRACK=1', () => {
    delete process.env.MOLECULE_ENV
    delete process.env.MOLECULE_TELEMETRY
    delete process.env.DO_NOT_TRACK
    expect(telemetryEnabled()).toBe(true)
    process.env.DO_NOT_TRACK = '1'
    expect(telemetryEnabled()).toBe(false)
    delete process.env.DO_NOT_TRACK
    process.env.MOLECULE_TELEMETRY = '0'
    expect(telemetryEnabled()).toBe(false)
  })
})
