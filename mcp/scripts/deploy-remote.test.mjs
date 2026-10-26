import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import test from 'node:test'

// The override drives the same assertions against a retained committed preimage.
const sourceRoot = process.env.MCP_DEPLOY_TEST_ROOT ?? resolve(import.meta.dirname, '../..')

function fixture(run, { fail = 0, missing } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'mcp-deploy-'))
  const repo = join(dir, 'repo')
  const bin = join(dir, 'bin')
  const scratch = join(dir, 'scratch')
  const record = join(dir, 'fly-call.json')
  try {
    for (const path of ['mcp/scripts', 'mcp/src', 'mcp/assets', 'templates/apps']) {
      mkdirSync(join(repo, path), { recursive: true })
    }
    mkdirSync(bin)
    mkdirSync(scratch)
    for (const path of ['mcp/scripts/deploy-remote.sh', 'mcp/fly.toml']) {
      copyFileSync(join(sourceRoot, path), join(repo, path))
    }
    for (const path of [
      'mcp/package.json',
      'mcp/tsconfig.json',
      'registry.json',
      'templates/apps/registry.json',
    ]) {
      writeFileSync(join(repo, path), JSON.stringify({ source: path }) + '\n')
    }
    writeFileSync(join(repo, 'mcp/Dockerfile'), 'FROM scratch\n')
    writeFileSync(join(repo, 'mcp/src/remote.ts'), 'export {}\n')
    writeFileSync(join(repo, 'mcp/assets/icon.svg'), '<svg/>\n')
    writeFileSync(join(repo, 'unrelated-private-file'), 'must not enter build context\n')
    if (missing) rmSync(join(repo, missing))
    writeFileSync(
      join(bin, 'flyctl'),
      `#!/usr/bin/env node
const fs = require('node:fs')
fs.writeFileSync(process.env.MCP_TEST_RECORD, JSON.stringify({
  args: process.argv.slice(2), cwd: process.cwd(), files: fs.readdirSync('.').sort(),
  config: fs.readFileSync('fly.toml', 'utf8'),
  registry: fs.readFileSync('catalog/registry.json', 'utf8'),
  templates: fs.readFileSync('catalog/templates.json', 'utf8')
}))
process.exit(Number(process.env.MCP_TEST_EXIT))
`,
      { mode: 0o755 },
    )
    const result = spawnSync('bash', ['mcp/scripts/deploy-remote.sh'], {
      cwd: repo,
      encoding: 'utf8',
      timeout: 10_000,
      env: {
        ...process.env,
        PATH: bin + ':' + process.env.PATH,
        TMPDIR: scratch,
        MCP_TEST_RECORD: record,
        MCP_TEST_EXIT: String(fail),
      },
    })
    const called = existsSync(record) ? JSON.parse(readFileSync(record, 'utf8')) : null
    run({ result, called, scratch })
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

test('actual script forwards the staged config and catalogs to the remote Fly deployment', () => {
  fixture(({ result, called }) => {
    assert.equal(result.status, 0, result.stderr)
    assert.deepEqual(called.args, [
      'deploy',
      '--remote-only',
      '--config',
      'fly.toml',
      '--app',
      'molecule-mcp',
    ])
    assert.deepEqual(called.files, [
      'Dockerfile',
      'assets',
      'catalog',
      'fly.toml',
      'package.json',
      'src',
      'tsconfig.json',
    ])
    assert.deepEqual(JSON.parse(called.registry), { source: 'registry.json' })
    assert.deepEqual(JSON.parse(called.templates), { source: 'templates/apps/registry.json' })
    assert.equal(existsSync(called.cwd), false, 'EXIT trap cleans the build context')
  })
})

test('actual staged config selects native bluegreen without persistent scale expansion', () => {
  fixture(({ result, called }) => {
    assert.equal(result.status, 0, result.stderr)
    assert.match(called.config, /\[deploy\]\s*strategy\s*=\s*"bluegreen"/)
    assert.match(called.config, /min_machines_running\s*=\s*1\b/)
    assert.doesNotMatch(called.config, /^\s*\[\[?mounts\]?\]/m)
  })
})

test('actual staged readiness remains service-level GET health with no grace delay', () => {
  fixture(({ result, called }) => {
    assert.equal(result.status, 0, result.stderr)
    const health = called.config.split('[[http_service.checks]]')[1]?.split('[[vm]]')[0] ?? ''
    assert.match(health, /grace_period\s*=\s*"0s"/)
    assert.match(health, /method\s*=\s*"GET"/)
    assert.match(health, /path\s*=\s*"\/health"/)
  })
})

test('a failed Fly command propagates its status and cleans the staged context', () => {
  fixture(
    ({ result, called }) => {
      assert.equal(result.status, 37)
      assert.ok(called)
      assert.equal(existsSync(called.cwd), false)
    },
    { fail: 37 },
  )
})

for (const missing of ['registry.json', 'templates/apps/registry.json']) {
  test(`missing ${missing} refuses before invoking Fly`, () => {
    fixture(
      ({ result, called, scratch }) => {
        assert.notEqual(result.status, 0)
        assert.equal(called, null)
        assert.deepEqual(readdirSync(scratch), [])
      },
      { missing },
    )
  })
}
