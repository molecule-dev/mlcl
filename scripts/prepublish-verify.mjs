#!/usr/bin/env node
/**
 * npm publish gate for mlcl. Runs as `prepublishOnly` — a publish that would
 * leak internals or ship a dirty tree fails here, before the tarball leaves
 * the machine.
 *
 * Checks:
 *   1. Required publish files exist (LICENSE, README.md, bin/run.js).
 *   2. Tarball file list (npm pack --dry-run): no internal dirs (.agents/,
 *      docs/, AGENTS.md, .claude), no env files, no machine-specific paths.
 *   3. Content sweep of everything the tarball ships: personal home paths,
 *      private sibling-repo URLs, private-key material, non-local
 *      credentialed service URLs. Known-benign literals (documented provider
 *      examples, localhost fixture creds) are filtered.
 *   4. Git history depth — the public history starts from a fresh initial
 *      commit; refuse a deep history unless MLCL_ALLOW_DEEP_HISTORY=1 is set
 *      consciously.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { extname } from 'node:path'

const BINARY_EXT = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.ico',
  '.webp',
  '.svgz',
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.eot',
  '.mp4',
  '.webm',
  '.zip',
  '.gz',
  '',
])
const FORBIDDEN_TARBALL_PATHS = [
  /^\.agents\//,
  /^docs\//,
  /^AGENTS\.md$/,
  /^\.claude/,
  // npm's `files` array BYPASSES .gitignore/.npmignore (verified empirically):
  // anything a local e2e/playwright run drops under templates/ would ship in
  // the tarball. These patterns refuse that loudly instead of publishing junk.
  /\/test-results\//,
  /\/_artifacts\//,
  /\/playwright-report\//,
  /\/e2e\/results\.json$/,
  /\/\.DS_Store$/,
  // Generated test key material (api/.keys/** from local vitest runs) — never
  // ships, and the gate makes that a checked invariant instead of an accident
  // of npm's dot-directory rules.
  /\/\.keys\//,
  /\.log$/,
]

/** Real env files never ship; `.env.example` is documentation and may. */
const isForbiddenEnvFile = (path) => {
  const base = path.split('/').pop()
  return base === '.env' || (/^\.env\./.test(base) && base !== '.env.example')
}
const MACHINE_PATH = /\/home\/[a-z](?:\/|$)|\/Users\/[A-Za-z]\//
const INTERNAL_REPO = /gitlab\.com[:/]molecule-dev/
const PRIVATE_KEY = /-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/
const CREDS_URL =
  /(?:postgres(?:ql)?|mongodb(?:\+srv)?|rediss?|amqp):\/\/[^\s"'@]+:[^\s"'@]+@[^\s"'<]+/

const AWS_DOC_EXAMPLE = ['AKIA', 'IOSFODNN7', 'EXAMPLE'].join('')
const BENIGN_CONTENT = [
  AWS_DOC_EXAMPLE,
  ['4eC39HqLyjWDarjt', 'T1zdp7dc'].join(''),
  'postgres:postgres@localhost',
  'molecule:molecule@127.0.0.1',
  'molecule:molecule@localhost',
  ':secret@db.internal',
  'user:pass@host:port',
  ['whsec_', 'unused_in_this_spec'].join(''),
  ['whsec_', 'capability_contract_secret'].join(''),
]
const LOCAL_HOSTS =
  /^(localhost|127\.0\.0\.1|::1|db\.internal|.*\.internal|.*\.example|example\.com|.*\.example\.com|host|db|postgres|redis|mongo)$/

let failed = false
const fail = (msg) => {
  console.error(`  ✗ ${msg}`)
  failed = true
}
const ok = (msg) => console.log(`  ✓ ${msg}`)

// ── 1. required files ────────────────────────────────────────────────────────
console.log('required files:')
for (const f of ['LICENSE', 'README.md', 'bin/run.js']) {
  if (existsSync(f)) ok(f)
  else fail(`${f} missing`)
}

// ── 2. tarball structure ─────────────────────────────────────────────────────
console.log('tarball contents:')
// prepack script output (build/oclif chatter) precedes the JSON array — take
// everything from the first top-level '[' and parse that.
const rawPack = execFileSync('npm', ['pack', '--dry-run', '--json'], {
  encoding: 'utf8',
  maxBuffer: 1 << 28,
})
const pack = JSON.parse(rawPack.slice(rawPack.indexOf('[')))[0]
const files = pack.files.map((f) => f.path)
let structural = true
for (const p of files) {
  if (FORBIDDEN_TARBALL_PATHS.some((re) => re.test(p)) || isForbiddenEnvFile(p)) {
    fail(`tarball contains internal path: ${p}`)
    structural = false
  }
  if (MACHINE_PATH.test(p)) {
    fail(`tarball contains machine-specific path: ${p}`)
    structural = false
  }
}
if (structural)
  ok(
    `${files.length} files, no internal/machine paths (${(pack.size / 1e6).toFixed(1)} MB unpacked)`,
  )

// ── 3. content sweep of shipped files ────────────────────────────────────────
console.log('content sweep:')
let scanned = 0
let contentClean = true
for (const p of files) {
  if (BINARY_EXT.has(extname(p).toLowerCase())) continue
  let content
  try {
    const st = execFileSync('stat', ['-c', '%s', p], { encoding: 'utf8' })
    if (parseInt(st, 10) > 3_000_000) continue
    content = readFileSync(p, 'latin1')
  } catch (_error) {
    // Intentional skip: pack file lists can include directory rows that have
    // no readable content — nothing to sweep there.
    continue
  }
  scanned += 1
  const reasons = []
  if (MACHINE_PATH.test(content)) reasons.push('personal home path')
  if (INTERNAL_REPO.test(content)) reasons.push('private sibling-repo URL')
  if (PRIVATE_KEY.test(content) && !/BEGIN PRIVATE KEY-----\\n/.test(content))
    reasons.push('private key material')
  const url = CREDS_URL.exec(content)?.[0]
  if (
    url &&
    !BENIGN_CONTENT.some(
      (b) =>
        content.includes(b) &&
        content
          .slice(Math.max(0, content.indexOf(url) - 60), content.indexOf(url) + url.length + 60)
          .includes(b),
    )
  ) {
    const host = url
      .split('@')[1]
      ?.split(/[/:]/)[0]
      ?.replace(/[^a-z0-9.-]/gi, '')
    if (host && !LOCAL_HOSTS.test(host)) reasons.push(`non-local credentialed URL (${host})`)
  }
  if (reasons.length) {
    fail(`${p}: ${[...new Set(reasons)].join(', ')}`)
    contentClean = false
  }
}
if (contentClean) ok(`${scanned} text files clean`)

// ── 4. history depth ─────────────────────────────────────────────────────────
console.log('git history:')
const depth = parseInt(
  execFileSync('git', ['rev-list', '--count', 'HEAD'], { encoding: 'utf8' }),
  10,
)
if (depth > 5 && !process.env.MLCL_ALLOW_DEEP_HISTORY) {
  fail(
    `history depth ${depth} > 5 — public history must start from the fresh initial commit (set MLCL_ALLOW_DEEP_HISTORY=1 only if deep history is intended)`,
  )
} else {
  ok(`depth ${depth}${depth > 5 ? ' (explicitly allowed)' : ''}`)
}

console.log(failed ? '\nPREPUBLISH BLOCKED — fix the findings above' : '\nprepublish checks passed')
process.exit(failed ? 1 : 0)
