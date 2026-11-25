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

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

import { CODEX_MCP_ENV_LINE, MCP_SERVER_ENV_VARS } from '../agent-harnesses.js'

const MLCL = join(dirname(fileURLToPath(import.meta.url)), '../../..')

/** The hosted server's entry points, which run on our machines, never under a harness. */
const HOSTED = new Set(['remote.ts', 'http.ts'])

/** What the Linux Codex 0.166 probe observed without `env_vars`. */
const CODEX_DEFAULTS = new Set(['HOME', 'LANG', 'PATH', 'TERM', 'TMPDIR'])

/** The installed launcher sets this itself before importing the MCP server. */
const LAUNCHER_ENV = new Set(['MOLECULE_MCP_HOME'])

/** The local server and the CLI entry points for its setup, check and registry work. */
function serverSources(): string[] {
  const mcp = join(MLCL, 'mcp', 'src')
  return [
    ...readdirSync(mcp)
      .filter((file) => file.endsWith('.ts') && !HOSTED.has(file))
      .map((file) => join(mcp, file)),
    ...[
      'commands/add.ts',
      'commands/check.ts',
      'commands/create.ts',
      'lib/check.ts',
      'lib/check-process.ts',
      'lib/npm-install.ts',
      'lib/package-doc-files.ts',
      'lib/platform.ts',
      'lib/registry.ts',
      'lib/scaffold.ts',
      'lib/telemetry.ts',
      'lib/telemetry-send.ts',
    ].map((file) => join(MLCL, 'src', file)),
  ]
}

/**
 * Environment access through a property, string key or named module constant.
 * Oclif command flags declare inherited names as `env: 'NAME'`.
 */
function envReads(source: string): string[] {
  const file = ts.createSourceFile('env.ts', source, ts.ScriptTarget.Latest)
  const constants = new Map<string, string>()
  for (const node of file.statements) {
    if (!ts.isVariableStatement(node) || !(node.declarationList.flags & ts.NodeFlags.Const))
      continue
    for (const { name, initializer } of node.declarationList.declarations)
      if (ts.isIdentifier(name) && initializer && ts.isStringLiteralLike(initializer))
        constants.set(name.text, initializer.text)
  }
  const names: string[] = []
  const isEnv = (node: ts.Expression): boolean =>
    (ts.isIdentifier(node) && node.text === 'env') ||
    (ts.isPropertyAccessExpression(node) && node.name.text === 'env')
  function visit(node: ts.Node): void {
    if (ts.isPropertyAccessExpression(node) && isEnv(node.expression)) names.push(node.name.text)
    if (ts.isElementAccessExpression(node) && isEnv(node.expression)) {
      const key = node.argumentExpression
      const name = ts.isStringLiteralLike(key)
        ? key.text
        : ts.isIdentifier(key)
          ? constants.get(key.text)
          : undefined
      if (name) names.push(name)
    }
    if (
      ts.isPropertyAssignment(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === 'env' &&
      ts.isStringLiteralLike(node.initializer) &&
      /^[A-Z][A-Z_\d]*$/.test(node.initializer.text)
    ) {
      names.push(node.initializer.text)
    }
    ts.forEachChild(node, visit)
  }
  visit(file)
  return names
}

describe('the variables Codex forwards to the Molecule MCP server', () => {
  it('reads the names an environment object is read by, not file names in prose', () => {
    expect(
      envReads(
        "const OVERRIDE = 'MOLECULE_MCP_NO_UPDATE'; env[OVERRIDE]; process.env.DO_NOT_TRACK; " +
          "deps.env.MLCL_REGISTRY_PATH; env.npm_config_registry; env['MOLECULE_TOKEN']; " +
          "Flags.boolean({ env: 'MLCL_REQUIRE_INJECT' }); // process.env.PROSE\n" +
          'const help = "process.env.EXAMPLE in a .env.local file"',
      ),
    ).toEqual([
      'MOLECULE_MCP_NO_UPDATE',
      'DO_NOT_TRACK',
      'MLCL_REGISTRY_PATH',
      'npm_config_registry',
      'MOLECULE_TOKEN',
      'MLCL_REQUIRE_INJECT',
    ])
  })

  it('lists every variable the server and its CLI read', () => {
    const read = new Set(serverSources().flatMap((file) => envReads(readFileSync(file, 'utf8'))))
    expect(read.size).toBeGreaterThan(5)
    const missing = [...read].filter(
      (name) =>
        !CODEX_DEFAULTS.has(name) &&
        !LAUNCHER_ENV.has(name) &&
        !(MCP_SERVER_ENV_VARS as readonly string[]).includes(name),
    )
    expect(missing).toEqual([])
  })

  it('carries the network, npm and opt-out variables, once each', () => {
    for (const name of [
      'HTTPS_PROXY',
      'https_proxy',
      'NO_PROXY',
      'ALL_PROXY',
      'NODE_EXTRA_CA_CERTS',
      'NPM_CONFIG_REGISTRY',
      'NPM_CONFIG_CAFILE',
      'npm_config_cafile',
      'NPM_CONFIG_OFFLINE',
      'npm_config_ignore_scripts',
      'PLAYWRIGHT_BROWSERS_PATH',
      'PLAYWRIGHT_CHROMIUM_DOWNLOAD_HOST',
      'PLAYWRIGHT_DOWNLOAD_CONNECTION_TIMEOUT',
      'XDG_CACHE_HOME',
      'Path',
      'USERPROFILE',
      'LOCALAPPDATA',
      'ComSpec',
      'DO_NOT_TRACK',
      'MOLECULE_TELEMETRY',
      'MOLECULE_TOKEN',
    ])
      expect(MCP_SERVER_ENV_VARS).toContain(name)
    expect(new Set(MCP_SERVER_ENV_VARS).size).toBe(MCP_SERVER_ENV_VARS.length)
    // Codex matches names exactly: a pattern would forward nothing.
    expect(MCP_SERVER_ENV_VARS.filter((name) => !/^[A-Za-z_]\w*$/.test(name))).toEqual([])
    expect(JSON.parse(CODEX_MCP_ENV_LINE.replace(/^env_vars = /, ''))).toEqual(MCP_SERVER_ENV_VARS)
  })
})
