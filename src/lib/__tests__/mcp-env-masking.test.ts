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
/** Every stand-in CLI root this suite created — one per `fakeCli` call. */
const dirs: string[] = []

afterAll(() => {
  delete process.env.MOLECULE_MCP_CLI
  delete process.env.DO_NOT_TRACK
  for (const created of dirs.splice(0)) rmSync(created, { recursive: true, force: true })
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

/**
 * A stand-in CLI whose stdout is `stdout` (exit 0 by default). Each call gets
 * its own throwaway root, and every root is removed in afterAll — a single
 * `dir` variable reassigned per call leaked every root but the last.
 */
function fakeCli(stdout: string, exitCode = 0): string {
  dir = mkdtempSync(join(tmpdir(), 'mlcl-mcp-env-mask-'))
  dirs.push(dir)
  const script = join(dir, 'fake-mlcl.mjs')
  writeFileSync(
    script,
    '#!/usr/bin/env node\n' +
      `process.stdout.write(${JSON.stringify(stdout)})\n` +
      `process.exit(${exitCode})\n`,
  )
  chmodSync(script, 0o755)
  return script
}

/** The `env list --json` answer carrying the two probe values. */
function listCli(): string {
  return fakeCli(
    JSON.stringify([
      { key: 'OTP', value: SHORT_SECRET },
      { key: 'MOLECULE_API_KEY', value: LONG_SECRET },
    ]),
  )
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
    const { call, close } = await connect(listCli())
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
    const { call, close } = await connect(listCli())
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

  it('never repeats the listing when the CLI itself FAILS — its stdout is withheld too', async (ctx) => {
    if (skipped(ctx)) return
    // The refusal above guards the PARSE, but the CLI's stdout reaches the
    // client a second way: `runCli` builds its failure message from the child's
    // output (`stderr || stdout`), and `mlcl env list --json` prints every
    // variable's UNMASKED value to stdout. A non-zero exit (nothing on stderr)
    // therefore put the whole .env into the tool's error — past a guard whose
    // own message promises the output is never repeated. The listing is the
    // child's stdout here, exactly as `fakeCli` can produce it.
    const listing = JSON.stringify([
      { key: 'MOLECULE_API_KEY', value: LONG_SECRET },
      { key: 'OTP', value: SHORT_SECRET },
    ])
    const { call, close } = await connect(fakeCli(`${listing}\n`, 1))
    try {
      for (const tool of ['list_env_vars', 'get_env_var']) {
        const result = await call(tool, tool === 'get_env_var' ? { key: 'OTP' } : {})
        expect(result.isError, `${tool} must fail when the CLI exits non-zero`).toBe(true)
        const message = textOf(result)
        expect(message, `${tool} must not repeat the long secret`).not.toContain(LONG_SECRET)
        expect(message, `${tool} must not repeat the short secret`).not.toContain(SHORT_SECRET)
        expect(message, `${tool} still names the command to re-run`).toContain('mlcl env list')
      }
    } finally {
      await close()
    }
  })

  it('reports a stdout that is not the list without repeating the CLI’s own output', async (ctx) => {
    if (skipped(ctx)) return
    // An exit-0 `env list` whose stdout carries NO JSON document (a wrapper's
    // progress line, a shim's banner) used to reach `parseJsonOut` bare: with
    // no `{`/`[` in the text it sliced the LAST CHARACTER and `JSON.parse`d it,
    // so the client got "Unexpected end of JSON input" — naming neither the
    // tool nor the CLI output that caused it. The same failure shape
    // `check_project` already guards and is tested for; the env tools are the
    // calls that were missed.
    const { call, close } = await connect(
      fakeCli('mlcl: refreshing the registry index before listing…\n'),
    )
    try {
      for (const tool of ['list_env_vars', 'get_env_var']) {
        const result = await call(tool, tool === 'get_env_var' ? { key: 'OTP' } : {})
        expect(result.isError, `${tool} must fail loudly on a non-JSON answer`).toBe(true)
        const message = textOf(result)
        expect(message, `${tool} names the answer it refused`).toContain(
          'did not answer with the variable list',
        )
        expect(
          message,
          `${tool} never reports the bare parse error the old path threw`,
        ).not.toMatch(/Unexpected end|Unexpected token|SyntaxError/)
      }
    } finally {
      await close()
    }
  })

  it('never quotes the unmasked values the listing printed into the failure it reports', async (ctx) => {
    if (skipped(ctx)) return
    // `mlcl env list --json` answers with every variable's UNMASKED value (see
    // src/commands/env/list.ts), and the refusal used to quote that stdout
    // verbatim: a listing whose output carried a stray `{` before the array made
    // `parseJsonOut` parse from the wrong brace, `JSON.parse` throw, and the
    // client receive the whole .env — through two tools whose whole contract is
    // that values stay masked unless `reveal` is passed.
    const listing = JSON.stringify([
      { key: 'MOLECULE_API_KEY', value: LONG_SECRET },
      { key: 'OTP', value: SHORT_SECRET },
    ])
    const { call, close } = await connect(fakeCli(`{"notice":"index refreshed"} ${listing}\n`))
    try {
      for (const tool of ['list_env_vars', 'get_env_var']) {
        const result = await call(tool, tool === 'get_env_var' ? { key: 'OTP' } : {})
        expect(result.isError, `${tool} must refuse an unparseable listing`).toBe(true)
        const message = textOf(result)
        expect(message, `${tool} must not quote the long secret`).not.toContain(LONG_SECRET)
        expect(message, `${tool} must not quote the short secret`).not.toContain(SHORT_SECRET)
        expect(message, `${tool} still says what went wrong`).toContain(
          'did not answer with the variable list',
        )
      }
    } finally {
      await close()
    }
  })

  it('refuses a JSON object that is not the variable list instead of crashing on it', async (ctx) => {
    if (skipped(ctx)) return
    // `parseJsonOut` is an `as T` cast, so a valid JSON object passes through as
    // the declared array and the callers dereference it: `raw.map` /
    // `raw.find` died as "raw.map is not a function" — a raw TypeError at the
    // client, naming neither the command nor its output.
    const { call, close } = await connect(
      fakeCli(JSON.stringify({ key: 'OTP', value: SHORT_SECRET })),
    )
    try {
      for (const tool of ['list_env_vars', 'get_env_var']) {
        const result = await call(tool, tool === 'get_env_var' ? { key: 'OTP' } : {})
        expect(result.isError, `${tool} must refuse an answer that is not the list`).toBe(true)
        const message = textOf(result)
        expect(message, `${tool} reports the refusal, not a TypeError`).not.toMatch(
          /is not a function/,
        )
        expect(message).toContain('did not answer with the variable list')
      }
    } finally {
      await close()
    }
  })

  it('writes a secret without ever repeating it back in a failure that has no output to quote', async (ctx) => {
    if (skipped(ctx)) return
    // `set_env_var` passes the value as an ARGUMENT (`mlcl env set KEY VALUE`),
    // and `runCli`'s last-resort failure message is built from argv — reached
    // whenever the child exits non-zero with NOTHING to quote (no stderr, no
    // stdout, and no execa `originalMessage`, which is exactly what a silent
    // exit and a killed/hung child both look like). The tool then handed
    // `mlcl env set STRIPE_SECRET_KEY <the secret> failed` to the client — the
    // same leak the env-list tools guard on the OUTPUT side, one call site over.
    // The stand-in CLI here exits 1 having written nothing, which is the shape
    // the fallback exists for.
    const { call, close } = await connect(fakeCli('', 1))
    try {
      const result = await call('set_env_var', { key: 'STRIPE_SECRET_KEY', value: LONG_SECRET })
      expect(result.isError, 'the silent failure must be reported').toBe(true)
      const message = textOf(result)
      expect(message, 'the value must never ride back in the failure message').not.toContain(
        LONG_SECRET,
      )
      // …while the failure still says which command to re-run, and for which key.
      expect(message).toContain('mlcl env set STRIPE_SECRET_KEY')
    } finally {
      await close()
    }
  })
})
