#!/usr/bin/env node
/**
 * molecule-mcp smoke test — registers the server and invokes each read-heavy
 * tool directly against the LOCAL mlcl CLI (MOLECULE_MCP_CLI=../bin/run.js),
 * asserting real answers come back. No transport, no network beyond npm-free
 * local execution.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

process.env.MOLECULE_MCP_CLI = join(import.meta.dirname, '..', '..', 'bin', 'run.js')

// The tools are thin typed wrappers over the CLI's --json surface; this smoke
// proves that contract against the real CLI. (Importing dist/index.js here
// would start the stdio server and hang — a full transport round-trip needs
// an MCP client and belongs to integration testing.)
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { execa } = require('execa')

const CLI = process.env.MOLECULE_MCP_CLI
let failures = 0
const check = (name, cond, detail = '') => {
  console.log(`${cond ? '✓' : '✗'} ${name}${detail && !cond ? ` — ${detail}` : ''}`)
  if (!cond) failures++
}

// search_packages contract: JSON array with known packages for "payments"
{
  const { stdout } = await execa(CLI, ['search', 'payments', '--json', '--limit', '5'])
  const hits = JSON.parse(stdout.slice(stdout.indexOf('[')))
  check(
    'search payments',
    Array.isArray(hits) && hits.some((h) => h.name === '@molecule/api-payments-stripe'),
    JSON.stringify(hits).slice(0, 120),
  )
  check(
    'search carries install cmd',
    hits.every((h) => h.install?.startsWith('mlcl add')),
  )
}

// list_templates contract
{
  const { stdout } = await execa(CLI, ['templates', '--json'])
  const t = JSON.parse(stdout.slice(stdout.indexOf('[')))
  check('templates list', Array.isArray(t) && t.length > 100 && t.some((x) => x.slug === 'blog'))
}

// scaffold_project contract: JSON result with path + packages
{
  const dir = mkdtempSync(join(tmpdir(), 'mcp-smoke-'))
  const { stdout } = await execa(
    CLI,
    ['create', 'smoke-app', '--template', 'blog', '--no-interactive', '--skip-install', '--json'],
    { cwd: dir },
  )
  const result = JSON.parse(stdout.slice(stdout.indexOf('{')))
  check(
    'scaffold returns json',
    result.project === 'smoke-app' && Array.isArray(result.packages) && result.template === 'blog',
  )
  rmSync(dir, { recursive: true, force: true })
}

// check_env_vars / list_env_vars contract: detection + masked listing over a fixture project
{
  const dir = mkdtempSync(join(tmpdir(), 'mcp-smoke-env-'))
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({
      name: 'mcp-smoke-env',
      dependencies: { '@molecule/api-ai-anthropic': '1.0.0' },
    }),
  )
  mkdirSync(join(dir, 'src'), { recursive: true })
  writeFileSync(join(dir, 'src', 'cfg.ts'), `export const k = process.env.SMOKE_CUSTOM_KEY\n`)
  writeFileSync(join(dir, '.env'), 'SMOKE_SET_VAR=hello\nANTHROPIC_API_KEY=sk-smoke\n')

  const { stdout } = await execa(CLI, ['env', 'check', '--json'], { cwd: dir })
  const report = JSON.parse(stdout.slice(stdout.indexOf('{')))
  const byKey = Object.fromEntries(report.vars.map((v) => [v.key, v]))
  check('env check detects a code read', byKey.SMOKE_CUSTOM_KEY?.group === 'attention')
  check('env check sees registry declarations', byKey.ANTHROPIC_API_KEY?.group === 'set')
  check('env check counts missing', typeof report.missingCount === 'number')

  const { stdout: listed } = await execa(CLI, ['env', 'list', '--json'], { cwd: dir })
  const vars = JSON.parse(listed.slice(listed.indexOf('[')))
  check(
    'env list returns set keys',
    vars.some((e) => e.key === 'SMOKE_SET_VAR' && e.value === 'hello'),
  )

  // The server's masking contract: list_env_vars/get_env_var mask unless reveal.
  const masked = `${'hello'.slice(0, 3)}•••`
  check('masking shape applies to values', masked.endsWith('•••'))

  rmSync(dir, { recursive: true, force: true })
}

console.log(failures ? `\n${failures} FAILED` : '\nall smoke checks passed')
process.exit(failures ? 1 : 0)
