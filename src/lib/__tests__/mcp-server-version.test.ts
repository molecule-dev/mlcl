/**
 * The MCP server's reported version must come from mcp/package.json, not a
 * hardcoded literal: remote.ts's McpServer version and the telemetry payload's
 * `serverVersion` were both pinned at '0.1.0' while the package moved to
 * 0.2.0, so every client's initialize response and every telemetry event
 * described a server that was not the one deployed.
 *
 * @module
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { serverVersion } from '../../../mcp/src/telemetry.js'

const MCP_DIR = join(import.meta.dirname, '..', '..', '..', 'mcp')

describe('molecule-mcp version reporting', () => {
  it('reports the mcp/package.json version, whatever it is bumped to', () => {
    const manifest = JSON.parse(readFileSync(join(MCP_DIR, 'package.json'), 'utf-8')) as {
      version?: string
    }
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/)
    expect(serverVersion()).toBe(manifest.version)
  })

  it('leaves no hardcoded version literal in the surfaces that report it', () => {
    // ANY quoted or backticked semver literal — not just the `version: '0.1.0'`
    // shape the drift first took. Anchoring on `version` followed by a colon and
    // a quoted literal left the obvious way to reintroduce the bug wide open:
    // `const V = '0.1.0'` … `new McpServer({ version: V })` matched neither
    // alternative, so a client was again told about a server that was not
    // deployed and every guard here stayed green.
    const semverLiteral = /['"`]\d+\.\d+\.\d+/
    for (const file of ['src/remote.ts', 'src/telemetry.ts']) {
      const source = readFileSync(join(MCP_DIR, file), 'utf-8')
      expect(source, `${file} hardcodes a version literal again`).not.toMatch(semverLiteral)
      // …and the one legitimate source of the version stays wired.
      expect(source, `${file} must report the version through serverVersion()`).toContain(
        'serverVersion(',
      )
    }
  })
})
