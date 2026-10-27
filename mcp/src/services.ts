/**
 * molecule.dev hosted services for MCP tools.
 *
 * Two credentials, two jobs:
 *   - the SESSION token (login / MOLECULE_TOKEN) manages the account — list
 *     projects, mint a project API key;
 *   - a PROJECT API key (`mk_…`) pays for service calls, metered and billed to
 *     that project exactly like a deployed app calling the same URL. It is read
 *     from MOLECULE_API_KEY, else from the project's dotenv files (`.env`, then
 *     `.env.<variant>`, in the project root and its `api/` directory — the same
 *     place the app's `@molecule/*-molecule` bonds read it), so the key never
 *     has to pass through the chat transcript.
 */
import { chmodSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { parseEnv } from 'node:util'

import { apiBase, sessionToken } from './auth.js'

/** Where a project key was found (never the key itself). */
export interface ServiceKey {
  key: string
  source: string
}

/**
 * The dotenv file names this server treats as project env files — the names
 * `create_api_key` may write and the names key resolution reads. The SAME
 * predicate on both sides is what keeps a written key discoverable.
 */
const ENV_FILE_NAME_RE = /^\.env(?:\.([A-Za-z0-9_-]+))?$/

/**
 * Variants that hold placeholders or tool bookkeeping, never credentials
 * (`.env.example`, `.env.schema`, `.env.vault`, …). Auto-loading one would
 * send a placeholder as the bearer key, so neither side accepts them.
 * Compared case-insensitively.
 */
const PLACEHOLDER_ENV_VARIANTS = new Set([
  'example',
  'sample',
  'schema',
  'template',
  'tmpl',
  'dist',
  'vault',
  'keys',
])

/**
 * Whether a dotenv basename is a project env file: `.env`, or `.env.<variant>`
 * where the variant is not a placeholder.
 *
 * @param name - A dotenv file's basename.
 * @returns True when the file may hold — and be written with — the project key.
 */
function isProjectEnvFileName(name: string): boolean {
  const match = ENV_FILE_NAME_RE.exec(name)
  if (!match) return false
  return match[1] === undefined || !PLACEHOLDER_ENV_VARIANTS.has(match[1].toLowerCase())
}

/**
 * Parse one variable out of a dotenv file with Node's own dotenv parser
 * (`util.parseEnv`), so inline comments, single/double quoting, `export`
 * prefixes, duplicate assignments (last wins) and multi-line quoted values
 * follow exactly the rules `node --env-file` applies — not a lookalike regex.
 *
 * @param file - Dotenv file to read.
 * @param name - Variable name.
 * @returns The parsed non-blank value, or undefined when absent.
 */
function readDotenvVar(file: string, name: string): string | undefined {
  if (!existsSync(file)) return undefined
  // A BOM would otherwise become part of the first variable's NAME.
  const content = readFileSync(file, 'utf8')
  const parsed = parseEnv(content.charCodeAt(0) === 0xfeff ? content.slice(1) : content)
  const value = parsed[name]
  return typeof value === 'string' && value.trim() ? value : undefined
}

/**
 * The dotenv files in one directory that may hold the project key, in
 * precedence order: `.env` first, then `.env.<variant>` byte-sorted — a fixed
 * order across filesystems, so the same tree always resolves the same file.
 *
 * @param dir - Directory to list.
 * @returns Candidate paths (empty when `dir` is not a readable directory).
 */
function dotenvCandidates(dir: string): string[] {
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch (_error) {
    // Not a directory, or not readable: this location has no candidates.
    return []
  }
  return entries
    .filter(isProjectEnvFileName)
    .sort((a, b) => {
      if (a === b) return 0
      if (a === '.env') return -1
      if (b === '.env') return 1
      return a < b ? -1 : 1
    })
    .map((name) => join(dir, name))
}

/**
 * The project API key for service calls, resolved in this documented order:
 *
 *   1. `MOLECULE_API_KEY` in this server's environment (always wins);
 *   2. `.env`, then every `.env.<variant>` (byte-sorted), in `directory` —
 *      then the same set in `directory/api`;
 *   3. the same two locations in each parent, up to two parents.
 *
 * Inside one file, Node's dotenv rules apply: the LAST assignment wins, and
 * inline comments / quoting are honoured. A file that does not define a
 * non-blank MOLECULE_API_KEY is skipped, and placeholder variants
 * (`.env.example`, `.env.schema`, …) are never read. Because `create_api_key`
 * writes only these names through the same predicate, a key it writes at
 * `<dir>/.env[.<variant>]` or `<dir>/api/.env[.<variant>]` is found by a later
 * service call whose `directory` is that project directory (or up to two
 * levels below it).
 *
 * @param directory - Project directory to search (default cwd).
 * @returns The key and where it came from, or null.
 */
export function resolveServiceKey(directory?: string): ServiceKey | null {
  if (process.env.MOLECULE_API_KEY) {
    return { key: process.env.MOLECULE_API_KEY, source: 'MOLECULE_API_KEY env' }
  }
  let dir = resolve(directory ?? process.cwd())
  for (let level = 0; level < 3; level++) {
    for (const location of [dir, join(dir, 'api')]) {
      for (const file of dotenvCandidates(location)) {
        const key = readDotenvVar(file, 'MOLECULE_API_KEY')
        if (key) return { key, source: file }
      }
    }
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return null
}

/** Thrown with a message an agent can act on. */
export class ServiceCallError extends Error {
  constructor(
    message: string,
    /** Seconds the platform asked us to wait (`Retry-After`), when it sent the header. */
    readonly retryAfterSeconds?: number,
  ) {
    super(message)
  }
}

/** Seconds from a `Retry-After` header, or undefined. */
function retryAfterOf(response: Response): number | undefined {
  const value = Number(response.headers.get('retry-after'))
  return Number.isFinite(value) && value > 0 ? Math.ceil(value) : undefined
}

/** The "try again" hint: the header's seconds, or a minute for `service.busy`. */
function retryHint(seconds: number | undefined, errorKey: string | undefined): string {
  if (seconds !== undefined) return ` Try again in ${seconds} second${seconds === 1 ? '' : 's'}.`
  return errorKey === 'service.busy' ? ' Try again in a minute.' : ''
}

/**
 * POST /v1/services/<service>/<operation> with the project key.
 *
 * @param service - e.g. `'embeddings'`.
 * @param operation - e.g. `'embed'`.
 * @param body - The JSON body (the service's normalized request).
 * @param directory - Project directory used to find the key.
 * @returns The parsed JSON response.
 */
export async function callHostedService(
  service: string,
  operation: string,
  body: unknown,
  directory?: string,
): Promise<unknown> {
  const found = resolveServiceKey(directory)
  if (!found) {
    throw new ServiceCallError(
      'No molecule project API key. Call create_api_key (it writes MOLECULE_API_KEY into the project .env or .env.<name>), or set MOLECULE_API_KEY for this server.',
    )
  }
  const response = await fetch(`${apiBase()}/v1/services/${service}/${operation}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${found.key}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  })
  const text = await response.text()
  let data: unknown
  try {
    data = text ? JSON.parse(text) : {}
  } catch (_error) {
    // Non-JSON body (a proxy error page): report the status, not the body.
    const seconds = retryAfterOf(response)
    throw new ServiceCallError(
      `molecule.dev returned ${response.status} (not JSON).${retryHint(seconds, undefined)}`,
      seconds,
    )
  }
  if (!response.ok) {
    const err = data as { error?: string; errorKey?: string }
    const hint =
      response.status === 401
        ? ` The key from ${found.source} was rejected: it is revoked, or its scopes do not include this service. Create one with create_api_key (the default scope covers every service).`
        : response.status === 402
          ? ' The project owner has used their included allowance; they can enable usage billing on molecule.dev.'
          : ''
    const seconds = retryAfterOf(response)
    throw new ServiceCallError(
      `${service}/${operation} failed (${response.status} ${err.errorKey ?? ''}): ${(err.error ?? 'error').replace(/[.\s]+$/, '')}.${hint}${retryHint(seconds, err.errorKey)}`,
      seconds,
    )
  }
  return data
}

/** Authenticated JSON request with the session token. */
async function sessionRequest<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const token = sessionToken()
  if (!token) throw new ServiceCallError('Not logged in — call the login tool first.')
  const response = await fetch(`${apiBase()}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      authorization: `Bearer ${token}`,
      ...(init.body ? { 'content-type': 'application/json' } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(15_000),
  })
  const text = await response.text()
  const seconds = retryAfterOf(response)
  let data: T & { error?: string; errorKey?: string }
  try {
    data = (text ? JSON.parse(text) : {}) as T & { error?: string; errorKey?: string }
  } catch (_error) {
    // Non-JSON body (a proxy error page): report the status, not a SyntaxError.
    throw new ServiceCallError(
      `molecule.dev returned ${response.status} (not JSON).${retryHint(seconds, undefined)}`,
      seconds,
    )
  }
  if (!response.ok) {
    throw new ServiceCallError(
      `${path} failed (${response.status}): ${data.error ?? 'error'}${retryHint(seconds, data.errorKey)}`,
      seconds,
    )
  }
  return data
}

/** A project row as the MCP tool reports it. */
export interface McpProject {
  id: string
  name?: string
  role?: string
}

/** GET /projects — owned + team projects. */
export async function listProjects(): Promise<McpProject[]> {
  const raw = await sessionRequest<unknown>('/projects')
  const rows = Array.isArray(raw)
    ? raw
    : ((raw as { projects?: unknown[]; data?: unknown[] }).projects ??
      (raw as { data?: unknown[] }).data ??
      [])
  return rows.map((row) => {
    const r = row as McpProject & { props?: McpProject }
    const p = r.props ?? r
    return { id: p.id, name: p.name, ...((p.role ?? r.role) ? { role: p.role ?? r.role } : {}) }
  })
}

/** What create_api_key reports (never the plaintext). */
export interface CreatedKey {
  id: string
  masked: string
  scopes: string[]
  wroteTo: string
  gitignored: boolean
}

/**
 * Mint a project API key and write it into a dotenv file as
 * MOLECULE_API_KEY, replacing an existing assignment and dropping duplicate
 * ones. The plaintext is returned by the platform exactly once and is never
 * echoed back to the agent.
 *
 * The destination is validated BEFORE the platform is asked to mint anything,
 * and only names `resolveServiceKey` reads are accepted (`.env` or
 * `.env.<variant>`, never a placeholder like `.env.example`) — so a written
 * key is always discoverable by the service tools that follow.
 *
 * @param projectId - The project the key bills to.
 * @param name - A label shown in the project's key list.
 * @param envFile - Path of the dotenv file to write (basename `.env` or `.env.<x>`).
 * @param scopes - Optional scopes (default: all brokered services).
 * @returns Masked key metadata + where it was written.
 */
export async function createApiKeyIntoEnv(
  projectId: string,
  name: string,
  envFile: string,
  scopes?: string[],
): Promise<CreatedKey> {
  const target = resolve(envFile)
  if (!isProjectEnvFileName(basename(target))) {
    throw new ServiceCallError(
      'env_file must be a dotenv file named .env or .env.<name>; placeholder files such as .env.example are never read for credentials.',
    )
  }
  if (!existsSync(dirname(target))) {
    throw new ServiceCallError(`Directory ${dirname(target)} does not exist.`)
  }
  const minted = await sessionRequest<{
    id: string
    token?: string
    masked: string
    scopes: string[]
  }>(`/projects/${encodeURIComponent(projectId)}/api-keys`, {
    method: 'POST',
    body: { name, ...(scopes?.length ? { scopes } : {}) },
  })
  if (!minted.token) throw new ServiceCallError('The platform did not return a key.')

  const line = `MOLECULE_API_KEY=${minted.token}`
  const existed = existsSync(target)
  const lines = existed ? readFileSync(target, 'utf8').split('\n') : []
  // Rewrite the FIRST assignment and drop any later ones: Node's dotenv parser
  // takes the LAST assignment in a file, so leaving an older line below the new
  // one would keep the superseded key in force and every service call would use
  // it. Only assignment lines are matched (a commented-out `# KEY=` is not one).
  const assignment = /^\s*(?:export\s+)?MOLECULE_API_KEY\s*=/
  const next: string[] = []
  let written = false
  for (const current of lines) {
    if (!assignment.test(current)) {
      next.push(current)
      continue
    }
    if (!written) {
      next.push(line)
      written = true
    }
  }
  if (!written) {
    if (next.length && next[next.length - 1] === '') next.pop()
    next.push(line, '')
  }
  writeFileSync(target, next.join('\n'), { mode: 0o600 })
  // The file now holds a secret: owner-only even if it existed with wider bits.
  chmodSync(target, 0o600)

  // A .gitignore in the file's directory or up to three parents that names it.
  // A heuristic for a warning, not a guarantee — git's own rules are richer.
  const patterns = ['.env', '.env*', '.env.*', '*.env', basename(target), `/${basename(target)}`]
  let gitignored = false
  for (let dir = dirname(target), i = 0; i < 4 && !gitignored; i++) {
    const gitignore = join(dir, '.gitignore')
    gitignored =
      existsSync(gitignore) &&
      readFileSync(gitignore, 'utf8')
        .split('\n')
        .some((l) => patterns.includes(l.trim()))
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return {
    id: minted.id,
    masked: minted.masked,
    scopes: minted.scopes,
    wroteTo: target,
    gitignored,
  }
}
