/**
 * After an add, an existing API is told the one `mlcl check` call that builds it, starts it, checks
 * a route and stops it. Both harnesses started the server in the background, slept a fixed time,
 * called the route and killed the server by hand (harness eval `add`, 2026-11-25).
 *
 * @module
 */
import { describe, expect, it } from 'vitest'

import Check from '../../commands/check.js'
import { liveCheckCommand } from '../existing-project.js'

const api = {
  scripts: { build: 'tsc', start: 'node dist/server.js', dev: 'tsx watch src/server.ts' },
}

describe('liveCheckCommand', () => {
  it('names the serve check for an API with a start script (OLD MUSTFAIL)', () => {
    expect(liveCheckCommand(api, false)).toBe(
      'npx mlcl check --steps build,serve --ready http://localhost:<port>/<path> --run "<a command that calls your route>"',
    )
  })

  it('uses only flags the check command has', () => {
    const command = liveCheckCommand(api, false) ?? ''
    const flags = [...command.matchAll(/--([a-z-]+)/g)].map((match) => match[1])
    expect(flags).toEqual(['steps', 'ready', 'run'])
    for (const flag of flags) expect(Check.flags).toHaveProperty(flag)
  })

  it('leaves build out when the project has no build script', () => {
    expect(liveCheckCommand({ scripts: { dev: 'tsx watch src/server.ts' } }, false)).toMatch(
      /--steps serve /,
    )
  })

  it('counterexample: no start or dev script, or an app, gets no live check', () => {
    expect(liveCheckCommand({ scripts: { build: 'tsc' } }, false)).toBeUndefined()
    expect(liveCheckCommand({}, false)).toBeUndefined()
    expect(liveCheckCommand(api, true)).toBeUndefined()
  })
})
