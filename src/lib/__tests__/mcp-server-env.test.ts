/**
 * Codex hands an MCP server only a short list of environment variables of its own unless the
 * server's table names more in `env_vars`. Every variable the local server reads, and the CLI it
 * runs reads for credentials and telemetry, must be on {@link MCP_SERVER_ENV_VARS}: one left off
 * is unset under Codex alone. The proxy variables were (2026-11-25): `check_project`'s Playwright
 * browser install had no route to the network, and an opt-out (`DO_NOT_TRACK=1`) never reached
 * the server's telemetry.
 *
 * @module
 */

import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { CODEX_MCP_ENV_LINE, MCP_SERVER_ENV_VARS } from '../agent-harnesses.js'

const MLCL = join(dirname(fileURLToPath(import.meta.url)), '../../..')

/** The hosted server's entry points, which run on our machines, never under a harness. */
const HOSTED = new Set(['remote.ts', 'http.ts'])

/** What Codex 0.166 passes every MCP server without `env_vars` (Windows spells `PATH` `Path`). */
const CODEX_DEFAULTS = new Set(['HOME', 'LANG', 'PATH', 'Path', 'TERM', 'TMPDIR'])

/** The local server's sources and the CLI modules it reaches for credentials and telemetry. */
function serverSources(): string[] {
  const mcp = join(MLCL, 'mcp', 'src')
  return [
    ...readdirSync(mcp)
      .filter((file) => file.endsWith('.ts') && !HOSTED.has(file))
      .map((file) => join(mcp, file)),
    join(MLCL, 'src', 'lib', 'platform.ts'),
    join(MLCL, 'src', 'lib', 'telemetry.ts'),
  ]
}

/**
 * The names `source` reads off an environment object (`process.env.X`, `deps.env.X`, `env.X`,
 * `env['X']`). An `env` right after a bare dot is a file name in prose (`.env.example`).
 */
function envReads(source: string): string[] {
  const names: string[] = []
  for (const m of source.matchAll(/\benv(?:\.([A-Za-z_]\w*)|\[['"]([A-Za-z_]\w*)['"]\])/g)) {
    const at = m.index ?? 0
    if (source[at - 1] === '.' && !/[\w)$]/.test(source[at - 2] ?? '')) continue
    names.push(m[1] ?? m[2])
  }
  return names
}

describe('the variables Codex forwards to the Molecule MCP server', () => {
  it('reads the names an environment object is read by, not file names in prose', () => {
    expect(
      envReads(
        'process.env.DO_NOT_TRACK; deps.env.MLCL_REGISTRY_PATH; env.npm_config_registry; ' +
          "env['MOLECULE_TOKEN']; a `.env.example` file; .env.local",
      ),
    ).toEqual(['DO_NOT_TRACK', 'MLCL_REGISTRY_PATH', 'npm_config_registry', 'MOLECULE_TOKEN'])
  })

  it('lists every variable the server and its CLI read', () => {
    const read = new Set(serverSources().flatMap((file) => envReads(readFileSync(file, 'utf8'))))
    expect(read.size).toBeGreaterThan(5)
    const missing = [...read].filter(
      (name) =>
        !CODEX_DEFAULTS.has(name) && !(MCP_SERVER_ENV_VARS as readonly string[]).includes(name),
    )
    expect(missing).toEqual([])
  })

  it('carries the network, npm and opt-out variables, once each', () => {
    for (const name of [
      'HTTPS_PROXY',
      'https_proxy',
      'NO_PROXY',
      'NODE_EXTRA_CA_CERTS',
      'NPM_CONFIG_REGISTRY',
      'PLAYWRIGHT_BROWSERS_PATH',
      'DO_NOT_TRACK',
      'MOLECULE_TELEMETRY',
      'MOLECULE_TOKEN',
    ])
      expect(MCP_SERVER_ENV_VARS).toContain(name)
    expect(new Set(MCP_SERVER_ENV_VARS).size).toBe(MCP_SERVER_ENV_VARS.length)
    // Codex matches names exactly: a pattern would forward nothing.
    expect(MCP_SERVER_ENV_VARS.filter((name) => !/^[A-Za-z_]\w*$/.test(name))).toEqual([])
    expect(CODEX_MCP_ENV_LINE).toMatch(
      /^env_vars = \["MOLECULE_TOKEN", .*"PLAYWRIGHT_DOWNLOAD_HOST"\]$/,
    )
  })
})
