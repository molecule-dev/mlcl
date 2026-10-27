#!/usr/bin/env node
/**
 * Hosted-service key resolution + `create_api_key` roundtrip regressions.
 *
 * Run from `mlcl/` (tsx is mlcl's dev dependency; the test imports the
 * TypeScript SOURCE, so no build is needed):
 *
 *   node --import tsx --test mcp/scripts/services-env.test.mjs
 *
 * What is pinned here, at the ACTUAL caller level (the functions server.ts
 * registers as MCP tools), never by re-implementing them in the test:
 *
 *   - a key `create_api_key` writes to `.env.local` / `api/.env.local` is found
 *     by the very next `callHostedService` (the old resolver read only `.env`
 *     and `api/.env`, so the minted key was silently unusable);
 *   - ordinary dotenv content (inline `#` comments, quotes, `export`,
 *     duplicate assignments, multi-line values) is parsed by Node's own
 *     `util.parseEnv` rules, so an inline comment never becomes part of the
 *     bearer credential;
 *   - placeholder variants (`.env.example`, `.env.schema`, …) are neither
 *     written nor read, and an unsupported destination is refused BEFORE the
 *     platform mints a key (the mint request is counted, not assumed);
 *   - process.env priority, the documented file precedence, the duplicate-line
 *     rewrite, and the two-parent workspace walk are all preserved.
 *
 * No real credential is used or read: every dotenv file is created under a
 * fresh temporary directory with fake `mk_fake_…` values, every HTTP endpoint
 * is a stubbed `fetch`, and authorization headers are compared to a boolean —
 * a failing assertion never prints a credential value.
 */
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test, { after, before } from 'node:test'

import {
  callHostedService,
  createApiKeyIntoEnv,
  resolveServiceKey,
  ServiceCallError,
} from '../src/services.ts'

/** A fake minted token; never a real key. */
const MINTED = 'mk_fake_minted_0000'

/** The server base every stubbed request must stay on (no external network). */
const FAKE_API = 'http://127.0.0.1:9/api'

/** Saved real environment, restored when the suite ends. */
const SAVED_ENV = {
  MOLECULE_API_KEY: process.env.MOLECULE_API_KEY,
  MOLECULE_TOKEN: process.env.MOLECULE_TOKEN,
  MOLECULE_API_URL: process.env.MOLECULE_API_URL,
}

/** All temporary projects, removed when the suite ends. */
let scratch

/**
 * Install a `fetch` that records every request and answers from `handler`.
 *
 * @param handler - Turns a recorded request into `{ status?, body? }`.
 * @returns The recorded requests plus a `restore` function.
 */
function stubFetch(handler) {
  const requests = []
  const original = globalThis.fetch
  globalThis.fetch = async (url, init = {}) => {
    const request = {
      url: String(url),
      method: init.method ?? 'GET',
      headers: new Headers(init.headers ?? {}),
      body: init.body,
    }
    requests.push(request)
    const answer = handler(request)
    return new Response(JSON.stringify(answer.body ?? {}), {
      status: answer.status ?? 200,
      headers: { 'content-type': 'application/json' },
    })
  }
  return {
    requests,
    restore: () => {
      globalThis.fetch = original
    },
  }
}

/**
 * Answer both endpoints the roundtrip exercises: mint, then one service call.
 *
 * @param request - The recorded request.
 * @returns A fake platform answer.
 */
function platformAnswer(request) {
  if (request.url.endsWith('/api-keys')) {
    return {
      body: { id: 'key_fake_1', token: MINTED, masked: 'mk_…0000', scopes: ['broker:embeddings'] },
    }
  }
  return { body: { embeddings: [[1, 2]] } }
}

/**
 * A fresh project whose upward walk cannot leave the temporary tree: starting
 * at `<root>/a/b/c` the resolver visits `c`, `b`, `a` and nothing above.
 *
 * @param name - Unique directory name for this test.
 * @returns The project root, the start directory, and its two ancestry levels.
 */
function deepProject(name) {
  const root = join(scratch, name)
  const start = join(root, 'a', 'b', 'c')
  mkdirSync(start, { recursive: true })
  return { root, start, parent1: join(root, 'a', 'b'), parent2: join(root, 'a') }
}

/**
 * The number of MOLECULE_API_KEY assignment lines in a file — the shape of the
 * write, asserted without printing the file's contents.
 *
 * @param file - The dotenv file to inspect.
 * @returns How many assignment lines it holds.
 */
function assignmentCount(file) {
  return readFileSync(file, 'utf8')
    .split('\n')
    .filter((line) => /^\s*(?:export\s+)?MOLECULE_API_KEY\s*=/.test(line)).length
}

/**
 * The Authorization header the one hosted-service request carried.
 *
 * @param requests - The stub's recorded requests.
 * @returns The header value, or null when no service request was made.
 */
function serviceAuthorization(requests) {
  const request = requests.find((entry) => entry.url.includes('/v1/services/'))
  return request ? request.headers.get('authorization') : null
}

before(() => {
  scratch = mkdtempSync(join(tmpdir(), 'mcp-services-env-'))
  process.env.MOLECULE_TOKEN = 'fake-session-token'
  process.env.MOLECULE_API_URL = FAKE_API
  delete process.env.MOLECULE_API_KEY
})

after(() => {
  rmSync(scratch, { recursive: true, force: true })
  for (const [name, value] of Object.entries(SAVED_ENV)) {
    if (value === undefined) delete process.env[name]
    else process.env[name] = value
  }
})

test('a key created into .env.local is found by the next service call', async () => {
  const { start } = deepProject('roundtrip-local')
  const stub = stubFetch(platformAnswer)
  try {
    await createApiKeyIntoEnv('project_fake', 'mcp', join(start, '.env.local'))
    const resolved = resolveServiceKey(start)
    assert.ok(resolved, 'resolveServiceKey finds the key create_api_key wrote to .env.local')
    assert.ok(resolved.key === MINTED, 'the resolved key is the token the platform minted')

    await callHostedService('embeddings', 'embed', { input: ['hello'] }, start)
    assert.ok(
      serviceAuthorization(stub.requests) === `Bearer ${MINTED}`,
      'the service call authorizes with the minted token',
    )
    assert.ok(
      stub.requests.every((entry) => entry.url.startsWith(FAKE_API)),
      'no request left the stubbed local endpoint',
    )
  } finally {
    stub.restore()
  }
})

test('a key created into api/.env.local is found from the project directory', async () => {
  const { start } = deepProject('roundtrip-api-local')
  mkdirSync(join(start, 'api'), { recursive: true })
  const stub = stubFetch(platformAnswer)
  try {
    await createApiKeyIntoEnv('project_fake', 'mcp', join(start, 'api', '.env.local'))
    const resolved = resolveServiceKey(start)
    assert.ok(resolved, 'the api/.env.local key is discovered from the project root')
    assert.ok(resolved.key === MINTED, 'the resolved key is the minted token')
  } finally {
    stub.restore()
  }
})

test('an inline comment does not become part of the bearer credential', async () => {
  const { start } = deepProject('inline-comment')
  writeFileSync(join(start, '.env'), 'MOLECULE_API_KEY=mk_fake_inline # project key\n')
  const stub = stubFetch(platformAnswer)
  try {
    await callHostedService('embeddings', 'embed', { input: ['hello'] }, start)
    assert.ok(
      serviceAuthorization(stub.requests) === 'Bearer mk_fake_inline',
      'the comment is stripped from the credential',
    )
  } finally {
    stub.restore()
  }
})

test('a quoted value with a trailing comment is parsed as the bare credential', async () => {
  const { start } = deepProject('quoted-comment')
  writeFileSync(join(start, '.env'), 'MOLECULE_API_KEY="mk_fake_quoted" # project key\n')
  const stub = stubFetch(platformAnswer)
  try {
    await callHostedService('embeddings', 'embed', { input: ['hello'] }, start)
    assert.ok(
      serviceAuthorization(stub.requests) === 'Bearer mk_fake_quoted',
      'quotes and the comment are stripped from the credential',
    )
  } finally {
    stub.restore()
  }
})

test('export prefixes, duplicate assignments and multi-line values follow dotenv rules', async () => {
  const { start } = deepProject('dotenv-grammar')
  writeFileSync(
    join(start, '.env'),
    'export MOLECULE_API_KEY=mk_fake_first\nMOLECULE_OTHER=1\nMOLECULE_API_KEY=mk_fake_last\n',
  )
  const exported = resolveServiceKey(start)
  assert.ok(exported, 'an export-prefixed assignment is read')
  assert.ok(exported.key === 'mk_fake_last', 'the last duplicate assignment wins')

  const { start: multilineStart } = deepProject('dotenv-multiline')
  writeFileSync(join(multilineStart, '.env'), 'MOLECULE_API_KEY="line1\nline2"\n')
  const multiline = resolveServiceKey(multilineStart)
  assert.ok(multiline, 'a multi-line quoted value is parsed')
  assert.ok(multiline.key === 'line1\nline2', 'the quoted value spans both lines')

  const { start: bomStart } = deepProject('dotenv-bom')
  writeFileSync(join(bomStart, '.env'), '\uFEFFMOLECULE_API_KEY=mk_fake_bom\n')
  assert.ok(
    resolveServiceKey(bomStart)?.key === 'mk_fake_bom',
    'a byte-order mark does not become part of the variable name',
  )
})

test('placeholder variants are never read as a key source', async () => {
  const { start } = deepProject('placeholder-read')
  writeFileSync(join(start, '.env.example'), 'MOLECULE_API_KEY=mk_fake_placeholder\n')
  writeFileSync(join(start, '.env.schema'), 'MOLECULE_API_KEY=mk_fake_schema\n')
  const stub = stubFetch(platformAnswer)
  try {
    assert.ok(resolveServiceKey(start) === null, '.env.example is not a credential source')
    await assert.rejects(
      () => callHostedService('embeddings', 'embed', { input: ['hello'] }, start),
      (error) =>
        error instanceof ServiceCallError && /No molecule project API key/.test(error.message),
    )
    assert.ok(stub.requests.length === 0, 'no unmetered request is made without a key')
  } finally {
    stub.restore()
  }
})

test('create_api_key refuses unsupported destinations before minting', async () => {
  const { start } = deepProject('create-refuses')
  const stub = stubFetch(platformAnswer)
  try {
    for (const name of ['.env.example', '.env.schema', '.env.template', 'config.env', '.env.a.b']) {
      await assert.rejects(
        () => createApiKeyIntoEnv('project_fake', 'mcp', join(start, name)),
        (error) => error instanceof ServiceCallError,
        `${name} is refused`,
      )
    }
    assert.ok(stub.requests.length === 0, 'no key was minted for a refused destination')
  } finally {
    stub.restore()
  }
})

test('file precedence is .env, then byte-sorted variants, then api/, then parents', async () => {
  const { start, parent2 } = deepProject('precedence')
  mkdirSync(join(start, 'api'), { recursive: true })
  writeFileSync(join(start, '.env'), 'MOLECULE_API_KEY=mk_fake_base\n')
  writeFileSync(join(start, '.env.local'), 'MOLECULE_API_KEY=mk_fake_local\n')
  writeFileSync(join(start, 'api', '.env'), 'MOLECULE_API_KEY=mk_fake_api\n')
  assert.ok(resolveServiceKey(start)?.key === 'mk_fake_base', '.env wins over every variant')

  writeFileSync(join(start, '.env'), 'MOLECULE_API_KEY=\n')
  assert.ok(
    resolveServiceKey(start)?.key === 'mk_fake_local',
    'a blank assignment does not shadow the variant that holds a key',
  )

  rmSync(join(start, '.env.local'))
  assert.ok(resolveServiceKey(start)?.key === 'mk_fake_api', 'api/.env follows the root variants')

  writeFileSync(join(parent2, '.env.local'), 'MOLECULE_API_KEY=mk_fake_parent\n')
  writeFileSync(join(start, '.env'), 'MOLECULE_API_KEY=\n')
  rmSync(join(start, 'api', '.env'))
  assert.ok(
    resolveServiceKey(start)?.key === 'mk_fake_parent',
    'a parent variant is found once the nearer locations hold no key',
  )
})

test('MOLECULE_API_KEY in the environment wins over every file', async () => {
  const { start } = deepProject('env-priority')
  writeFileSync(join(start, '.env'), 'MOLECULE_API_KEY=mk_fake_file\n')
  process.env.MOLECULE_API_KEY = 'mk_fake_env'
  try {
    const resolved = resolveServiceKey(start)
    assert.ok(resolved, 'the environment key is found')
    assert.ok(resolved.key === 'mk_fake_env', 'the environment key wins')
    assert.ok(resolved.source === 'MOLECULE_API_KEY env', 'the source names the environment')
  } finally {
    delete process.env.MOLECULE_API_KEY
  }
})

test('the upward walk stops after two parents', async () => {
  const { root, start } = deepProject('boundary')
  writeFileSync(join(root, '.env'), 'MOLECULE_API_KEY=mk_fake_too_far\n')
  assert.ok(resolveServiceKey(start) === null, 'a key three levels up is outside the walk')

  writeFileSync(join(root, 'a', '.env'), 'MOLECULE_API_KEY=mk_fake_reachable\n')
  assert.ok(resolveServiceKey(start)?.key === 'mk_fake_reachable', 'a key two levels up is found')
})

test('create_api_key rewrites duplicate assignments so the minted key is the one read', async () => {
  const { start } = deepProject('duplicate-write')
  const target = join(start, '.env.local')
  writeFileSync(
    target,
    'MOLECULE_API_KEY=mk_fake_old_first\nOTHER=1\nMOLECULE_API_KEY=mk_fake_old_last\n',
  )
  const stub = stubFetch(platformAnswer)
  try {
    await createApiKeyIntoEnv('project_fake', 'mcp', target)
    assert.ok(assignmentCount(target) === 1, 'exactly one assignment line remains')
    assert.ok(resolveServiceKey(start)?.key === MINTED, 'the resolver reads the minted key')
  } finally {
    stub.restore()
  }
})
