/**
 * The DDL-compatibility refusal crosses the process boundary between `create`
 * and the injector it spawns by EXIT STATUS, never by message text.
 *
 * @module
 */
import { describe, expect, it } from 'vitest'

import { DDL_INCOMPATIBLE_EXIT, isDdlCompatibilityFailure } from '../ddl-exit.js'

describe('isDdlCompatibilityFailure', () => {
  it('recognises the dedicated status, as execa reports it', () => {
    expect(isDdlCompatibilityFailure({ exitCode: DDL_INCOMPATIBLE_EXIT })).toBe(true)
  })

  it('does not treat another inject failure as a DDL refusal', () => {
    expect(isDdlCompatibilityFailure({ exitCode: 1 })).toBe(false)
    expect(isDdlCompatibilityFailure(new Error('command failed'))).toBe(false)
    expect(isDdlCompatibilityFailure(undefined)).toBe(false)
    expect(isDdlCompatibilityFailure(null)).toBe(false)
  })

  it('does not read the classification from prose', () => {
    // Same words a refusal uses, but a different (or absent) status: not a DDL
    // failure. This is the property that keeps a reworded message from changing
    // control flow.
    expect(
      isDdlCompatibilityFailure({
        exitCode: 1,
        stderr: "DuckDB cannot run this project's database setup",
      }),
    ).toBe(false)
  })

  it('uses a status no other command claims', () => {
    expect(DDL_INCOMPATIBLE_EXIT).toBe(78)
  })
})
