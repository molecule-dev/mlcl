/**
 * The transactional-emails example's password-reset email tells the reader how
 * long the reset link is valid — and the validity is not the example's to
 * choose: the reset token is verified by `@molecule/api-resource-user`'s
 * `resetPassword` (and `logIn`, which accepts the same token) against
 * `RESET_TOKEN_TTL_MS`. The copy said "expires in 15 minutes" while the gate
 * enforces one HOUR, so a reader who trusted the email gave up on a link that
 * still worked.
 *
 * This pins the copy to the constant: the minutes the email names must be the
 * TTL the framework enforces, so the two cannot drift apart again.
 *
 * @module
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { handlers } from '@molecule/api-resource-user'

const EXAMPLE_PATH = join(
  import.meta.dirname,
  '..',
  '..',
  '..',
  'templates',
  '.agents',
  'skills',
  'examples',
  'notifications',
  'transactional-emails',
  'api',
  'lib',
  'transactional.ts',
)

describe('the transactional-emails reset email names the real token TTL', () => {
  it('states the validity the user resource enforces', () => {
    const ttlMs = handlers.RESET_TOKEN_TTL_MS
    expect(ttlMs, 'the user resource stopped exporting RESET_TOKEN_TTL_MS').toBeTypeOf('number')

    const source = readFileSync(EXAMPLE_PATH, 'utf-8')
    // Anchored on the `defaultValue` STRING, not on a bare `/expires in (\d+)
    // minutes/`: the comment block above that string names the same window, so
    // the bare pattern matched the COMMENT first and this pin stayed green
    // while the sentence the reader actually receives drifted (`defaultValue:
    // '… expires in 15 minutes …'`) — the exact drift it exists to catch.
    const match = source.match(/defaultValue:\s*'[^']*expires in (\d+) minutes/)
    expect(
      match,
      'the reset email no longer states a validity in minutes — update this pin',
    ).not.toBeNull()

    const statedMs = Number(match![1]) * 60_000
    expect(
      statedMs,
      `the reset email says "expires in ${match![1]} minutes" but the framework's ` +
        `reset token is valid for ${ttlMs / 60_000} — the copy must name the window ` +
        'resetPassword actually enforces',
    ).toBe(ttlMs)
  })
})
