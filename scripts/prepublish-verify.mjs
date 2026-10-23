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
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { extname, isAbsolute, join, resolve, sep } from 'node:path'

const args = process.argv.slice(2)
if (args.length && (args.length !== 2 || args[0] !== '--tarball')) {
  console.error('Usage: prepublish-verify.mjs [--tarball <packed-file.tgz>]')
  process.exit(1)
}
const tarball = args.length ? resolve(args[1]) : null
let contentRoot = process.cwd()

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
  /^AGENTS\.md$/,
  /^\.claude/,
  // NOTE: docs/ is deliberately SHIPPED (files array) — the user-facing
  // guides are npm content. Only internal dot-dirs above stay out.
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

// ── 0. intentional-publish switch ────────────────────────────────────────────
// CI-only publish path: the GitHub Release workflow sets this env var
// because CI IS the authorized publisher. A local `npm publish` (logged in
// or not) is always blocked. See .github/workflows/release.yml.
if (!process.env.MLCL_ALLOW_PUBLISH) {
  console.error(
    '  ✗ publish is intentionally deferred (agent-roadmap work pending). Re-run with MLCL_ALLOW_PUBLISH=1 when the release is approved.',
  )
  process.exit(1)
}

// ── 1. required files ────────────────────────────────────────────────────────
console.log('required files:')
/** Check mandatory files in the package being inspected. @param {string} root - Package root. */
function requiredFiles(root) {
  for (const f of ['LICENSE', 'README.md', 'bin/run.js']) {
    if (existsSync(join(root, f))) ok(f)
    else fail(`${f} missing`)
  }
}
if (!tarball) requiredFiles(contentRoot)

// ── 2. tarball structure ─────────────────────────────────────────────────────
console.log('tarball contents:')
// prepack script output (build/oclif chatter) surrounds the JSON document —
// and some of that chatter carries ANSI escapes whose `ESC[` would defeat a
// naive indexOf('['), while trailing notices after the closing bracket defeat
// a whole-slice parse. npm also changed the shape across majors: an array of
// pack results (≤ npm 11.5) or a bare pack object (npm 11.6+ — which is also
// why slicing the FIRST '[' grabbed the nested "files": [ array). Walk
// candidate '{' and '[' positions; accept the first that yields a parseable
// document with the expected shape.
const rawPack = execFileSync(
  'npm',
  ['pack', ...(tarball ? [tarball, '--ignore-scripts'] : []), '--dry-run', '--json'],
  {
    encoding: 'utf8',
    maxBuffer: 1 << 28,
  },
)

/**
 * Extract the balanced JSON document starting at `start`, honoring string
 * literals (a close inside a quoted filename must not end the scan).
 *
 * @param {string} text - The raw npm output.
 * @param {number} start - Index of the candidate '{' or '['.
 * @returns {string | null} The document slice, or null when unbalanced.
 */
function balancedJsonAt(text, start) {
  const open = text[start]
  const close = open === '{' ? '}' : ']'
  let depth = 0
  let inString = false
  let escape = false
  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (inString) {
      if (escape) escape = false
      else if (ch === '\\') escape = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') inString = true
    else if (ch === open) depth++
    else if (ch === close) {
      depth--
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  return null
}

let pack
for (let idx = 0; idx < rawPack.length; idx++) {
  const ch = rawPack[idx]
  if (ch !== '{' && ch !== '[') continue
  const slice = balancedJsonAt(rawPack, idx)
  if (slice === null) continue
  try {
    const parsed = JSON.parse(slice)
    const doc = Array.isArray(parsed) ? parsed[0] : parsed
    if (doc && typeof doc === 'object' && Array.isArray(doc.files)) {
      pack = doc
      break
    }
  } catch (_error) {
    // Chatter bracket — try the next candidate.
  }
}
if (!pack) {
  console.error('  ✗ could not extract the npm pack JSON document from its own output chatter')
  process.exit(1)
}
const files = pack.files.map((f) => f.path)
let structural = true
for (const p of files) {
  if (isAbsolute(p) || p.split(/[\\/]/).includes('..')) {
    fail(`tarball contains an escaping path: ${p}`)
    structural = false
  }
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
    `${files.length} files, no internal/machine paths (${(pack.unpackedSize / 1e6).toFixed(1)} MB unpacked)`,
  )

if (tarball) {
  if (!structural) process.exit(1)
  // npm's own pack manifest above and the standard tar extractor inspect the
  // archived bytes, including files postpack removed from the working tree.
  const scratch = mkdtempSync(join(tmpdir(), 'mlcl-prepublish-'))
  process.on('exit', () => rmSync(scratch, { recursive: true, force: true }))
  execFileSync('tar', ['-xzf', tarball, '-C', scratch, '--no-same-owner', '--no-same-permissions'])
  contentRoot = join(scratch, 'package')
  if (!realpathSync(contentRoot).startsWith(`${realpathSync(scratch)}${sep}`))
    throw new Error('packed package root escapes the extraction directory')
  requiredFiles(contentRoot)
}

// ── 3. content sweep of shipped files ────────────────────────────────────────
console.log('content sweep:')
let scanned = 0
let contentClean = true
for (const p of files) {
  if (BINARY_EXT.has(extname(p).toLowerCase())) continue
  let content
  try {
    const file = join(contentRoot, p)
    if (tarball && !realpathSync(file).startsWith(`${realpathSync(contentRoot)}${sep}`))
      throw new Error('packed file escapes the archive')
    const st = statSync(file)
    if (!st.isFile() || st.size > 3_000_000) continue
    content = readFileSync(file, 'latin1')
  } catch (_error) {
    if (tarball) {
      fail(`cannot inspect packed file: ${p}`)
      contentClean = false
    }
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

// ── 4. history root ──────────────────────────────────────────────────────────
// The public history starts at one fresh commit (2026-09-18); the pre-wipe
// history lives only in the private archive. What must hold is that the
// history has exactly that ROOT — nothing dated before it. A commit COUNT
// cannot tell the two apart: the fresh history itself passed 200 commits in
// a fortnight, and the old >200 check then blocked every publish.
console.log('git history:')
const FRESH_ROOT_DATE = '2026-09-18'
const roots = execFileSync('git', ['rev-list', '--max-parents=0', 'HEAD'], { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean)
const oldest = execFileSync('git', ['log', '--reverse', '--format=%cs', 'HEAD'], {
  encoding: 'utf8',
}).split('\n')[0]
if ((roots.length !== 1 || oldest < FRESH_ROOT_DATE) && !process.env.MLCL_ALLOW_DEEP_HISTORY) {
  fail(
    `history has ${roots.length} root(s) and a commit dated ${oldest} — the public history must start at the single fresh commit of ${FRESH_ROOT_DATE}; the pre-wipe history came back or the wrong repo is being published (set MLCL_ALLOW_DEEP_HISTORY=1 only if intentionally shipping deep history)`,
  )
} else {
  ok(`one root, oldest commit ${oldest}`)
}

console.log(failed ? '\nPREPUBLISH BLOCKED — fix the findings above' : '\nprepublish checks passed')
process.exit(failed ? 1 : 0)
