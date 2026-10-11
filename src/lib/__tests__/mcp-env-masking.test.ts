// @vitest-environment node
/**
 * `list_env_vars` / `get_env_var` promise MASKED values unless the caller
 * passes `reveal: true` ("keep secrets out of the chat"), and the mask used to
 * be `value.slice(0, 3) + '•••'` unconditionally — which is not a mask for a
 * value of three characters or fewer: `OTP=123` came back as `123•••`, the whole
 * secret, through a call that had promised to mask it. Both tools now go through
 * `maskEnvValue`, which shows a prefix only when the value is long enough to
 * have one worth showing.
 *
 * Both halves are driven through the REAL stdio server over a linked in-memory
 * transport, with `MOLECULE_MCP_CLI` pointed at a stand-in CLI that answers
 * `env list --json` — the same harness the sibling mcp suites use, so the
 * assertions describe what a client actually receives.
 *
 * @module
 */
import { chmodSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, describe, expect, it, vi } from 'vitest'

const MCP_DIR = join(import.meta.dirname, '..', '..', '..', 'mcp')
const SDK_ESM = join(MCP_DIR, 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'esm')
const DEPS_MARKER = join(MCP_DIR, 'node_modules', 'execa', 'package.json')

/** A short secret (three characters) and a long one — see MASK_PREFIX_MIN_LENGTH. */
const SHORT_SECRET = '123'
const LONG_SECRET = 'mk_live_0123456789abcdef'

interface ToolResult {
  isError?: boolean
  content?: Array<{ type: string; text?: string }>
}

const textOf = (result: ToolResult): string =>
  (result.content ?? [])
    .map((block) => block.text ?? '')
    .join('\n')
    .trim()

let dir: string | null = null

afterAll(() => {
  delete process.env.MOLECULE_MCP_CLI
  delete process.env.DO_NOT_TRACK
  if (dir) rmSync(dir, { recursive: true, force: true })
})

/** Skip out loud in the one environment this suite cannot run in. */
function skipped(ctx: { skip: () => void }): boolean {
  if (existsSync(DEPS_MARKER)) return false
  console.warn(
    `[mcp-env-masking] ${MCP_DIR}/node_modules is not installed — SKIPPING. ` +
      'Install mcp’s deps (cd mcp && npm install) so the suite runs.',
  )
  ctx.skip()
  return true
}

/** A stand-in CLI whose `env list --json` answers the two probe values. */
function fakeCli(): string {
  dir = mkdtempSync(join(tmpdir(), 'mlcl-mcp-env-mask-'))
  const script = join(dir, 'fake-mlcl.mjs')
  writeFileSync(
    script,
    '#!/usr/bin/env node\n' +
      `const list = ${JSON.stringify([
        { key: 'OTP', value: SHORT_SECRET },
        { key: 'MOLECULE_API_KEY', value: LONG_SECRET },
      ])}\n` +
      'process.stdout.write(JSON.stringify(list))\n',
  )
  chmodSync(script, 0o755)
  return script
}

async function connect(cli: string): Promise<{
  call: (name: string, args?: Record<string, unknown>) => Promise<ToolResult>
  close: () => Promise<void>
}> {
  process.env.DO_NOT_TRACK = '1'
  process.env.MOLECULE_MCP_CLI = cli
  vi.resetModules()
  const { moleculeServer } = await import('../../../mcp/src/server.js')
  const { Client } = await import(join(SDK_ESM, 'client', 'index.js'))
  const { InMemoryTransport } = await import(join(SDK_ESM, 'inMemory.js'))

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await moleculeServer.connect(serverTransport)
  const client = new Client({ name: 'env-masking-test', version: '0.0.0' })
  await client.connect(clientTransport)
  return {
    call: (name, args = {}) => client.callTool({ name, arguments: args }) as Promise<ToolResult>,
    close: () => client.close(),
  }
}

describe('a masked env value is never the value itself', () => {
  it('list_env_vars hides a three-character secret while still hinting at a long one', async (ctx) => {
    if (skipped(ctx)) return
    const { call, close } = await connect(fakeCli())
    try {
      const result = await call('list_env_vars')
      const output = textOf(result)

      expect(result.isError, 'listing the env is not a failure').toBeFalsy()
      // The premise: the CLI really did hand the server both secrets.
      expect(output, 'the long value is reachable to mask').toContain('mk_')
      expect(
        output,
        'a three-character value must not be echoed through a masked read',
      ).not.toContain(SHORT_SECRET)
      expect(output, 'and neither must the long one').not.toContain(LONG_SECRET)
      // The prefix is still shown where it is a hint, not the value.
      expect(output).toContain('mk_•••')
      expect(output, 'the short value is masked entirely').toContain('"value": "•••"')
    } finally {
      await close()
    }
  })

  it('get_env_var masks by default and reveals only when asked', async (ctx) => {
    if (skipped(ctx)) return
    const { call, close } = await connect(fakeCli())
    try {
      const masked = textOf(await call('get_env_var', { key: 'OTP' }))
      expect(masked, 'the short secret is not echoed').not.toContain(SHORT_SECRET)
      expect(masked).toContain('•••')

      const maskedLong = textOf(await call('get_env_var', { key: 'MOLECULE_API_KEY' }))
      expect(maskedLong, 'the long secret is not echoed').not.toContain(LONG_SECRET)
      expect(maskedLong).toContain('mk_•••')

      // `reveal: true` still returns the value — the gate is the flag, not the
      // length of the value.
      const revealed = textOf(await call('get_env_var', { key: 'OTP', reveal: true }))
      expect(revealed).toContain(SHORT_SECRET)
    } finally {
      await close()
    }
  })
})
