/**
 * `egressHosts` gates — the registry field that feeds a sandbox's outbound
 * allowlist.
 *
 * A project that installs `@molecule/api-payments-stripe` gets `api.stripe.com`
 * merged into its sandbox egress allowlist automatically. Both failure modes
 * here are SILENT: a missing host means the vendor call is dropped at the
 * network layer with no denial signal, and a malformed host means exactly the
 * same thing while looking correct in review.
 *
 * Two gates:
 *
 * 1. **Shape** — every declared host is a bare hostname the sandbox matcher can
 *    actually match (`hostMatchesPattern` in molecule-dev's
 *    `api/src/sandbox/egress-policy.ts`), and is a host that is really dialed.
 * 2. **Coverage** — every provider bond whose source declares a literal http(s)
 *    base URL declares hosts, scanned from the real molecule bond sources.
 *
 * @module
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const __dir = dirname(fileURLToPath(import.meta.url))
const mlclRoot = join(__dir, '..', '..', '..')
const registryPath = join(mlclRoot, 'registry.json')

interface RawEntry {
  path?: string
  egressHosts?: unknown
}

const registry = JSON.parse(readFileSync(registryPath, 'utf-8')) as {
  packages?: Record<string, RawEntry>
}

/** Every package that declares the field, with its declared hosts. */
const declared: Array<{ name: string; hosts: string[] }> = Object.entries(registry.packages ?? {})
  .filter(([, entry]) => entry.egressHosts !== undefined)
  .map(([name, entry]) => ({ name, hosts: entry.egressHosts as string[] }))

/**
 * A bare hostname, or a `*.apex` wildcard. Lowercase-only by construction, so
 * this doubles as the case check. No scheme, no path, no port, no whitespace —
 * the matcher compares a normalized HOST, so anything else can never match.
 */
const HOSTNAME_PATTERN = /^(?:\*\.)?(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/

/**
 * Substrings that mark a vendor's WEB surface rather than an API host a server
 * dials. Each of these appears in the fleet's `secrets.ts` `helpUrl` values, so
 * they are exactly what a careless copy-paste from the neighbouring metadata
 * would produce — and allowing them widens a sandbox's egress for nothing.
 *
 * - `dashboard.` — vendor web console (dashboard.stripe.com, dashboard.daily.co)
 * - `console.` — same (console.aws.amazon.com, console.twilio.com)
 * - `docs.` — documentation site
 * - `developers.` / `developer.` — developer portal (developers.facebook.com,
 *   developer.apple.com); both spellings are in use across the fleet's helpUrls
 * - `platform.` — key-minting portal (platform.openai.com, platform.stability.ai)
 *
 * `www.` is deliberately NOT here: `www.googleapis.com` (oauth/calendar Google),
 * `www.alphavantage.co` and `www.ecb.europa.eu` are the real API hosts those
 * bonds dial.
 */
const WEB_SURFACE_SUBSTRINGS = [
  'dashboard.',
  'console.',
  'docs.',
  'developers.',
  'developer.',
  'platform.',
]

describe('registry egressHosts shape', () => {
  it('has subjects to check (the gate is not vacuous)', () => {
    expect(declared.length).toBeGreaterThan(20)
  })

  it('every declared egressHosts is a non-empty array of strings', () => {
    const invalid: string[] = []

    for (const { name, hosts } of declared) {
      if (!Array.isArray(hosts)) {
        invalid.push(`${name}: not an array`)
        continue
      }
      if (hosts.length === 0) {
        invalid.push(`${name}: empty array — omit the field instead of declaring []`)
      }
      for (const host of hosts) {
        if (typeof host !== 'string')
          invalid.push(`${name}: non-string entry ${JSON.stringify(host)}`)
      }
    }

    expect(invalid, 'Fix these egressHosts entries in registry.json').toEqual([])
  })

  it('every host is a bare lowercase hostname — no scheme, path, port or whitespace', () => {
    const invalid: string[] = []

    for (const { name, hosts } of declared) {
      for (const host of Array.isArray(hosts) ? hosts : []) {
        if (typeof host !== 'string') continue
        if (host !== host.trim() || /\s/.test(host)) {
          invalid.push(`${name}: "${host}" contains whitespace`)
          continue
        }
        if (host.includes('://')) {
          invalid.push(`${name}: "${host}" includes a scheme — declare the host only`)
          continue
        }
        if (host.includes('/')) {
          invalid.push(`${name}: "${host}" includes a path — the policy key is the host alone`)
          continue
        }
        if (/:\d+$/.test(host)) {
          invalid.push(`${name}: "${host}" includes a port — ports are not part of the policy key`)
          continue
        }
        if (host !== host.toLowerCase()) {
          invalid.push(
            `${name}: "${host}" is not lowercase — the matcher compares normalized hosts`,
          )
          continue
        }
        if (!HOSTNAME_PATTERN.test(host)) {
          invalid.push(`${name}: "${host}" is not a bare hostname or \`*.apex\` wildcard`)
        }
      }
    }

    expect(
      invalid,
      'egressHosts entries must be bare hostnames — anything else silently never matches',
    ).toEqual([])
  })

  it('no middle wildcard — the matcher only supports a `*.` PREFIX', () => {
    // `hostMatchesPattern` (molecule-dev api/src/sandbox/egress-policy.ts) takes
    // exactly one branch for wildcards: `pattern.startsWith('*.')` → suffix-match
    // the apex. Anything else falls through to an EXACT string comparison, so
    // `email.*.amazonaws.com` is a pattern that can never match any host — a
    // broken allowlist that reads as correct. This is the bug class the field
    // exists to avoid, so it gets its own gate.
    const invalid: string[] = []

    for (const { name, hosts } of declared) {
      for (const host of Array.isArray(hosts) ? hosts : []) {
        if (typeof host !== 'string' || !host.includes('*')) continue
        const stars = host.split('*').length - 1
        if (stars > 1 || !host.startsWith('*.')) {
          invalid.push(
            `${name}: "${host}" — only a leading \`*.\` wildcard matches; enumerate the exact hosts instead`,
          )
          continue
        }
        // `*.com` would hand a sandbox every host under a public suffix. Two
        // labels is the cheap floor that needs no public-suffix list; it does
        // not catch `*.co.uk`, which stays a review concern.
        const apexLabels = host.slice(2).split('.')
        if (apexLabels.length < 2) {
          invalid.push(`${name}: "${host}" wildcards a bare TLD — far too wide`)
        }
      }
    }

    expect(invalid, 'Fix these wildcard patterns in registry.json').toEqual([])
  })

  it('no duplicate hosts within a package', () => {
    const invalid: string[] = []

    for (const { name, hosts } of declared) {
      const seen = new Set<string>()
      for (const host of Array.isArray(hosts) ? hosts : []) {
        if (typeof host !== 'string') continue
        if (seen.has(host)) invalid.push(`${name}: "${host}" listed twice`)
        seen.add(host)
      }
    }

    expect(invalid, 'Remove the duplicate egressHosts entries').toEqual([])
  })

  it('no dashboard, console or documentation hosts — those are never dialed', () => {
    const invalid: string[] = []

    for (const { name, hosts } of declared) {
      for (const host of Array.isArray(hosts) ? hosts : []) {
        if (typeof host !== 'string') continue
        for (const banned of WEB_SURFACE_SUBSTRINGS) {
          if (host.includes(banned)) {
            invalid.push(
              `${name}: "${host}" looks like a web console/doc host (matched "${banned}")`,
            )
          }
        }
      }
    }

    expect(
      invalid,
      'egressHosts lists hosts the SERVER dials. A vendor dashboard or docs site is a browser ' +
        'destination — allowing it widens sandbox egress for nothing. Verify against the bond ' +
        'source or its SDK default endpoint, not a help URL.',
    ).toEqual([])
  })
})

/** One `const … = 'https://…'`-shaped base-URL declaration found in bond source. */
interface BaseUrlDeclaration {
  file: string
  line: number
  identifier: string
  url: string
}

/**
 * Drop comments so a URL inside JSDoc (`Defaults to 'https://api.openai.com'.`)
 * is never mistaken for a declaration. The line-comment pattern requires
 * whitespace or a delimiter before `//` so the `//` inside a URL literal — always
 * preceded by `:` — survives.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[\s;{}(),])\/\/[^\n]*/g, '$1')
}

/**
 * Does this identifier name a base URL? Covers every shape the bond fleet
 * actually uses: `DEFAULT_BASE_URL`, `DEFAULT_API_BASE_URL`, `DEFAULT_API_BASE`,
 * `API_BASE`, `DEFAULT_API_URL`, `DOPPLER_API_URL`, `DEFAULT_VAULT_URL`,
 * `DEFAULT_TOKEN_URL`, `this.baseUrl`, …
 */
function looksLikeBaseUrlIdentifier(identifier: string): boolean {
  const normalized = identifier.toLowerCase().replace(/_/g, '')
  return (
    normalized.includes('baseurl') ||
    normalized.includes('apibase') ||
    normalized.includes('apiurl') ||
    normalized.includes('endpoint') ||
    normalized.endsWith('url') ||
    normalized.endsWith('uri')
  )
}

/** `const X =` / `export const X =` / `let X =` / `this.x =`. */
const DECLARATION_PATTERN =
  /^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::\s*[^=]+?)?=\s*(.*)$/
const MEMBER_ASSIGNMENT_PATTERN = /^\s*this\.([A-Za-z_$][\w$]*)\s*=\s*(.*)$/
/** A literal URL, with `${}` interpolation excluded (host is not knowable). */
const URL_LITERAL_PATTERN = /['"`](https?:\/\/[^'"`\s${}]+)/
/** The right-hand side continues on the next line (prettier wraps `??` chains). */
const CONTINUES_PATTERN = /(?:[=?:(,+[]|\?\?|\|\||&&)\s*$/

/**
 * Find literal base-URL declarations in one TypeScript source file.
 *
 * Deliberately conservative: it reads DECLARATIONS only, so an object property
 * (`helpUrl: 'https://dashboard.stripe.com/apikeys'`) is never picked up, and a
 * bond that dials through a vendor SDK with no literal in its own source is
 * simply not flagged. That makes the coverage gate one-directional — everything
 * it flags must declare hosts; a package may legitimately declare hosts without
 * being flagged.
 */
function findBaseUrlDeclarations(source: string, file: string): BaseUrlDeclaration[] {
  const lines = stripComments(source).split('\n')
  const found: BaseUrlDeclaration[] = []

  for (let i = 0; i < lines.length; i++) {
    const match = DECLARATION_PATTERN.exec(lines[i]) ?? MEMBER_ASSIGNMENT_PATTERN.exec(lines[i])
    if (!match) continue
    const identifier = match[1]
    if (!looksLikeBaseUrlIdentifier(identifier)) continue

    // Absorb wrapped continuation lines: `this.baseUrl =` \n `config.baseUrl ??`
    // \n `process.env.X ??` \n `'https://…'` is one statement across four lines.
    let rhs = match[2]
    for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
      if (rhs.trim() !== '' && !CONTINUES_PATTERN.test(rhs)) break
      rhs += ` ${lines[j].trim()}`
    }

    const url = URL_LITERAL_PATTERN.exec(rhs)
    if (url) found.push({ file, line: i + 1, identifier, url: url[1] })
  }

  return found
}

/** Collect every non-test `.ts` file under a bond's `src/`. */
function collectSourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '__tests__') {
      continue
    }
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      collectSourceFiles(full, acc)
    } else if (
      entry.name.endsWith('.ts') &&
      !entry.name.endsWith('.test.ts') &&
      !entry.name.endsWith('.d.ts')
    ) {
      acc.push(full)
    }
  }
  return acc
}

/**
 * Bonds that declare a literal base URL yet correctly have NO `egressHosts`.
 * Every entry needs a one-line reason, and the gate below asserts each one is
 * still actually flagged — an exemption that stops applying must be deleted,
 * not left to rot into a hole nobody can see (AGENTS Rule 23).
 *
 * The egress-probe negative controls in `code-sandbox/docker` and
 * `code-sandbox/flyio` need no entry here: their targets are bare `ip:port`
 * literals (`1.1.1.1:443`), never URL literals, so the scanner cannot see them —
 * which is the outcome we want, since those destinations must stay BLOCKED for
 * the probe to mean anything.
 */
const COVERAGE_EXEMPT: Record<string, string> = {
  '@molecule/api-ai-local':
    'Default base URL is `http://localhost:11434/v1` (Ollama on the same host) — not egress at ' +
    'all. A project pointing it at a REMOTE inference host supplies that host itself, so it ' +
    'belongs in that project’s allowlist, not in the package.',
  '@molecule/api-ai-translation-madlad':
    'Default base URL is `http://127.0.0.1:8765` (the bundled CTranslate2 sidecar on the same ' +
    'host) — not egress at all. The sidecar lifecycle belongs to the app process that spawns it.',
  '@molecule/api-ai-decisions-laya':
    'Default base URL is `http://localhost:8000` (a Laya decision server on the same host) — ' +
    'not egress at all. A project pointing it at a remote host supplies that host itself, so ' +
    'it belongs in that project’s allowlist, not in the package.',
  '@molecule/api-ai-speech-nemo-speech':
    'Default base URL is `http://127.0.0.1:8080` (a self-hosted `nemo-speech serve` on the same ' +
    'host) — not egress at all. A project pointing it at a remote speech host supplies that host ' +
    'itself, so it belongs in that project’s allowlist, not in the package.',
}

describe('registry egressHosts coverage vs molecule bond sources', () => {
  it('every bond declaring a literal base URL declares egressHosts', () => {
    // molecule is a sibling checkout that mlcl's CI clones as DATA (same shape
    // as toolchain.test.ts' fleet↔molecule check). Skip in a standalone mlcl
    // clone rather than fail — the workspace run covers it.
    const bondsRoot = join(mlclRoot, '..', 'molecule', 'packages', 'api', 'bonds')
    let categories: string[]
    try {
      categories = readdirSync(bondsRoot)
    } catch (_error) {
      return // standalone mlcl checkout — no molecule sibling to scan
    }
    expect(categories.length).toBeGreaterThan(0)

    const flagged = new Map<string, BaseUrlDeclaration[]>()

    for (const category of categories) {
      const categoryDir = join(bondsRoot, category)
      let providers: Array<{ name: string; isDirectory: () => boolean }>
      try {
        providers = readdirSync(categoryDir, { withFileTypes: true })
      } catch (_error) {
        continue // a stray file among the category dirs
      }

      for (const provider of providers) {
        if (!provider.isDirectory()) continue
        const bondDir = join(categoryDir, provider.name)
        const manifestPath = join(bondDir, 'package.json')
        const srcDir = join(bondDir, 'src')
        if (!existsSync(manifestPath) || !existsSync(srcDir)) continue

        const packageName = (JSON.parse(readFileSync(manifestPath, 'utf-8')) as { name?: string })
          .name
        if (!packageName) continue

        const declarations: BaseUrlDeclaration[] = []
        for (const file of collectSourceFiles(srcDir)) {
          declarations.push(
            ...findBaseUrlDeclarations(readFileSync(file, 'utf-8'), file.slice(bondDir.length + 1)),
          )
        }
        if (declarations.length > 0) flagged.set(packageName, declarations)
      }
    }

    // The scanner finding nothing would make this gate silently vacuous.
    expect(
      flagged.size,
      'base-URL scanner matched nothing — the patterns have drifted',
    ).toBeGreaterThan(20)

    const missing: string[] = []
    for (const [packageName, declarations] of [...flagged].sort()) {
      if (packageName in COVERAGE_EXEMPT) continue
      const entry = registry.packages?.[packageName]
      if (!entry) continue // bond not carried in the registry at all
      const hosts = entry.egressHosts
      if (Array.isArray(hosts) && hosts.length > 0) continue
      const where = declarations
        .map((d) => `${d.file}:${d.line} ${d.identifier} = ${d.url}`)
        .join('; ')
      missing.push(`${packageName}: ${where}`)
    }

    expect(
      missing,
      'These bonds dial a literal base URL but declare no egressHosts, so a sandbox drops their ' +
        'vendor calls with no denial signal. Add egressHosts to registry.json (hostname only, ' +
        'verified from the bond source or its SDK default endpoint) — or add a commented ' +
        'COVERAGE_EXEMPT entry if the URL is a localhost default.',
    ).toEqual([])

    const staleExemptions = Object.keys(COVERAGE_EXEMPT).filter((name) => !flagged.has(name))
    expect(
      staleExemptions,
      'These COVERAGE_EXEMPT entries no longer match any scanned bond — delete them so the ' +
        'exemption list can never hide a package it no longer describes.',
    ).toEqual([])
  })
})
